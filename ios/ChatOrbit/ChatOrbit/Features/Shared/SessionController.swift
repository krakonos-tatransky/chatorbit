import Foundation
import Combine

@MainActor
final class SessionController: ObservableObject {
    @Published private(set) var currentUser: User?
    @Published private(set) var token: String?
    @Published private(set) var isGuestSession: Bool = false

    private let api = APIClient()

    init() {
        if loadCachedSession() == false {
            startGuestSession()
        }
    }

    func update(authResponse: AuthResponse) {
        token = authResponse.token
        currentUser = authResponse.user
        isGuestSession = false
        cacheSession(token: authResponse.token, user: authResponse.user)
    }

    func signOut() {
        token = nil
        currentUser = nil
        isGuestSession = false
        clearCache()
        startGuestSession()
    }

    func restoreSession() async {
        guard let cachedToken = token, currentUser != nil, isGuestSession == false else {
            return
        }

        do {
            let user: User = try await api.request("/api/me", tokenProvider: { cachedToken })
            currentUser = user
        } catch {
            signOut()
        }
    }

    func startGuestSession(displayName: String = "Guest") {
        isGuestSession = true
        token = nil
        currentUser = User(
            id: UUID(),
            email: "guest@chat-orbit.app",
            displayName: displayName,
            avatarURL: nil,
            createdAt: Date()
        )
    }

    @discardableResult
    private func loadCachedSession() -> Bool {
        let defaults = UserDefaults.standard
        if let token = defaults.string(forKey: "chat_orbit_token"),
           let userData = defaults.data(forKey: "chat_orbit_user"),
           let user = try? JSONDecoder().decode(User.self, from: userData) {
            self.token = token
            self.currentUser = user
            self.isGuestSession = false
            return true
        }
        return false
    }

    private func cacheSession(token: String, user: User) {
        let defaults = UserDefaults.standard
        defaults.set(token, forKey: "chat_orbit_token")
        if let data = try? JSONEncoder().encode(user) {
            defaults.set(data, forKey: "chat_orbit_user")
        }
        isGuestSession = false
    }

    private func clearCache() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "chat_orbit_token")
        defaults.removeObject(forKey: "chat_orbit_user")
    }
}
