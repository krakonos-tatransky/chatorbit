import Foundation
import WebRTC
import CryptoKit
import Security

protocol SessionPeerConnectionDelegate: AnyObject {
    func sessionPeerConnection(_ connection: SessionPeerConnection, didUpdateLocalVideo track: RTCVideoTrack?)
    func sessionPeerConnection(_ connection: SessionPeerConnection, didUpdateRemoteVideo track: RTCVideoTrack?)
    func sessionPeerConnection(_ connection: SessionPeerConnection, didReceive message: SessionMessage)
    func sessionPeerConnection(_ connection: SessionPeerConnection, didDeleteMessageWithId id: String)
    func sessionPeerConnection(_ connection: SessionPeerConnection, didGenerateSignal type: String, payload: [String: Any]?)
    func sessionPeerConnection(_ connection: SessionPeerConnection, didChangeState state: RTCPeerConnectionState)
    func sessionPeerConnection(_ connection: SessionPeerConnection, didEncounter error: Error)
}

final class SessionPeerConnection: NSObject {
    enum Role {
        case host
        case guest

        init(rawValue: String) {
            self = rawValue.lowercased() == "host" ? .host : .guest
        }
    }

    weak var delegate: SessionPeerConnectionDelegate?

    private let token: String
    private let participantId: String
    private let role: Role

    private var peerConnectionFactory: RTCPeerConnectionFactory
    private var peerConnection: RTCPeerConnection?
    private var localAudioTrack: RTCAudioTrack?
    private var localVideoTrack: RTCVideoTrack?
    private var remoteVideoTrack: RTCVideoTrack?
    private var dataChannel: RTCDataChannel?
    private var videoCapturer: RTCCameraVideoCapturer?
    private var hasSentOffer = false
    private var supportsEncryption = true
    private var peerSupportsEncryption: Bool?
    private var hashedMessages: [String: EncryptedMessageRecord] = [:]
    private var candidateQueue: [RTCIceCandidate] = []
    private var cachedKey: SymmetricKey?

    init(token: String, participantId: String, role: String) {
        self.token = token
        self.participantId = participantId
        self.role = Role(rawValue: role)

        RTCInitializeSSL()
        let encoderFactory = RTCDefaultVideoEncoderFactory()
        let decoderFactory = RTCDefaultVideoDecoderFactory()
        self.peerConnectionFactory = RTCPeerConnectionFactory(encoderFactory: encoderFactory, decoderFactory: decoderFactory)
        super.init()
    }

    deinit {
        teardown()
        RTCCleanupSSL()
    }

    func prepareConnection() {
        guard peerConnection == nil else { return }
        let configuration = RTCConfiguration()
        configuration.sdpSemantics = .unifiedPlan
        configuration.iceServers = AppEnvironment.iceServers.map { config in
            RTCIceServer(urlStrings: config.urls, username: config.username, credential: config.credential)
        }

        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        let connection = peerConnectionFactory.peerConnection(with: configuration, constraints: constraints, delegate: self)
        self.peerConnection = connection

        attachMediaTracks(to: connection)
        attachDataChannel(on: connection)
    }

    func makeOfferIfNeeded() {
        guard role == .host else { return }
        guard hasSentOffer == false else { return }
        guard let connection = peerConnection else { return }
        let constraints = RTCMediaConstraints(mandatoryConstraints: [
            "OfferToReceiveAudio": "true",
            "OfferToReceiveVideo": "true"
        ], optionalConstraints: nil)
        connection.offer(for: constraints) { [weak self] description, error in
            guard let self else { return }
            if let error {
                self.delegate?.sessionPeerConnection(self, didEncounter: error)
                return
            }
            guard let description else { return }
            connection.setLocalDescription(description) { [weak self] error in
                guard let self else { return }
                if let error {
                    self.delegate?.sessionPeerConnection(self, didEncounter: error)
                    return
                }
                self.hasSentOffer = true
                let payload: [String: Any] = ["type": description.type.rawValue, "sdp": description.sdp]
                self.delegate?.sessionPeerConnection(self, didGenerateSignal: "offer", payload: payload)
            }
        }
    }

