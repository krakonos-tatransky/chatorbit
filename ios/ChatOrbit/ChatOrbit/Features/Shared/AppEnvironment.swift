import Foundation

enum AppEnvironment {
    static var apiBaseURL: URL {
        if let override = Bundle.main.object(forInfoDictionaryKey: "CHAT_ORBIT_API_URL") as? String,
           let url = URL(string: override) {
            return url
        }
        return URL(string: "https://api.chatorbit.com")!
    }

    static var websocketURL: URL {
        if let override = Bundle.main.object(forInfoDictionaryKey: "CHAT_ORBIT_WS_URL") as? String,
           let url = URL(string: override) {
            return url
        }
        return URL(string: "wss://api.chatorbit.com/ws")!
    }
}
