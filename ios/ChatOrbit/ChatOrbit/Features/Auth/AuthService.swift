import Foundation

protocol AuthServiceProtocol {
    func signIn(email: String, password: String) async throws -> AuthResponse
    func register(name: String, email: String, password: String) async throws -> AuthResponse
}

struct AuthService: AuthServiceProtocol {
    private let api = APIClient()

    func signIn(email: String, password: String) async throws -> AuthResponse {
        struct Payload: Encodable { let email: String; let password: String }
        return try await api.request("/api/auth/login", method: .post, body: Payload(email: email, password: password))
    }

    func register(name: String, email: String, password: String) async throws -> AuthResponse {
        struct Payload: Encodable { let name: String; let email: String; let password: String }
        return try await api.request("/api/auth/register", method: .post, body: Payload(name: name, email: email, password: password))
    }
}