    func handleSessionDescription(_ payload: SessionDescriptionPayload) {
        guard let connection = peerConnection else { return }
        let description = RTCSessionDescription(type: payload.type.lowercased() == "offer" ? .offer : .answer, sdp: payload.sdp)
        connection.setRemoteDescription(description) { [weak self] error in
            guard let self else { return }
            if let error {
                self.delegate?.sessionPeerConnection(self, didEncounter: error)
                return
            }
            self.flushCandidateQueue()
            if description.type == .offer {
                self.createAnswer()
            }
        }
    }

    func handleCandidate(_ payload: IceCandidatePayload?) {
        guard let payload else {
            if let connection = peerConnection, connection.remoteDescription != nil {
                connection.add(nil)
            }
            return
        }
        let candidate = RTCIceCandidate(sdp: payload.candidate, sdpMLineIndex: Int32(payload.sdpMlineIndex ?? 0), sdpMid: payload.sdpMid)
        if peerConnection?.remoteDescription != nil {
            peerConnection?.add(candidate)
        } else {
            candidateQueue.append(candidate)
        }
    }

    func sendMessage(_ text: String) throws {
        guard let dataChannel, dataChannel.readyState == .open else {
            throw NSError(domain: "SessionPeerConnection", code: -20, userInfo: [NSLocalizedDescriptionKey: "Channel not ready"])
        }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.isEmpty == false else { return }
        let messageId = UUID().uuidString.replacingOccurrences(of: "-", with: "")
        let createdDate = Date()
        let createdAt = ISO8601DateFormatter.chatOrbitFormatter.string(from: createdDate)
        let hash = try computeHash(messageId: messageId, content: trimmed)
        let encryptionMode: String
        var payload: [String: Any] = [
            "sessionId": token,
            "messageId": messageId,
            "participantId": participantId,
            "role": role == .host ? "host" : "guest",
            "createdAt": createdAt,
            "hash": hash,
            "deleted": false
        ]
        if supportsEncryption && peerSupportsEncryption != false {
            encryptionMode = "aes-gcm"
            let encrypted = try encrypt(content: trimmed)
            payload["encryptedContent"] = encrypted
            payload["encryption"] = encryptionMode
        } else {
            encryptionMode = "none"
            payload["content"] = trimmed
            payload["encryption"] = encryptionMode
        }
        let messageEnvelope: [String: Any] = [
            "type": "message",
            "message": payload
        ]
        let data = try JSONSerialization.data(withJSONObject: messageEnvelope)
        dataChannel.sendData(RTCDataBuffer(data: data, isBinary: false))
        let message = SessionMessage(id: messageId, participantId: participantId, role: role == .host ? "host" : "guest", content: trimmed, createdAt: createdDate)
        delegate?.sessionPeerConnection(self, didReceive: message)
        let record = EncryptedMessageRecord(sessionId: token, messageId: messageId, participantId: participantId, role: role == .host ? "host" : "guest", createdAt: createdDate, encryptedContent: payload["encryptedContent"] as? String, content: payload["content"] as? String, hash: hash, encryption: encryptionMode, deleted: false)
        hashedMessages[messageId] = record
    }

    func deleteMessage(id: String) {
        guard let dataChannel, dataChannel.readyState == .open else { return }
        let instruction: [String: Any] = [
            "type": "delete",
            "sessionId": token,
            "messageId": id,
            "participantId": participantId
        ]
        if let data = try? JSONSerialization.data(withJSONObject: instruction) {
            dataChannel.sendData(RTCDataBuffer(data: data, isBinary: false))
        }
        hashedMessages[id] = nil
        delegate?.sessionPeerConnection(self, didDeleteMessageWithId: id)
    }

    func toggleAudio(enabled: Bool) {
        localAudioTrack?.isEnabled = enabled
    }

    func toggleVideo(enabled: Bool) {
        localVideoTrack?.isEnabled = enabled
    }

    func teardown() {
        dataChannel?.delegate = nil
        dataChannel?.close()
        dataChannel = nil
        videoCapturer?.stopCapture()
        peerConnection?.close()
        peerConnection = nil
        localVideoTrack = nil
        remoteVideoTrack = nil
        localAudioTrack = nil
        videoCapturer = nil
    }

    private func attachMediaTracks(to connection: RTCPeerConnection) {
        let audioSource = peerConnectionFactory.audioSource(with: RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil))
        let audioTrack = peerConnectionFactory.audioTrack(with: audioSource, trackId: "audio0")
        connection.add(audioTrack, streamIds: ["stream0"])
        localAudioTrack = audioTrack

