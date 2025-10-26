import Foundation
import WebRTC
@MainActor
final class VideoCallViewModel: ObservableObject {
    enum CallState {
        case idle
        case connecting
        case connected(VideoSession.Tracks)
        case failed(Error)
        case ended
    }

    @Published private(set) var state: CallState = .idle
    @Published var isMuted = false
    @Published var isVideoEnabled = true
    @Published private(set) var remoteVideoTrack: RTCVideoTrack?
    @Published private(set) var localVideoTrack: RTCVideoTrack?

    let conversation: Conversation

    private let sessionController: SessionController
    private let session: VideoSession

    init(conversation: Conversation, sessionController: SessionController, session: VideoSession? = nil) {
        self.conversation = conversation
        self.sessionController = sessionController
        self.session = session ?? VideoSession()
        self.session.delegate = self
    }

    func startCall() async {
        guard let token = sessionController.token else { return }
        state = .connecting

        do {
            try await session.start(conversationID: conversation.id, token: token)
        } catch {
            state = .failed(error)
        }
    }

    func endCall() {
        session.end()
        state = .ended
    }

    func toggleMute() {
        isMuted.toggle()
        session.setAudioEnabled(!isMuted)
    }

    func toggleVideo() {
        isVideoEnabled.toggle()
        session.setVideoEnabled(isVideoEnabled)
    }
}

extension VideoCallViewModel: VideoSessionDelegate {
    nonisolated func videoSession(_ session: VideoSession, didChangeState state: VideoSession.State) {
        Task { @MainActor in
            switch state {
            case .idle:
                self.state = .idle
            case .connecting:
                self.state = .connecting
            case .connected(let tracks):
                self.state = .connected(tracks)
                self.localVideoTrack = tracks.local
                self.remoteVideoTrack = tracks.remote
            case .failed(let error):
                self.state = .failed(error)
            case .ended:
                self.state = .ended
            }
        }
    }
}
