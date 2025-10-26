import Foundation
import Combine

@MainActor
final class SessionController: ObservableObject {
    @Published private(set) var currentUser: User?
    @Published private(set) var token: String?

    private let api = APIClient()

    init() {
        loadCachedSession()
    }

    func update(authResponse: AuthResponse) {
        token = authResponse.token
        currentUser = authResponse.user
        cacheSession(token: authResponse.token, user: authResponse.user)
    }

    func signOut() {
        token = nil
        currentUser = nil
        clearCache()
    }

    func restoreSession() async {
        guard let cachedToken = token, currentUser != nil else {
            return
        }

        do {
            let user: User = try await api.request("/api/me", tokenProvider: { cachedToken })
            currentUser = user
        } catch {
            signOut()
        }
    }

    private func loadCachedSession() {
        let defaults = UserDefaults.standard
        if let token = defaults.string(forKey: "chat_orbit_token"),
           let userData = defaults.data(forKey: "chat_orbit_user"),
           let user = try? JSONDecoder().decode(User.self, from: userData) {
            self.token = token
            self.currentUser = user
        }
    }

    private func cacheSession(token: String, user: User) {
        let defaults = UserDefaults.standard
        defaults.set(token, forKey: "chat_orbit_token")
        if let data = try? JSONEncoder().encode(user) {
            defaults.set(data, forKey: "chat_orbit_user")
        }
    }

    private func clearCache() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "chat_orbit_token")
        defaults.removeObject(forKey: "chat_orbit_user")
    }
}