        let videoSource = peerConnectionFactory.videoSource()
        let capturer = RTCCameraVideoCapturer(delegate: videoSource)
        videoCapturer = capturer
        let videoTrack = peerConnectionFactory.videoTrack(with: videoSource, trackId: "video0")
        connection.add(videoTrack, streamIds: ["stream0"])
        localVideoTrack = videoTrack
        delegate?.sessionPeerConnection(self, didUpdateLocalVideo: videoTrack)

        startCapture(with: capturer)
    }

    private func startCapture(with capturer: RTCCameraVideoCapturer) {
        guard let device = (RTCCameraVideoCapturer.captureDevices().first { $0.position == .front }) ?? RTCCameraVideoCapturer.captureDevices().first else {
            return
        }
        let format = device.formats.sorted { lhs, rhs in
            let lw = lhs.formatDescription.dimensions.width
            let rw = rhs.formatDescription.dimensions.width
            return lw < rw
        }.last ?? device.formats[0]
        let fps = format.videoSupportedFrameRateRanges.first?.maxFrameRate ?? 30
        capturer.startCapture(with: device, format: format, fps: Int(fps))
    }

    private func attachDataChannel(on connection: RTCPeerConnection) {
        if role == .host {
            let config = RTCDataChannelConfiguration()
            config.isOrdered = true
            let channel = connection.dataChannel(forLabel: "chat", configuration: config)
            channel?.delegate = self
            dataChannel = channel
        }
    }

    private func createAnswer() {
        guard let connection = peerConnection else { return }
        let constraints = RTCMediaConstraints(mandatoryConstraints: [
            "OfferToReceiveAudio": "true",
            "OfferToReceiveVideo": "true"
        ], optionalConstraints: nil)
        connection.answer(for: constraints) { [weak self] description, error in
            guard let self else { return }
            if let error {
                self.delegate?.sessionPeerConnection(self, didEncounter: error)
                return
            }
            guard let description else { return }
            connection.setLocalDescription(description) { [weak self] error in
                guard let self else { return }
                if let error {
                    self.delegate?.sessionPeerConnection(self, didEncounter: error)
                    return
                }
                let payload: [String: Any] = ["type": description.type.rawValue, "sdp": description.sdp]
                self.delegate?.sessionPeerConnection(self, didGenerateSignal: "answer", payload: payload)
            }
        }
    }

    private func flushCandidateQueue() {
        guard let connection = peerConnection else { return }
        while candidateQueue.isEmpty == false {
            let candidate = candidateQueue.removeFirst()
            connection.add(candidate)
        }
    }

    private func ensureDataChannel(_ channel: RTCDataChannel) {
        dataChannel = channel
        dataChannel?.delegate = self
    }

    private func computeHash(messageId: String, content: String) throws -> String {
        let composite = "\(token):\(participantId):\(messageId):\(content)"
        let digest = SHA256.hash(data: Data(composite.utf8))
        return Data(digest).base64EncodedString()
    }

    private func encryptionKey() throws -> SymmetricKey {
        if let key = cachedKey {
            return key
        }
        let digest = SHA256.hash(data: Data(token.utf8))
        let key = SymmetricKey(data: Data(digest))
        cachedKey = key
        return key
    }

    private func encrypt(content: String) throws -> String {
        let key = try encryptionKey()
        var ivBytes = [UInt8](repeating: 0, count: 12)
        let status = SecRandomCopyBytes(kSecRandomDefault, ivBytes.count, &ivBytes)
        if status != errSecSuccess {
            throw NSError(domain: "SessionPeerConnection", code: -35, userInfo: [NSLocalizedDescriptionKey: "Unable to generate nonce"])
        }
        let iv = Data(ivBytes)
        let nonce = try AES.GCM.Nonce(data: iv)
        let sealed = try AES.GCM.seal(Data(content.utf8), using: key, nonce: nonce)
        var combined = Data()
        combined.append(iv)
        combined.append(sealed.ciphertext)
        combined.append(sealed.tag)
        return combined.base64EncodedString()
    }

    private func decrypt(record: EncryptedMessageRecord) throws -> String {
        if let content = record.content, (record.encryption ?? "") == "none" {
            return content
        }
        guard let payload = record.encryptedContent else {
            throw NSError(domain: "SessionPeerConnection", code: -30, userInfo: [NSLocalizedDescriptionKey: "Missing encrypted payload"])
        }
        let key = try encryptionKey()
        guard let data = Data(base64Encoded: payload) else {
            throw NSError(domain: "SessionPeerConnection", code: -31, userInfo: [NSLocalizedDescriptionKey: "Invalid payload"])
        }
        guard data.count > 28 else {
            throw NSError(domain: "SessionPeerConnection", code: -32, userInfo: [NSLocalizedDescriptionKey: "Payload too small"])
        }
        let iv = data.prefix(12)
        let cipherWithTag = data.suffix(from: 12)
        let cipher = cipherWithTag.prefix(cipherWithTag.count - 16)
        let tag = cipherWithTag.suffix(16)
        let nonce = try AES.GCM.Nonce(data: iv)
        let sealed = try AES.GCM.SealedBox(nonce: nonce, ciphertext: Data(cipher), tag: Data(tag))
        let decrypted = try AES.GCM.open(sealed, using: key)
        guard let text = String(data: decrypted, encoding: .utf8) else {
            throw NSError(domain: "SessionPeerConnection", code: -33, userInfo: [NSLocalizedDescriptionKey: "Unable to decode message"])
        }
        return text
    }

    private func verify(record: EncryptedMessageRecord, content: String) throws {
        let expected = try computeHash(messageId: record.messageId, content: content)
        guard expected == record.hash else {
            throw NSError(domain: "SessionPeerConnection", code: -34, userInfo: [NSLocalizedDescriptionKey: "Hash mismatch"])
        }
    }
}

