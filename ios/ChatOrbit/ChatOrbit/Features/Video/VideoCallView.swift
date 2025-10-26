import SwiftUI
import WebRTC

struct VideoCallView: View {
    @StateObject private var viewModel: VideoCallViewModel

    init(viewModel: VideoCallViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        VStack(spacing: 16) {
            ZStack {
                if let remoteTrack = viewModel.remoteVideoTrack {
                    RTCVideoView(track: remoteTrack)
                        .overlay(alignment: .topTrailing) {
                            if let localTrack = viewModel.localVideoTrack {
                                RTCVideoView(track: localTrack)
                                    .frame(width: 120, height: 180)
                                    .clipShape(RoundedRectangle(cornerRadius: 16))
                                    .padding()
                            }
                        }
                } else if let localTrack = viewModel.localVideoTrack {
                    RTCVideoView(track: localTrack)
                } else {
                    ProgressView("Connecting video…")
                }
            }
            .frame(maxHeight: .infinity)
            .background(Color.black.opacity(0.9))
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .padding()

            switch viewModel.state {
            case .connecting:
                Text("Connecting…")
                    .font(.headline)
                    .foregroundStyle(.secondary)
            case .ended:
                Text("Call ended")
                    .font(.headline)
                    .foregroundStyle(.secondary)
            case let .failed(error):
                Text(error.localizedDescription)
                    .font(.headline)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            default:
                EmptyView()
            }

            CallControlsView(isMuted: viewModel.isMuted,
                             isVideoEnabled: viewModel.isVideoEnabled,
                             state: viewModel.state,
                             onToggleMute: viewModel.toggleMute,
                             onToggleVideo: viewModel.toggleVideo,
                             onEnd: viewModel.endCall)
                .padding(.bottom)
        }
        .navigationTitle(viewModel.conversation.title)
        .toolbar(.hidden, for: .tabBar)
        .task {
            await viewModel.startCall()
        }
    }
}

private struct CallControlsView: View {
    let isMuted: Bool
    let isVideoEnabled: Bool
    let state: VideoCallViewModel.CallState
    let onToggleMute: () -> Void
    let onToggleVideo: () -> Void
    let onEnd: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            if case let .failed(error) = state {
                Text(error.localizedDescription)
                    .foregroundColor(.red)
            }

            HStack(spacing: 32) {
                ControlButton(systemName: isMuted ? "mic.slash.fill" : "mic.fill",
                              tint: isMuted ? .red : .white,
                              background: Color.black.opacity(0.6),
                              action: onToggleMute)

                ControlButton(systemName: "phone.down.fill",
                              tint: .white,
                              background: .red,
                              action: onEnd)

                ControlButton(systemName: isVideoEnabled ? "video.fill" : "video.slash.fill",
                              tint: isVideoEnabled ? .white : .red,
                              background: Color.black.opacity(0.6),
                              action: onToggleVideo)
            }
        }
        .padding()
        .background(Color.black.opacity(0.4), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}

private struct ControlButton: View {
    let systemName: String
    let tint: Color
    let background: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 24, weight: .medium))
                .foregroundColor(tint)
                .frame(width: 60, height: 60)
                .background(background, in: Circle())
        }
    }
}

private struct RTCVideoView: UIViewRepresentable {
    let track: RTCVideoTrack

    func makeUIView(context: Context) -> RTCEAGLVideoView {
        let view = RTCEAGLVideoView()
        view.contentMode = .scaleAspectFill
        track.add(view)
        context.coordinator.view = view
        return view
    }

    func updateUIView(_ uiView: RTCEAGLVideoView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(track: track)
    }

    static func dismantleUIView(_ uiView: RTCEAGLVideoView, coordinator: Coordinator) {
        coordinator.detach()
    }

    final class Coordinator {
        private let track: RTCVideoTrack
        weak var view: RTCEAGLVideoView?

        init(track: RTCVideoTrack) {
            self.track = track
        }

        func detach() {
            if let view {
                track.remove(view)
            }
            view = nil
        }

        deinit {
            detach()
        }
    }
}
