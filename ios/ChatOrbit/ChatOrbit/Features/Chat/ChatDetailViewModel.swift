import Foundation
import WebRTC

@MainActor
final class SessionViewModel: ObservableObject {
    enum CallState {
        case idle
        case requesting
        case incoming
        case connecting
        case active
    }

    @Published var status: SessionStatus?
    @Published var messages: [SessionMessage] = []
    @Published var localVideoTrack: RTCVideoTrack?
    @Published var remoteVideoTrack: RTCVideoTrack?
    @Published var connectionState: RTCPeerConnectionState = .new
    @Published var errorMessage: String?
    @Published var remainingSeconds: Int?
    @Published var isReportingAbuse = false
    @Published var abuseReportSuccess: String?
    @Published var abuseReportError: String?
    @Published var isEndingSession = false
    @Published var callState: CallState = .idle
    @Published var callNotice: String?
    @Published var isCallDialogPresented = false
    @Published var incomingCallParticipant: String?
    @Published var isLocalVideoMuted = false
    @Published var isLocalAudioMuted = false
    @Published var isDataChannelReady = false

    let context: SessionStartContext

    private let service: SessionService
    private var webSocket: WebSocketManager?
    private var peerConnection: SessionPeerConnection?
    private var countdownTimer: Timer?
    private var decoder: JSONDecoder
    private var encoder: JSONEncoder
    private var callNoticeTimer: Timer?

    var callButtonTitle: String {
        switch callState {
        case .idle: return "Request video chat"
        case .requesting: return "Cancel video chat request"
        case .incoming: return "Respond to video chat request"
        case .connecting: return "Cancel video chat connection"
        case .active: return "Leave video chat"
        }
    }

    var callButtonIconName: String {
        switch callState {
        case .idle: return "video.badge.plus"
        case .requesting: return "xmark"
        case .incoming: return "person.wave.2"
        case .connecting: return "hourglass"
        case .active: return "phone.down.fill"
        }
    }

    var callButtonDisabled: Bool {
        if callState == .idle {
            return !isDataChannelReady || status?.status != .active
        }
        return false
    }

    var canShowMuteControls: Bool {
        callState == .connecting || callState == .active
    }

    init(context: SessionStartContext, service: SessionService = SessionService()) {
        self.context = context
        self.service = service
        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .iso8601
        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .iso8601
    }

    func start() async {
        callState = .idle
        callNotice = nil
        isCallDialogPresented = false
        incomingCallParticipant = nil
        isLocalAudioMuted = false
        isLocalVideoMuted = false
        isDataChannelReady = false
        restorePersistedState()
        setupPeerConnection()
        await refreshStatus()
        connectWebSocket()
    }

    func stop() {
        countdownTimer?.invalidate()
        countdownTimer = nil
        webSocket?.disconnect()
        peerConnection?.teardown()
        callNoticeTimer?.invalidate()
        callNoticeTimer = nil
        callNotice = nil
        callState = .idle
        isCallDialogPresented = false
        incomingCallParticipant = nil
        isDataChannelReady = false
        isLocalAudioMuted = false
        isLocalVideoMuted = false
    }

