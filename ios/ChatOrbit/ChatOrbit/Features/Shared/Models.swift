import Foundation

struct User: Codable, Identifiable, Equatable {
    let id: UUID
    let email: String
    let displayName: String
    let avatarURL: URL?
    let createdAt: Date
}

struct Conversation: Codable, Identifiable, Equatable {
    let id: UUID
    let title: String
    let participants: [User]
    let lastMessage: Message?
    let unreadCount: Int
}

struct Message: Codable, Identifiable, Equatable {
    let id: UUID
    let body: String
    let sender: User
    let createdAt: Date
    let attachments: [Attachment]
}

struct Attachment: Codable, Identifiable, Equatable {
    let id: UUID
    let url: URL
    let thumbnailURL: URL?
    let type: AttachmentType

    enum AttachmentType: String, Codable {
        case image
        case video
        case file
    }
}

struct AuthResponse: Codable {
    let token: String
    let user: User
}

struct ConversationPage: Codable {
    let items: [Conversation]
    let nextCursor: String?
}

struct MessagePage: Codable {
    let items: [Message]
    let nextCursor: String?
}

struct CreateMessageRequest: Encodable {
    let body: String
    let attachments: [UUID]
}

struct CreateMeetingRequest: Encodable {
    let conversationID: UUID
}

struct Meeting: Codable, Identifiable {
    let id: UUID
    let conversationID: UUID
    let startedAt: Date
    let hostID: UUID
    let iceServers: [ICEServer]
}

struct ICEServer: Codable {
    let urls: [String]
    let username: String?
    let credential: String?
}

struct SignalingPayload: Codable {
    enum PayloadType: String, Codable {
        case offer
        case answer
        case candidate
        case end
    }

    let type: PayloadType
    let sdp: String?
    let candidate: RTCIceCandidatePayload?
}

struct RTCIceCandidatePayload: Codable {
    let candidate: String
    let sdpMid: String?
    let sdpMLineIndex: Int32?
}