extension SessionPeerConnection: RTCPeerConnectionDelegate {
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {}

    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        if let track = stream.videoTracks.first {
            remoteVideoTrack = track
            delegate?.sessionPeerConnection(self, didUpdateRemoteVideo: track)
        }
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {
        remoteVideoTrack = nil
        delegate?.sessionPeerConnection(self, didUpdateRemoteVideo: nil)
    }

    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {}

    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {}

    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        guard candidate.sdp.count > 0 else { return }
        var payload: [String: Any] = ["candidate": candidate.sdp]
        if let mid = candidate.sdpMid { payload["sdpMid"] = mid }
        payload["sdpMlineIndex"] = Int(candidate.sdpMLineIndex)
        delegate?.sessionPeerConnection(self, didGenerateSignal: "iceCandidate", payload: payload)
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}

    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {
        ensureDataChannel(dataChannel)
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didChange state: RTCPeerConnectionState) {
        delegate?.sessionPeerConnection(self, didChangeState: state)
        if state == .failed || state == .closed {
            hasSentOffer = false
        }
    }
}

extension SessionPeerConnection: RTCDataChannelDelegate {
    func dataChannelDidChangeState(_ dataChannel: RTCDataChannel) {
        if dataChannel.readyState == .open {
            let payload: [String: Any] = ["type": "capabilities", "supportsEncryption": supportsEncryption]
            if let data = try? JSONSerialization.data(withJSONObject: payload) {
                dataChannel.sendData(RTCDataBuffer(data: data, isBinary: false))
            }
        }
    }

    func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
        guard buffer.isBinary == false else { return }
        guard let json = try? JSONSerialization.jsonObject(with: buffer.data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }
        if type == "capabilities" {
            let remoteSupports = (json["supportsEncryption"] as? Bool) ?? false
            peerSupportsEncryption = remoteSupports
            return
        }
        if type == "message", let payload = json["message"] {
            handleIncomingMessage(payload)
            return
        }
        if type == "delete", let messageId = json["messageId"] as? String {
            hashedMessages[messageId] = nil
            delegate?.sessionPeerConnection(self, didDeleteMessageWithId: messageId)
            return
        }
    }

    private func handleIncomingMessage(_ payload: Any) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload) else { return }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        guard let record = try? decoder.decode(EncryptedMessageRecord.self, from: data) else { return }
        do {
            let content = try decrypt(record: record)
            try verify(record: record, content: content)
            hashedMessages[record.messageId] = record
            let message = SessionMessage(
                id: record.messageId,
                participantId: record.participantId,
                role: record.role,
                content: content,
                createdAt: record.createdAt
            )
            delegate?.sessionPeerConnection(self, didReceive: message)
        } catch {
            delegate?.sessionPeerConnection(self, didEncounter: error)
        }
    }
}
