import SwiftUI

struct VideoLobbyView: View {
    @ObservedObject var sessionController: SessionController
    @State private var selectedConversation: Conversation?
    @State private var conversations: [Conversation] = []
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let chatService: ChatServiceProtocol = ChatService()

    var body: some View {
        List(conversations) { conversation in
            Button {
                selectedConversation = conversation
            } label: {
                VStack(alignment: .leading, spacing: 4) {
                    Text(conversation.title)
                        .font(.headline)
                    Text("Participants: \(conversation.participants.map(\.displayName).joined(separator: ", "))")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)
        }
        .overlay {
            if isLoading {
                ProgressView()
            } else if let message = errorMessage {
                VStack(spacing: 12) {
                    Image(systemName: "video.slash")
                        .font(.system(size: 32))
                        .foregroundStyle(.secondary)
                    Text("Unable to load meetings")
                        .font(.headline)
                    Text(message)
                        .font(.subheadline)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                }
                .padding()
            }
        }
        .task {
            await loadConversations()
        }
        .sheet(item: $selectedConversation) { conversation in
            NavigationStack {
                VideoCallView(viewModel: VideoCallViewModel(conversation: conversation, sessionController: sessionController))
            }
        }
    }

    private func loadConversations() async {
        guard let token = sessionController.token else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let page = try await chatService.fetchConversations(cursor: nil, token: token)
            conversations = page.items
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