    func send(message text: String) {
        do {
            try peerConnection?.sendMessage(text)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func deleteMessage(id: String) {
        peerConnection?.deleteMessage(id: id)
    }

    func toggleCall() {
        guard isDataChannelReady else {
            showCallNotice("Waiting for connection…")
            return
        }
        switch callState {
        case .idle:
            prepareForCallConnection()
            peerConnection?.sendCallAction(.request)
            callState = .requesting
            showCallNotice("Requesting video chat…")
        case .requesting:
            peerConnection?.sendCallAction(.cancel)
            transitionToIdle(with: "Cancelled video chat request.")
        case .incoming:
            isCallDialogPresented = true
        case .connecting, .active:
            peerConnection?.sendCallAction(.end)
            transitionToIdle(with: "Video chat ended.")
        }
    }

    func acceptCall() {
        guard callState == .incoming || callState == .requesting else { return }
        peerConnection?.sendCallAction(.accept)
        prepareForCallConnection()
        callState = .connecting
        isCallDialogPresented = false
        showCallNotice("Starting video chat…")
        performRenegotiation()
    }

    func declineCall() {
        guard callState == .incoming else { return }
        peerConnection?.sendCallAction(.reject)
        transitionToIdle(with: "Declined video chat request.")
    }

    func toggleLocalVideoMuted() {
        isLocalVideoMuted.toggle()
        peerConnection?.toggleVideo(enabled: !isLocalVideoMuted)
    }

    func toggleLocalAudioMuted() {
        isLocalAudioMuted.toggle()
        peerConnection?.toggleAudio(enabled: !isLocalAudioMuted)
    }

    func endSession() async {
        guard isEndingSession == false else { return }
        isEndingSession = true
        do {
            let status = try await service.endSession(token: context.token)
            updateStatus(status)
            finalizeSession(status: status.status)
        } catch {
            errorMessage = error.localizedDescription
        }
        isEndingSession = false
    }

    func submitAbuseReport(email: String, summary: String, questionnaire: ReportAbuseQuestionnaire) async {
        abuseReportError = nil
        abuseReportSuccess = nil
        do {
            let request = ReportAbuseRequest(participantId: context.participantId, reporterEmail: email, summary: summary, questionnaire: questionnaire)
            let response = try await service.reportAbuse(token: context.token, request: request)
            abuseReportSuccess = "Report submitted (#\(response.reportId))."
            finalizeSession(status: .deleted)
        } catch {
            abuseReportError = error.localizedDescription
        }
    }

    private func setupPeerConnection() {
        let connection = SessionPeerConnection(token: context.token, participantId: context.participantId, role: context.role)
        connection.delegate = self
        connection.prepareConnection()
        peerConnection = connection
    }

    private func refreshStatus() async {
        do {
            let status = try await service.fetchStatus(token: context.token)
            updateStatus(status)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func connectWebSocket() {
        var components = URLComponents(url: AppEnvironment.websocketURL, resolvingAgainstBaseURL: false)
        let basePath = components?.path ?? ""
        let normalizedBase = basePath.hasSuffix("/") ? String(basePath.dropLast()) : basePath
        components?.path = normalizedBase + "/sessions/\(context.token)"
        components?.queryItems = [URLQueryItem(name: "participantId", value: context.participantId)]
        guard let url = components?.url else {
            errorMessage = "Unable to create WebSocket URL."
            return
        }

        webSocket = WebSocketManager(url: url, tokenProvider: { nil }) { [weak self] event in
            Task { @MainActor in
                self?.handle(event: event)
            }
        }
    }

    private func handle(event: WebSocketManager.Event) {
        switch event {
        case .connected:
            break
        case let .disconnected(error):
            if let error {
                errorMessage = error.localizedDescription
            }
        case let .message(data):
            handle(messageData: data)
        }
    }

    private func handle(messageData data: Data) {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = object["type"] as? String else {
            return
        }
        switch type {
        case "status":
            if let envelope = try? decoder.decode(StatusEnvelope.self, from: data) {
                let status = SessionStatus(
                    token: envelope.token,
                    status: envelope.status,
                    validityExpiresAt: envelope.validityExpiresAt,
                    sessionStartedAt: envelope.sessionStartedAt,
                    sessionExpiresAt: envelope.sessionExpiresAt,
                    messageCharLimit: envelope.messageCharLimit,
                    participants: envelope.participants,
                    remainingSeconds: envelope.remainingSeconds,
                    connectedParticipants: envelope.connectedParticipants
                )
                updateStatus(status)
            }
        case "signal":
            handleSignal(object)
        case "error":
            if let message = object["message"] as? String {
                errorMessage = message
            }
        case "session_closed":
            finalizeSession(status: .closed)
        case "session_expired":
            finalizeSession(status: .expired)
        case "session_deleted":
            finalizeSession(status: .deleted)
        case "abuse_reported":
            abuseReportSuccess = "The session has been closed due to an abuse report."
            finalizeSession(status: .deleted)
        default:
            break
        }
    }

    private func handleSignal(_ payload: [String: Any]) {
        guard let signalType = payload["signalType"] as? String else { return }
        switch signalType {
        case "offer", "answer":
            if let detail = payload["payload"] as? [String: Any],
               let data = try? JSONSerialization.data(withJSONObject: detail),
               let description = try? decoder.decode(SessionDescriptionPayload.self, from: data) {
                peerConnection?.handleSessionDescription(description)
            }
        case "iceCandidate":
            if let detail = payload["payload"] as? [String: Any],
               let data = try? JSONSerialization.data(withJSONObject: detail) {
                let candidate = try? decoder.decode(IceCandidatePayload.self, from: data)
                peerConnection?.handleCandidate(candidate)
            } else {
                peerConnection?.handleCandidate(nil)
            }
        default:
            break
        }
    }

    private func updateStatus(_ status: SessionStatus) {
        self.status = status
        remainingSeconds = status.remainingSeconds
        SessionPersistence.save(record: SessionStorageRecord(
            token: status.token,
            participantId: context.participantId,
            role: context.role,
            sessionActive: status.status == .active,
            sessionStartedAt: status.sessionStartedAt,
            sessionExpiresAt: status.sessionExpiresAt,
            messageCharLimit: status.messageCharLimit,
            remainingSeconds: status.remainingSeconds,
            status: status.status,
            sessionEnded: status.status != .active
        ))
        if status.status == .active {
            startCountdown(from: status.remainingSeconds ?? 0)
            if status.connectedParticipants?.count ?? 0 >= 2 {
                peerConnection?.makeOfferIfNeeded()
            }
        } else if status.status != .issued {
            finalizeSession(status: status.status)
        }
    }

    private func startCountdown(from value: Int) {
        guard value > 0 else { return }
        countdownTimer?.invalidate()
        remainingSeconds = value
        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] timer in
            guard let self else { return }
            if let current = self.remainingSeconds, current > 0 {
                self.remainingSeconds = current - 1
            } else {
                timer.invalidate()
                self.remainingSeconds = 0
                self.finalizeSession(status: .closed)
            }
        }
    }

    private func finalizeSession(status: SessionLifecycleStatus) {
        countdownTimer?.invalidate()
        countdownTimer = nil
        peerConnection?.teardown()
        webSocket?.disconnect()
        callNoticeTimer?.invalidate()
        callNoticeTimer = nil
        callState = .idle
        callNotice = nil
        incomingCallParticipant = nil
        isCallDialogPresented = false
        isDataChannelReady = false
        isLocalAudioMuted = false
        isLocalVideoMuted = false
        SessionPersistence.save(record: SessionStorageRecord(
            token: context.token,
            participantId: context.participantId,
            role: context.role,
            sessionActive: false,
            sessionStartedAt: self.status?.sessionStartedAt,
            sessionExpiresAt: self.status?.sessionExpiresAt,
            messageCharLimit: self.status?.messageCharLimit ?? context.messageLimit,
            remainingSeconds: 0,
            status: status,
            sessionEnded: true
        ))
    }

    private func transitionToIdle(with notice: String?) {
        callState = .idle
        incomingCallParticipant = nil
        isCallDialogPresented = false
        showCallNotice(notice)
        isLocalAudioMuted = false
        isLocalVideoMuted = false
        peerConnection?.toggleAudio(enabled: true)
        peerConnection?.toggleVideo(enabled: true)
    }

    private func prepareForCallConnection() {
        incomingCallParticipant = nil
        isLocalAudioMuted = false
        isLocalVideoMuted = false
        peerConnection?.toggleAudio(enabled: true)
        peerConnection?.toggleVideo(enabled: true)
    }

    private func performRenegotiation() {
        if context.role.lowercased() == "host" {
            peerConnection?.makeOfferIfNeeded(force: true)
        } else {
            peerConnection?.sendCallAction(.renegotiate)
        }
    }

    private func handleCallAction(_ action: SessionPeerConnection.CallAction, sender: String?) {
        switch action {
        case .request:
            if callState == .active || callState == .connecting {
                peerConnection?.sendCallAction(.busy)
                showCallNotice("Peer requested a video chat, but you're already in a call.")
                return
            }
            if callState == .requesting {
                peerConnection?.sendCallAction(.accept)
                prepareForCallConnection()
                callState = .connecting
                showCallNotice("Video chat request accepted.")
                performRenegotiation()
                return
            }
            incomingCallParticipant = sender
            callState = .incoming
            isCallDialogPresented = true
            showCallNotice("Video chat request received.")
        case .cancel:
            if callState != .idle {
                transitionToIdle(with: "Video chat request cancelled.")
            }
        case .accept:
            if callState == .requesting || callState == .incoming {
                prepareForCallConnection()
                callState = .connecting
                showCallNotice("Starting video chat…")
                performRenegotiation()
            }
        case .reject:
            if callState == .requesting || callState == .connecting {
                transitionToIdle(with: "Peer declined video chat.")
            }
        case .end:
            if callState != .idle {
                transitionToIdle(with: "Video chat ended.")
            }
        case .renegotiate:
            if context.role.lowercased() == "host" {
                peerConnection?.makeOfferIfNeeded(force: true)
            }
        case .busy:
            if callState == .requesting {
                transitionToIdle(with: "Peer is already in a video chat.")
            }
        }
    }

    private func showCallNotice(_ message: String?) {
        callNoticeTimer?.invalidate()
        guard let message else {
            callNotice = nil
            return
        }
        callNotice = message
        callNoticeTimer = Timer.scheduledTimer(withTimeInterval: 4, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.callNotice = nil
            }
        }
    }

    private func restorePersistedState() {
        if let record = SessionPersistence.loadRecord(for: context.token) {
            let status = SessionStatus(
                token: record.token,
                status: record.status ?? .issued,
                validityExpiresAt: record.sessionExpiresAt ?? Date(),
                sessionStartedAt: record.sessionStartedAt,
                sessionExpiresAt: record.sessionExpiresAt,
                messageCharLimit: record.messageCharLimit,
                participants: [],
                remainingSeconds: record.remainingSeconds,
                connectedParticipants: nil
            )
            self.status = status
            self.remainingSeconds = record.remainingSeconds
        }
    }
}

extension SessionViewModel: SessionPeerConnectionDelegate {
    func sessionPeerConnection(_ connection: SessionPeerConnection, didUpdateLocalVideo track: RTCVideoTrack?) {
        localVideoTrack = track
        peerConnection?.toggleVideo(enabled: !isLocalVideoMuted)
    }

