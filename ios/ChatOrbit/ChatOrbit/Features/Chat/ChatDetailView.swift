import SwiftUI

struct ChatDetailView: View {
    @StateObject private var viewModel: ChatDetailViewModel

    init(viewModel: ChatDetailViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(viewModel.messages) { message in
                            MessageBubble(message: message, currentUserID: viewModel.sessionController.currentUser?.id)
                                .padding(.horizontal)
                                .id(message.id)
                                .task {
                                    await viewModel.loadMoreIfNeeded(current: message)
                                }
                        }
                    }
                    .padding(.vertical)
                }
                .onChange(of: viewModel.messages.count) { _ in
                    if let last = viewModel.messages.last {
                        withAnimation {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }

            MessageComposerView(text: $viewModel.composerText, isSending: viewModel.isSending) {
                Task { await viewModel.sendMessage() }
            }
            .padding(.horizontal)
            .padding(.bottom)
        }
        .navigationTitle(viewModel.conversation.title)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink("Video call") {
                    VideoCallView(viewModel: VideoCallViewModel(conversation: viewModel.conversation, sessionController: viewModel.sessionController))
                }
            }
        }
        .task {
            if viewModel.messages.isEmpty {
                await viewModel.refresh()
            }
        }
    }
}

private struct MessageBubble: View {
    let message: Message
    let currentUserID: UUID?

    var isCurrentUser: Bool {
        message.sender.id == currentUserID
    }

    var body: some View {
        VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 4) {
            Text(message.sender.displayName)
                .font(.caption)
                .foregroundStyle(.secondary)

            Text(message.body)
                .padding(12)
                .background(isCurrentUser ? Color.accentColor : Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .foregroundColor(isCurrentUser ? .white : .primary)
        }
        .frame(maxWidth: .infinity, alignment: isCurrentUser ? .trailing : .leading)
    }
}
