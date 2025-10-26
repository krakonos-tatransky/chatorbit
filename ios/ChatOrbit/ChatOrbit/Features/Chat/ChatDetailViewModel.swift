import Foundation

@MainActor
final class ChatDetailViewModel: ObservableObject {
    @Published private(set) var messages: [Message] = []
    @Published private(set) var isLoading = false
    @Published private(set) var isSending = false
    @Published var composerText: String = ""
    @Published var errorMessage: String?

    let conversation: Conversation

    private let service: ChatServiceProtocol
    let sessionController: SessionController
    private var nextCursor: String?

    init(conversation: Conversation, service: ChatServiceProtocol = ChatService(), sessionController: SessionController) {
        self.conversation = conversation
        self.service = service
        self.sessionController = sessionController
    }

    func refresh() async {
        guard let token = sessionController.token else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let page = try await service.fetchMessages(conversationID: conversation.id, cursor: nil, token: token)
            messages = page.items
            nextCursor = page.nextCursor
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func loadMoreIfNeeded(current message: Message?) async {
        guard let message else { return }
        guard let last = messages.last, last.id == message.id else { return }
        guard let cursor = nextCursor, let token = sessionController.token else { return }

        do {
            let page = try await service.fetchMessages(conversationID: conversation.id, cursor: cursor, token: token)
            messages.append(contentsOf: page.items)
            nextCursor = page.nextCursor
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func sendMessage() async {
        guard let token = sessionController.token, composerText.isEmpty == false else { return }
        let body = composerText
        composerText = ""
        isSending = true
        defer { isSending = false }

        do {
            let message = try await service.sendMessage(CreateMessageRequest(body: body, attachments: []), conversationID: conversation.id, token: token)
            messages.append(message)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
