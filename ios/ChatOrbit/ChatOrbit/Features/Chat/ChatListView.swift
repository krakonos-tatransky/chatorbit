import SwiftUI

struct ChatListView: View {
    @StateObject private var viewModel: ChatListViewModel

    init(viewModel: ChatListViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        List {
            ForEach(viewModel.filteredConversations) { conversation in
                NavigationLink(value: conversation) {
                    ConversationRow(conversation: conversation)
                }
                .task {
                    await viewModel.loadMoreIfNeeded(current: conversation)
                }
            }
        }
        .listStyle(.plain)
        .refreshable {
            await viewModel.refresh()
        }
        .searchable(text: $viewModel.searchTerm)
        .overlay {
            if viewModel.isLoading && viewModel.conversations.isEmpty {
                ProgressView()
            } else if let message = viewModel.errorMessage {
                VStack(spacing: 12) {
                    Image(systemName: "wifi.slash")
                        .font(.system(size: 32))
                        .foregroundStyle(.secondary)
                    Text("Unable to load chats")
                        .font(.headline)
                    Text(message)
                        .font(.subheadline)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                }
                .padding()
            }
        }
        .navigationDestination(for: Conversation.self) { conversation in
            ChatDetailView(viewModel: ChatDetailViewModel(conversation: conversation, sessionController: viewModel.sessionController))
        }
        .task {
            if viewModel.conversations.isEmpty {
                await viewModel.refresh()
            }
        }
    }
}

private struct ConversationRow: View {
    let conversation: Conversation

    var body: some View {
        HStack(spacing: 16) {
            Circle()
                .fill(Color.accentColor.opacity(0.2))
                .frame(width: 44, height: 44)
                .overlay {
                    Text(conversation.title.prefix(2).uppercased())
                        .font(.headline)
                }

            VStack(alignment: .leading, spacing: 4) {
                Text(conversation.title)
                    .font(.headline)
                Text(conversation.lastMessage?.body ?? "Start the conversation")
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            if conversation.unreadCount > 0 {
                Text("\(conversation.unreadCount)")
                    .font(.footnote.bold())
                    .padding(8)
                    .background(Color.accentColor, in: Capsule())
                    .foregroundColor(.white)
            }
        }
        .padding(.vertical, 8)
    }
}
