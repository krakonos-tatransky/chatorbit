import Foundation

@MainActor
final class ChatListViewModel: ObservableObject {
    @Published private(set) var conversations: [Conversation] = []
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?
    @Published var searchTerm: String = ""

    private let service: ChatServiceProtocol
    let sessionController: SessionController
    private var nextCursor: String?

    var filteredConversations: [Conversation] {
        let term = searchTerm.trimmingCharacters(in: .whitespacesAndNewlines)
        guard term.isEmpty == false else { return conversations }
        return conversations.filter { conversation in
            conversation.title.localizedCaseInsensitiveContains(term) ||
            conversation.participants.contains { $0.displayName.localizedCaseInsensitiveContains(term) }
        }
    }

    init(service: ChatServiceProtocol = ChatService(), sessionController: SessionController) {
        self.service = service
        self.sessionController = sessionController
    }

    func refresh() async {
        guard let token = sessionController.token else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let page = try await service.fetchConversations(cursor: nil, token: token)
            conversations = page.items
            nextCursor = page.nextCursor
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadMoreIfNeeded(current conversation: Conversation?) async {
        guard let conversation else { return }
        guard let last = conversations.last, last.id == conversation.id else { return }
        guard searchTerm.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        guard let cursor = nextCursor, let token = sessionController.token else { return }

        do {
            let page = try await service.fetchConversations(cursor: cursor, token: token)
            conversations.append(contentsOf: page.items)
            nextCursor = page.nextCursor
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
