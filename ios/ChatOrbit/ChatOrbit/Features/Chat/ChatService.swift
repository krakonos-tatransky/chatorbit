import Foundation

struct SessionService {
    private let api: APIClient

    init(api: APIClient = APIClient()) {
        self.api = api
    }

    func issueToken(validity: String, sessionMinutes: Int, messageLimit: Int, identity: String?) async throws -> TokenIssueResult {
        let payload = TokenRequestPayload(
            validityPeriod: validity,
            sessionTtlMinutes: sessionMinutes,
            messageCharLimit: messageLimit,
            clientIdentity: identity
        )
        return try await api.request("/api/tokens", method: .post, body: payload)
    }

    func joinSession(token: String, participantId: String?, identity: String?) async throws -> JoinSessionResponse {
        let payload = JoinSessionPayload(token: token, participantId: participantId, clientIdentity: identity)
        return try await api.request("/api/sessions/join", method: .post, body: payload)
    }

    func fetchStatus(token: String) async throws -> SessionStatus {
        return try await api.request("/api/sessions/\(token)/status")
    }

    func endSession(token: String) async throws -> SessionStatus {
        return try await api.request("/api/sessions/\(token)", method: .delete)
    }

    func reportAbuse(token: String, request: ReportAbuseRequest) async throws -> ReportAbuseResponse {
        return try await api.request("/api/sessions/\(token)/report-abuse", method: .post, body: request)
    }
}
