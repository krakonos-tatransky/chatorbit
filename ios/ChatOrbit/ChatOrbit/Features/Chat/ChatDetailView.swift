import SwiftUI
import WebRTC

struct SessionView: View {
    @StateObject private var viewModel: SessionViewModel
    @State private var draft: String = ""
    @FocusState private var composerFocused: Bool

    init(context: SessionStartContext) {
        _viewModel = StateObject(wrappedValue: SessionViewModel(context: context))
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            videoSection
            Divider()
            messageLog
            composer
        }
        .background(Color(uiColor: .systemBackground))
        .navigationTitle("Session")
        .toolbar {
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                Button("End") {
                    Task { await viewModel.endSession() }
                }
                .disabled(viewModel.isEndingSession)
            }
            ToolbarItemGroup(placement: .bottomBar) {
                HStack(spacing: 16) {
                    Link("Terms", destination: SupportLinks.terms)
                    Link("Help", destination: SupportLinks.help)
                    Button("Report abuse") {
                        viewModel.isReportingAbuse = true
                    }
                }
            }
        }
        .sheet(isPresented: $viewModel.isReportingAbuse) {
            NavigationStack {
                ReportAbuseView(isPresented: $viewModel.isReportingAbuse) { payload in
                    Task {
                        await viewModel.submitAbuseReport(
                            email: payload.email,
                            summary: payload.summary,
                            questionnaire: payload.questionnaire
                        )
                    }
                }
            }
        }
        .confirmationDialog("Video chat request", isPresented: $viewModel.isCallDialogPresented, titleVisibility: .visible) {
            Button("Accept", action: viewModel.acceptCall)
            Button("Decline", role: .destructive, action: viewModel.declineCall)
            Button("Ignore", role: .cancel) {
                viewModel.isCallDialogPresented = false
            }
        } message: {
            Text(callDialogMessage())
        }
        .task {
            await viewModel.start()
        }
        .onDisappear {
            viewModel.stop()
        }
        .alert(isPresented: Binding<Bool>(
            get: { viewModel.errorMessage != nil },
            set: { newValue in
                if newValue == false { viewModel.errorMessage = nil }
            }
        )) {
            Alert(title: Text("Error"), message: Text(viewModel.errorMessage ?? "Unknown error"), dismissButton: .default(Text("OK")))
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Token")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Text(viewModel.context.token)
                    .font(.footnote.monospaced())
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
            if let status = viewModel.status?.status {
                HStack {
                    Label(statusLabel(for: status), systemImage: statusIcon(for: status))
                        .font(.subheadline)
                        .foregroundStyle(color(for: status))
                    Spacer()
                    if let remaining = viewModel.remainingSeconds {
                        Text(timerString(from: remaining))
                            .font(.headline.monospacedDigit())
                    }
                }
            }
            if let success = viewModel.abuseReportSuccess {
                Text(success)
                    .font(.footnote)
                    .foregroundStyle(.green)
            }
            if let error = viewModel.abuseReportError {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
        .padding()
    }

    private var videoSection: some View {
        VStack(spacing: 12) {
            ZStack(alignment: .topTrailing) {
                if let remote = viewModel.remoteVideoTrack {
                    RTCVideoRenderer(track: remote)
                        .frame(maxWidth: .infinity, maxHeight: 280)
                        .background(Color.black)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                } else {
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(Color.black)
                        .frame(maxWidth: .infinity, maxHeight: 220)
                        .overlay(alignment: .center) {
                            Text(callPlaceholderText())
                                .foregroundStyle(.white)
                                .font(.headline)
                        }
                }
                if let local = viewModel.localVideoTrack {
                    RTCVideoRenderer(track: local)
                        .frame(width: 140, height: 200)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .padding(12)
                        .shadow(radius: 6)
                }
            }

            if let notice = viewModel.callNotice, notice.isEmpty == false {
                Text(notice)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            HStack(spacing: 16) {
                Button(action: viewModel.toggleCall) {
                    Label(viewModel.callButtonTitle, systemImage: viewModel.callButtonIconName)
                        .font(.callout.bold())
                        .padding(.vertical, 10)
                        .padding(.horizontal, 16)
                        .background(callButtonBackground())
                        .foregroundStyle(Color.white)
                        .clipShape(Capsule())
                }
                .disabled(viewModel.callButtonDisabled)
                .opacity(viewModel.callButtonDisabled ? 0.5 : 1)

                Spacer()

                if viewModel.canShowMuteControls {
                    Button(action: viewModel.toggleLocalAudioMuted) {
                        Image(systemName: viewModel.isLocalAudioMuted ? "mic.slash.fill" : "mic.fill")
                            .font(.title3)
                            .padding(12)
                            .foregroundStyle(viewModel.isLocalAudioMuted ? Color.red : Color.primary)
                    }
                    .background(Color(uiColor: .secondarySystemBackground), in: Circle())

                    Button(action: viewModel.toggleLocalVideoMuted) {
                        Image(systemName: viewModel.isLocalVideoMuted ? "video.slash.fill" : "video.fill")
                            .font(.title3)
                            .padding(12)
                            .foregroundStyle(viewModel.isLocalVideoMuted ? Color.red : Color.primary)
                    }
                    .background(Color(uiColor: .secondarySystemBackground), in: Circle())
                }
            }
        }
        .padding([.horizontal, .bottom])
    }

    private var messageLog: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    ForEach(viewModel.messages) { message in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(senderLabel(for: message))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text(message.createdAt, style: .time)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Text(message.content)
                                .padding(12)
                                .background(bubbleColor(for: message), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                                .foregroundStyle(message.participantId == viewModel.context.participantId ? Color.white : Color.primary)
                        }
                        .id(message.id)
                    }
                }
                .padding()
            }
            .onChange(of: viewModel.messages) { _ in
                if let last = viewModel.messages.last {
                    withAnimation {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
        }
    }

    private var composer: some View {
        VStack(alignment: .leading, spacing: 8) {
            Divider()
            HStack(alignment: .bottom, spacing: 8) {
                TextEditor(text: $draft)
                    .focused($composerFocused)
                    .frame(minHeight: 44, maxHeight: 120)
                    .padding(8)
                    .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .onSubmit(sendDraft)
                Button(action: sendDraft) {
                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .padding(12)
                        .background(Color.accentColor, in: Circle())
                        .foregroundStyle(Color.white)
                }
                .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            if let limit = viewModel.status?.messageCharLimit {
                Text("Limit: \(limit) characters per message")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }

    private func sendDraft() {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.isEmpty == false else { return }
        viewModel.send(message: trimmed)
        draft = ""
        composerFocused = false
    }

    private func statusLabel(for status: SessionLifecycleStatus) -> String {
        switch status {
        case .issued: return "Waiting"
        case .active: return "Active"
        case .closed: return "Closed"
        case .expired: return "Expired"
        case .deleted: return "Deleted"
        }
    }

    private func statusIcon(for status: SessionLifecycleStatus) -> String {
        switch status {
        case .issued: return "hourglass"
        case .active: return "bolt.fill"
        case .closed: return "lock"
        case .expired: return "exclamationmark.triangle.fill"
        case .deleted: return "hand.raised.fill"
        }
    }

    private func color(for status: SessionLifecycleStatus) -> Color {
        switch status {
        case .issued: return .secondary
        case .active: return .green
        case .closed: return .blue
        case .expired: return .orange
        case .deleted: return .red
        }
    }

    private func timerString(from seconds: Int) -> String {
        let clamped = max(0, seconds)
        let minutes = clamped / 60
        let secs = clamped % 60
        return String(format: "%02d:%02d", minutes, secs)
    }

    private func senderLabel(for message: SessionMessage) -> String {
        message.participantId == viewModel.context.participantId ? "You" : message.role.capitalized
    }

    private func bubbleColor(for message: SessionMessage) -> Color {
        message.participantId == viewModel.context.participantId ? Color.accentColor : Color(uiColor: .secondarySystemBackground)
    }

    private func callDialogMessage() -> String {
        if let participant = viewModel.incomingCallParticipant, participant.isEmpty == false {
            let trimmed = participant.count > 8 ? "\(participant.prefix(6))…" : participant
            return "Participant \(trimmed) requested a video chat."
        }
        return "Your partner would like to start a video chat."
    }

    private func callPlaceholderText() -> String {
        switch viewModel.callState {
        case .idle:
            return "Request a video chat to connect."
        case .requesting:
            return "Waiting for your partner to accept…"
        case .incoming:
            return "Respond to your partner's video chat request."
        case .connecting:
            return "Connecting video chat…"
        case .active:
            return "Waiting for partner…"
        }
    }

    private func callButtonBackground() -> Color {
        if viewModel.callButtonDisabled {
            return Color.gray
        }
        switch viewModel.callState {
        case .active:
            return .red
        case .requesting, .connecting:
            return .orange
        case .incoming:
            return .blue
        case .idle:
            return .accentColor
        }
    }
}

struct RTCVideoRenderer: UIViewRepresentable {
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

    final class Coordinator {
        private let track: RTCVideoTrack
        weak var view: RTCEAGLVideoView?

        init(track: RTCVideoTrack) {
            self.track = track
        }

        deinit {
            if let view { track.remove(view) }
        }
    }
}
