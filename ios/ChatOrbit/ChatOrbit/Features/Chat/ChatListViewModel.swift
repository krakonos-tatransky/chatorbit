import Foundation
import Combine
import UIKit

@MainActor
final class SessionHomeViewModel: ObservableObject {
    @Published var validitySelection: String = "1_day"
    @Published var sessionMinutes: Int = 60
    @Published var messageLimit: Int = 2000
    @Published var isRequestingToken = false
    @Published var requestError: String?
    @Published var issuedToken: TokenIssueResult?
    @Published var tokenCopyFeedback: String?
    @Published var startError: String?
    @Published var joinToken: String = ""
    @Published var joinError: String?
    @Published var isJoining = false

    private let service: SessionService
    private let identityStore: ClientIdentityStore

    init(service: SessionService = SessionService(), identityStore: ClientIdentityStore = .shared) {
        self.service = service
        self.identityStore = identityStore
    }

    var sessionHoursDescription: String {
        String(format: "%.1f hours", Double(sessionMinutes) / 60.0)
    }

    func issueToken() async {
        guard isRequestingToken == false else { return }
        isRequestingToken = true
        requestError = nil
        startError = nil
        tokenCopyFeedback = nil
        do {
            let identity = identityStore.identity()
            let result = try await service.issueToken(
                validity: validitySelection,
                sessionMinutes: sessionMinutes,
                messageLimit: messageLimit,
                identity: identity
            )
            issuedToken = result
            let record = SessionStorageRecord(
                token: result.token,
                participantId: "",
                role: "host",
                sessionActive: false,
                sessionStartedAt: nil,
                sessionExpiresAt: nil,
                messageCharLimit: result.messageCharLimit,
                remainingSeconds: nil,
                status: .issued,
                sessionEnded: false
            )
            SessionPersistence.save(record: record)
        } catch {
            requestError = error.localizedDescription
            issuedToken = nil
        }
        isRequestingToken = false
    }

    func copyToken() {
        guard let token = issuedToken?.token else { return }
        UIPasteboard.general.string = token
        tokenCopyFeedback = "Copied"
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.tokenCopyFeedback = nil
        }
    }

    func startSessionFromIssuedToken() async throws -> SessionStartContext {
        guard let token = issuedToken?.token else {
            throw NSError(domain: "SessionHomeViewModel", code: -1, userInfo: [NSLocalizedDescriptionKey: "Token unavailable"])
        }
        do {
            return try await joinSession(with: token)
        } catch {
            startError = error.localizedDescription
            throw error
        }
    }

    func joinSession(with rawToken: String? = nil) async throws -> SessionStartContext {
        let tokenValue: String
        if let rawToken {
            tokenValue = rawToken.trimmingCharacters(in: .whitespacesAndNewlines)
        } else if let issued = issuedToken?.token {
            tokenValue = issued
        } else {
            throw NSError(domain: "SessionHomeViewModel", code: -1, userInfo: [NSLocalizedDescriptionKey: "Token missing"])
        }

        guard tokenValue.isEmpty == false else {
            throw NSError(domain: "SessionHomeViewModel", code: -2, userInfo: [NSLocalizedDescriptionKey: "Enter a token"])
        }

        isJoining = true
        joinError = nil
        startError = nil

        do {
            let identity = identityStore.identity()
            let storedRecord = SessionPersistence.loadRecord(for: tokenValue)
            let participantId = storedRecord?.participantId
            let response = try await service.joinSession(token: tokenValue, participantId: participantId, identity: identity)
            let context = SessionStartContext(
                token: response.token,
                participantId: response.participantId,
                role: response.role,
                messageLimit: response.messageCharLimit,
                sessionExpiresAt: response.sessionExpiresAt
            )
            let record = SessionStorageRecord(
                token: response.token,
                participantId: response.participantId,
                role: response.role,
                sessionActive: response.sessionActive,
                sessionStartedAt: response.sessionStartedAt,
                sessionExpiresAt: response.sessionExpiresAt,
                messageCharLimit: response.messageCharLimit,
                remainingSeconds: nil,
                status: response.sessionActive ? .active : .issued,
                sessionEnded: false
            )
            SessionPersistence.save(record: record)
            joinToken = ""
            issuedToken = nil
            joinError = nil
            startError = nil
            return context
        } catch {
            joinError = error.localizedDescription
            startError = error.localizedDescription
            throw error
        } finally {
            isJoining = false
        }
    }
}
