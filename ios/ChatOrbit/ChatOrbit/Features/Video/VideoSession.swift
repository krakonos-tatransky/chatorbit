import Foundation
import WebRTC

protocol VideoSessionDelegate: AnyObject {
    func videoSession(_ session: VideoSession, didChangeState state: VideoSession.State)
}

final class VideoSession: NSObject {
    struct Tracks {
        let local: RTCVideoTrack
        let remote: RTCVideoTrack?
    }

    enum State {
        case idle
        case connecting
        case connected(Tracks)
        case failed(Error)
        case ended
    }

    weak var delegate: VideoSessionDelegate?

    private let api = APIClient()
    private var peerConnectionFactory: RTCPeerConnectionFactory
    private var peerConnection: RTCPeerConnection?
    private var localVideoCapturer: RTCCameraVideoCapturer?
    private var localAudioTrack: RTCAudioTrack?
    private var localVideoTrack: RTCVideoTrack?
    private var remoteVideoTrack: RTCVideoTrack?
    private var signalingManager: WebSocketManager?
    private var meeting: Meeting?

    override init() {
        RTCInitializeSSL()
        let encoderFactory = RTCDefaultVideoEncoderFactory()
        let decoderFactory = RTCDefaultVideoDecoderFactory()
        peerConnectionFactory = RTCPeerConnectionFactory(encoderFactory: encoderFactory, decoderFactory: decoderFactory)
        super.init()
    }

    deinit {
        signalingManager?.disconnect()
        peerConnection?.close()
        RTCCleanupSSL()
    }

    func start(conversationID: UUID, token: String) async throws {
        delegate?.videoSession(self, didChangeState: .connecting)
        meeting = try await api.request(
            "/api/meetings",
            method: .post,
            body: CreateMeetingRequest(conversationID: conversationID),
            tokenProvider: { token }
        )

        guard let meeting else { return }
        try configurePeerConnection(with: meeting)
        connectSignaling(token: token, meetingID: meeting.id)
        try startLocalMedia()
        makeOffer()
    }

    func end() {
        delegate?.videoSession(self, didChangeState: .ended)
        signalingManager?.disconnect()
        peerConnection?.close()
        peerConnection = nil
    }

    func setAudioEnabled(_ isEnabled: Bool) {
        localAudioTrack?.isEnabled = isEnabled
    }

    func setVideoEnabled(_ isEnabled: Bool) {
        localVideoTrack?.isEnabled = isEnabled
    }

    private func configurePeerConnection(with meeting: Meeting) throws {
        let config = RTCConfiguration()
        config.iceServers = meeting.iceServers.map { server in
            RTCIceServer(urlStrings: server.urls, username: server.username, credential: server.credential)
        }
        config.sdpSemantics = .unifiedPlan

        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        peerConnection = peerConnectionFactory.peerConnection(with: config, constraints: constraints, delegate: self)
    }

    private func startLocalMedia() throws {
        let audioSource = peerConnectionFactory.audioSource(with: nil)
        localAudioTrack = peerConnectionFactory.audioTrack(with: audioSource, trackId: "audio0")
        peerConnection?.add(localAudioTrack!, streamIds: ["stream0"])

        let videoSource = peerConnectionFactory.videoSource()
        localVideoCapturer = RTCCameraVideoCapturer(delegate: videoSource)
        localVideoTrack = peerConnectionFactory.videoTrack(with: videoSource, trackId: "video0")

        guard let capturer = localVideoCapturer else { return }
        guard let camera = (RTCCameraVideoCapturer.captureDevices().first { $0.position == .front }) ?? RTCCameraVideoCapturer.captureDevices().first else {
            throw NSError(domain: "VideoSession", code: -1, userInfo: [NSLocalizedDescriptionKey: "No camera available"])
        }

        let format = camera.formats
            .sorted { $0.formatDescription.dimensions.width < $1.formatDescription.dimensions.width }
            .last ?? camera.formats[0]

        let fps = format.videoSupportedFrameRateRanges.first?.maxFrameRate ?? 30

        capturer.startCapture(with: camera, format: format, fps: Int(fps))

        if let videoTrack = localVideoTrack {
            peerConnection?.add(videoTrack, streamIds: ["stream0"])
            delegate?.videoSession(self, didChangeState: .connected(Tracks(local: videoTrack, remote: remoteVideoTrack)))
        }
    }