    func sessionPeerConnection(_ connection: SessionPeerConnection, didUpdateRemoteVideo track: RTCVideoTrack?) {
        remoteVideoTrack = track
        if track != nil {
            if callState == .connecting || callState == .requesting {
                callState = .active
                showCallNotice("Video chat connected.")
            }
        } else if callState == .active {
            callState = .connecting
            showCallNotice("Waiting for partner…")
        }
    }

    func sessionPeerConnection(_ connection: SessionPeerConnection, didReceive message: SessionMessage) {
        var entries = messages.filter { $0.id != message.id }
        entries.append(message)
        entries.sort { $0.createdAt < $1.createdAt }
        messages = entries
    }

    func sessionPeerConnection(_ connection: SessionPeerConnection, didDeleteMessageWithId id: String) {
        messages.removeAll { $0.id == id }
    }

    func sessionPeerConnection(_ connection: SessionPeerConnection, didGenerateSignal type: String, payload: [String: Any]?) {
        var envelope: [String: Any] = [
            "type": "signal",
            "signalType": type
        ]
        if let payload {
            envelope["payload"] = payload
        } else {
            envelope["payload"] = NSNull()
        }
        guard let data = try? JSONSerialization.data(withJSONObject: envelope) else { return }
        webSocket?.send(data: data)
    }

    func sessionPeerConnection(_ connection: SessionPeerConnection, didChangeState state: RTCPeerConnectionState) {
        connectionState = state
        switch state {
        case .failed:
            if callState != .idle {
                callState = .connecting
                showCallNotice("Connection interrupted. Trying to reconnect…")
            }
        case .disconnected:
            if callState == .active {
                callState = .connecting
                showCallNotice("Connection interrupted. Trying to reconnect…")
            }
        case .closed:
            if callState != .idle {
                transitionToIdle(with: "Connection closed.")
            }
        default:
            break
        }
    }

    func sessionPeerConnection(_ connection: SessionPeerConnection, dataChannelIsReady ready: Bool) {
        isDataChannelReady = ready
        if ready == false && callState != .idle {
            transitionToIdle(with: "Connection lost.")
        }
    }

    func sessionPeerConnection(_ connection: SessionPeerConnection, didReceiveCallAction action: SessionPeerConnection.CallAction, from participant: String?) {
        handleCallAction(action, sender: participant)
    }

    func sessionPeerConnection(_ connection: SessionPeerConnection, didEncounter error: Error) {
        errorMessage = error.localizedDescription
        if callState != .idle {
            showCallNotice("Error: \(error.localizedDescription)")
        }
    }
}
