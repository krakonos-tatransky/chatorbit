import Foundation

struct TokenIssueResult: Codable, Identifiable, Equatable {
    var id: String { token }
    let token: String
    let validityExpiresAt: Date
    let sessionTtlSeconds: Int
    let messageCharLimit: Int
    let createdAt: Date
}

struct TokenRequestPayload: Encodable {
    let validityPeriod: String
    let sessionTtlMinutes: Int
    let messageCharLimit: Int
    let clientIdentity: String?
}

struct JoinSessionPayload: Encodable {
    let token: String
    let participantId: String?
    let clientIdentity: String?
}

struct JoinSessionResponse: Codable, Equatable {
    let token: String
    let participantId: String
    let role: String
    let sessionActive: Bool
    let sessionStartedAt: Date?
    let sessionExpiresAt: Date?
    let messageCharLimit: Int
}

enum SessionLifecycleStatus: String, Codable {
    case issued
    case active
    case closed
    case expired
    case deleted
}

struct SessionParticipant: Codable, Identifiable, Equatable {
    let participantId: String
    let role: String
    let joinedAt: Date

    var id: String { participantId }
}

struct SessionStatus: Codable, Equatable {
    let token: String
    let status: SessionLifecycleStatus
    let validityExpiresAt: Date
    let sessionStartedAt: Date?
    let sessionExpiresAt: Date?
    let messageCharLimit: Int
    let participants: [SessionParticipant]
    let remainingSeconds: Int?
    let connectedParticipants: [String]?
}

struct ReportAbuseQuestionnaire: Encodable, Equatable {
    var immediateThreat: Bool
    var involvesCriminalActivity: Bool
    var requiresFollowUp: Bool
    var additionalDetails: String?
}

struct ReportAbuseRequest: Encodable {
    let participantId: String?
    let reporterEmail: String
    let summary: String
    let questionnaire: ReportAbuseQuestionnaire
}

struct ReportAbuseResponse: Decodable, Equatable {
    let reportId: Int
    let status: String
    let sessionStatus: String
}

struct SessionStartContext: Hashable {
    let token: String
    let participantId: String
    let role: String
    let messageLimit: Int
    let sessionExpiresAt: Date?
}

struct SessionMessage: Identifiable, Equatable {
    let id: String
    let participantId: String
    let role: String
    let content: String
    let createdAt: Date

    static func == (lhs: SessionMessage, rhs: SessionMessage) -> Bool {
        lhs.id == rhs.id && lhs.participantId == rhs.participantId
    }
}

struct EncryptedMessageRecord: Codable {
    let sessionId: String
    let messageId: String
    let participantId: String
    let role: String
    let createdAt: Date
    let encryptedContent: String?
    let content: String?
    let hash: String?
    let encryption: String?
    let deleted: Bool?
}

struct DeleteMessageInstruction: Codable {
    let type: String
    let sessionId: String
    let messageId: String
    let participantId: String?
}

struct StatusEnvelope: Codable {
    let type: String
    let token: String
    let status: SessionLifecycleStatus
    let validityExpiresAt: Date
    let sessionStartedAt: Date?
    let sessionExpiresAt: Date?
    let messageCharLimit: Int
    let participants: [SessionParticipant]
    let remainingSeconds: Int?
    let connectedParticipants: [String]?
}

struct ErrorEnvelope: Codable {
    let type: String
    let message: String
}

struct SignalEnvelope: Codable {
    let type: String
    let signalType: String
    let payload: SignalPayload
    let sender: String?
}

enum SignalPayload: Codable {
    case description(SessionDescriptionPayload)
    case candidate(IceCandidatePayload)
    case empty

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let description = try? container.decode(SessionDescriptionPayload.self) {
            self = .description(description)
            return
        }
        if let candidate = try? container.decode(IceCandidatePayload.self) {
            self = .candidate(candidate)
            return
        }
        if container.decodeNil() {
            self = .empty
            return
        }
        self = .empty
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case let .description(payload):
            try container.encode(payload)
        case let .candidate(payload):
            try container.encode(payload)
        case .empty:
            try container.encodeNil()
        }
    }
}

struct SessionDescriptionPayload: Codable {
    let type: String
    let sdp: String
}

struct IceCandidatePayload: Codable {
    let candidate: String
    let sdpMid: String?
    let sdpMlineIndex: Int?
}

struct SessionStorageRecord: Codable {
    let token: String
    let participantId: String
    let role: String
    let sessionActive: Bool
    let sessionStartedAt: Date?
    let sessionExpiresAt: Date?
    let messageCharLimit: Int
    let remainingSeconds: Int?
    let status: SessionLifecycleStatus?
    let sessionEnded: Bool?
}
