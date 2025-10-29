import Foundation

struct SessionPersistence {
    private static let storage = UserDefaults.standard

    static func loadRecord(for token: String) -> SessionStorageRecord? {
        guard let data = storage.data(forKey: key(for: token)) else {
            return nil
        }
        return try? JSONDecoder().decode(SessionStorageRecord.self, from: data)
    }

    static func save(record: SessionStorageRecord) {
        guard let data = try? JSONEncoder().encode(record) else {
            return
        }
        storage.set(data, forKey: key(for: record.token))
    }

    static func clear(token: String) {
        storage.removeObject(forKey: key(for: token))
    }

    private static func key(for token: String) -> String {
        "chatOrbit.session.\(token)"
    }
}

final class ClientIdentityStore {
    static let shared = ClientIdentityStore()

    private let storageKey = "chatOrbit.clientIdentity"
    private let queue = DispatchQueue(label: "chatOrbit.identity", qos: .utility)
    private var cachedIdentity: String?

    private init() {
        cachedIdentity = UserDefaults.standard.string(forKey: storageKey)
    }

    func identity() -> String {
        if let cachedIdentity {
            return cachedIdentity
        }
        let newIdentity = generateIdentity()
        cachedIdentity = newIdentity
        UserDefaults.standard.set(newIdentity, forKey: storageKey)
        return newIdentity
    }

    private func generateIdentity() -> String {
        var randomBytes = [UInt8](repeating: 0, count: 32)
        let result = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if result == errSecSuccess {
            let data = Data(randomBytes)
            return data.base64EncodedString()
        }
        return UUID().uuidString.replacingOccurrences(of: "-", with: "")
    }
}

extension ISO8601DateFormatter {
    static let chatOrbitFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
