import Foundation

enum AppEnvironment {
    static var apiBaseURL: URL {
        if let override = Bundle.main.object(forInfoDictionaryKey: "CHAT_ORBIT_API_URL") as? String,
           let url = URL(string: override) {
            return url
        }
        return URL(string: "https://endpoints.chatorbit.com")!
    }

    static var websocketURL: URL {
        if let override = Bundle.main.object(forInfoDictionaryKey: "CHAT_ORBIT_WS_URL") as? String,
           let url = URL(string: override) {
            return url
        }
        return URL(string: "wss://endpoints.chatorbit.com/ws")!
    }

    static var iceServers: [ICEServerConfiguration] {
        if let override = Bundle.main.object(forInfoDictionaryKey: "CHAT_ORBIT_ICE_SERVERS") as? String,
           let data = override.data(using: .utf8) {
            if let decoded = try? JSONDecoder().decode([ICEServerConfiguration].self, from: data) {
                return decoded
            }
        }

        var servers: [ICEServerConfiguration] = []

        let defaults = Bundle.main
        let stunValue = (defaults.object(forInfoDictionaryKey: "CHAT_ORBIT_STUN_URLS") as? String)?.split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty } ?? []
        let defaultStun = ["stun:stun.nextcloud.com:443"]
        let effectiveStun = stunValue.isEmpty ? defaultStun : stunValue
        if effectiveStun.isEmpty == false {
            servers.append(ICEServerConfiguration(urls: effectiveStun, username: nil, credential: nil))
        }

        let turnURLs = (defaults.object(forInfoDictionaryKey: "CHAT_ORBIT_TURN_URLS") as? String)?.split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty } ?? []
        let turnUsername = defaults.object(forInfoDictionaryKey: "CHAT_ORBIT_TURN_USERNAME") as? String
        let turnPassword = defaults.object(forInfoDictionaryKey: "CHAT_ORBIT_TURN_PASSWORD") as? String
        if turnURLs.isEmpty == false, let username = turnUsername, let password = turnPassword {
            servers.append(ICEServerConfiguration(urls: turnURLs, username: username, credential: password))
        }

        return servers
    }
}

struct ICEServerConfiguration: Codable {
    let urls: [String]
    let username: String?
    let credential: String?
}