    private func makeOffer() {
        let constraints = RTCMediaConstraints(mandatoryConstraints: [
            "OfferToReceiveAudio": "true",
            "OfferToReceiveVideo": "true"
        ], optionalConstraints: nil)

        guard let peerConnection else { return }
        peerConnection.offer(for: constraints) { [weak self] sdp, error in
            guard let self else { return }
            if let error {
                self.delegate?.videoSession(self, didChangeState: .failed(error))
                return
            }

            guard let sdp else { return }
            peerConnection.setLocalDescription(sdp) { error in
                if let error {
                    self.delegate?.videoSession(self, didChangeState: .failed(error))
                    return
                }
                self.send(signal: SignalingPayload(type: .offer, sdp: sdp.sdp, candidate: nil))
            }
        }
    }

    private func connectSignaling(token: String, meetingID: UUID) {
        var components = URLComponents(url: AppEnvironment.websocketURL, resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "meeting", value: meetingID.uuidString)]
        guard let url = components?.url else { return }

        signalingManager = WebSocketManager(url: url, tokenProvider: { token }) { [weak self] event in
            self?.handle(event: event)
        }
    }

    private func handle(event: WebSocketManager.Event) {
        switch event {
        case .connected:
            break
        case let .disconnected(error):
            delegate?.videoSession(self, didChangeState: .failed(error ?? NSError(domain: "VideoSession", code: -2)))
        case let .message(data):
            guard let payload = try? JSONDecoder().decode(SignalingPayload.self, from: data) else { return }
            handle(signaling: payload)
        }
    }

    private func handle(signaling payload: SignalingPayload) {
        switch payload.type {
        case .offer:
            guard let sdpString = payload.sdp else { return }
            let sdp = RTCSessionDescription(type: .offer, sdp: sdpString)
            peerConnection?.setRemoteDescription(sdp, completionHandler: { [weak self] error in
                guard let self else { return }
                if let error {
                    delegate?.videoSession(self, didChangeState: .failed(error))
                    return
                }
                answerRemoteOffer()
            })
        case .answer:
            guard let sdpString = payload.sdp else { return }
            let sdp = RTCSessionDescription(type: .answer, sdp: sdpString)
            peerConnection?.setRemoteDescription(sdp, completionHandler: { [weak self] error in
                guard let self, let error else { return }
                delegate?.videoSession(self, didChangeState: .failed(error))
            })
        case .candidate:
            guard let candidatePayload = payload.candidate else { return }
            let candidate = RTCIceCandidate(
                sdp: candidatePayload.candidate,
                sdpMLineIndex: candidatePayload.sdpMLineIndex ?? 0,
                sdpMid: candidatePayload.sdpMid
            )
            peerConnection?.add(candidate)
        case .end:
            delegate?.videoSession(self, didChangeState: .ended)
            end()
        }
    }

    private func answerRemoteOffer() {
        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        peerConnection?.answer(for: constraints) { [weak self] sdp, error in
            guard let self else { return }
            if let error {
                delegate?.videoSession(self, didChangeState: .failed(error))
                return
            }
            guard let sdp else { return }
            peerConnection?.setLocalDescription(sdp, completionHandler: { error in
                if let error {
                    self.delegate?.videoSession(self, didChangeState: .failed(error))
                    return
                }
                self.send(signal: SignalingPayload(type: .answer, sdp: sdp.sdp, candidate: nil))
            })
        }
    }

    private func send(signal payload: SignalingPayload) {
        guard let data = try? JSONEncoder().encode(payload) else { return }
        signalingManager?.send(data: data)
    }
}

extension VideoSession: RTCPeerConnectionDelegate {
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {}

    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {
        remoteVideoTrack = stream.videoTracks.first
        if let localVideoTrack {
            delegate?.videoSession(self, didChangeState: .connected(Tracks(local: localVideoTrack, remote: remoteVideoTrack)))
        }
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {
        remoteVideoTrack = nil
        if let localVideoTrack {
            delegate?.videoSession(self, didChangeState: .connected(Tracks(local: localVideoTrack, remote: nil)))
        }
    }

    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {}

    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {}

    func peerConnection(_ peerConnection: RTCPeerConnection, didChange state: RTCIceGatheringState) {}

    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        let payload = SignalingPayload(
            type: .candidate,
            sdp: nil,
            candidate: RTCIceCandidatePayload(
                candidate: candidate.sdp,
                sdpMid: candidate.sdpMid,
                sdpMLineIndex: candidate.sdpMLineIndex
            )
        )
        send(signal: payload)
    }

    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}

    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {}
}
