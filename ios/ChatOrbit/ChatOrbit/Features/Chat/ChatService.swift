import Foundation

protocol ChatServiceProtocol {
    func fetchConversations(cursor: String?, token: String) async throws -> ConversationPage
    func fetchMessages(conversationID: UUID, cursor: String?, token: String) async throws -> MessagePage
    func sendMessage(_ request: CreateMessageRequest, conversationID: UUID, token: String) async throws -> Message
}

struct ChatService: ChatServiceProtocol {
    private let api = APIClient()

    func fetchConversations(cursor: String?, token: String) async throws -> ConversationPage {
        var path = "/api/conversations"
        if let cursor {
            path += "?cursor=\(cursor)"
        }
        return try await api.request(path, tokenProvider: { token })
    }

    func fetchMessages(conversationID: UUID, cursor: String?, token: String) async throws -> MessagePage {
        var path = "/api/conversations/\(conversationID.uuidString)/messages"
        if let cursor {
            path += "?cursor=\(cursor)"
        }
        return try await api.request(path, tokenProvider: { token })
    }

    func sendMessage(_ request: CreateMessageRequest, conversationID: UUID, token: String) async throws -> Message {
        try await api.request(
            "/api/conversations/\(conversationID.uuidString)/messages",
            method: .post,
            body: request,
            tokenProvider: { token }
        )
    }
}
