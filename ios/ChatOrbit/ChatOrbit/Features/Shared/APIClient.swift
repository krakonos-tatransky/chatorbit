import Foundation

struct APIClient {
    enum Method: String {
        case get = "GET"
        case post = "POST"
        case put = "PUT"
        case delete = "DELETE"
    }

    private let session: URLSession
    private let baseURL: URL
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private static let iso8601Formatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let iso8601NoFractionalFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private static let fallbackDatePatterns: [String] = [
        "yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXXXX",
        "yyyy-MM-dd'T'HH:mm:ss.SSSSSSZZZZZ",
        "yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXXX",
        "yyyy-MM-dd'T'HH:mm:ss.SSSSSS",
        "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
        "yyyy-MM-dd'T'HH:mm:ss.SSS",
        "yyyy-MM-dd'T'HH:mm:ssXXXXX",
        "yyyy-MM-dd'T'HH:mm:ssZZZZZ",
        "yyyy-MM-dd'T'HH:mm:ssXXXX",
        "yyyy-MM-dd'T'HH:mm:ss",
        "yyyy-MM-dd HH:mm:ss.SSSSSS",
        "yyyy-MM-dd HH:mm:ss"
    ]

    init(session: URLSession? = nil, baseURL: URL = AppEnvironment.apiBaseURL) {
        if let session {
            self.session = session
        } else {
            let configuration = URLSessionConfiguration.default
            configuration.waitsForConnectivity = true
            configuration.allowsExpensiveNetworkAccess = true
            configuration.allowsConstrainedNetworkAccess = true
            configuration.timeoutIntervalForRequest = 30
            configuration.timeoutIntervalForResource = 60
            configuration.httpShouldUsePipelining = true
            self.session = URLSession(configuration: configuration)
        }
        self.baseURL = baseURL
        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()

            if let timestamp = try? container.decode(Double.self) {
                return Date(timeIntervalSince1970: timestamp)
            }

            if let rawTimestamp = try? container.decode(String.self) {
                let timestampString = rawTimestamp.trimmingCharacters(in: .whitespacesAndNewlines)

                if let doubleValue = Double(timestampString) {
                    return Date(timeIntervalSince1970: doubleValue)
                }

                if let date = APIClient.iso8601Formatter.date(from: timestampString) {
                    return date
                }

                if let augmented = APIClient.ensureTimezoneIfMissing(in: timestampString),
                   let date = APIClient.iso8601Formatter.date(from: augmented) {
                    return date
                }

                if let date = APIClient.iso8601NoFractionalFormatter.date(from: timestampString) {
                    return date
                }

                if let augmented = APIClient.ensureTimezoneIfMissing(in: timestampString),
                   let date = APIClient.iso8601NoFractionalFormatter.date(from: augmented) {
                    return date
                }

                if let date = APIClient.parseWithFallbackFormatters(timestampString) {
                    return date
                }
            }

            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported date format")
        }
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .custom { date, encoder in
            var container = encoder.singleValueContainer()
            let string = APIClient.iso8601Formatter.string(from: date)
            try container.encode(string)
        }
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    func request<T: Decodable>(_ path: String,
                               method: Method = .get,
                               body: Encodable? = nil,
                               headers: [String: String] = [:],
                               tokenProvider: () -> String? = { nil }) async throws -> T {
        let sanitizedPath = path.hasPrefix("/") ? String(path.dropFirst()) : path
        guard let url = URL(string: sanitizedPath, relativeTo: baseURL)?.standardized else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        headers.forEach { key, value in
            request.setValue(value, forHTTPHeaderField: key)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let urlError as URLError {
            throw APIError.transport(urlError)
        } catch {
            throw APIError.unknown(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200..<300:
            do {
                return try decoder.decode(T.self, from: data)
            } catch let decodingError as DecodingError {
                throw APIError.decoding(decodingError)
            } catch {
                throw APIError.unknown(error)
            }
        case 401:
            throw APIError.unauthorized
        default:
            let message = decodeErrorMessage(from: data) ?? HTTPURLResponse.localizedString(forStatusCode: httpResponse.statusCode)
            throw APIError.server(statusCode: httpResponse.statusCode, message: message)
        }
    }

    private func decodeErrorMessage(from data: Data) -> String? {
        guard data.isEmpty == false else { return nil }
        if let envelope = try? decoder.decode(ErrorEnvelopeResponse.self, from: data) {
            if let detail = envelope.detail, detail.isEmpty == false {
                return detail
            }
            if let message = envelope.message, message.isEmpty == false {
                return message
            }
        }
        return String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

// MARK: - Support types

enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case server(statusCode: Int, message: String)
    case transport(URLError)
    case decoding(DecodingError)
    case unknown(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "The requested endpoint is invalid."
        case .invalidResponse:
            return "The server response was invalid."
        case .unauthorized:
            return "Your session has expired. Please sign in again."
        case let .server(code, message):
            return message.isEmpty ? "Server error (\(code))" : message
        case let .transport(error):
            return "Network error: \(error.localizedDescription)"
        case let .decoding(error):
            return "Failed to parse server response: \(APIClient.describe(decodingError: error))"
        case let .unknown(error):
            return error.localizedDescription
        }
    }
}

private extension APIClient {
    static func describe(decodingError: DecodingError) -> String {
        switch decodingError {
        case let .dataCorrupted(context):
            return context.debugDescription
        case let .keyNotFound(key, context):
            return "Missing key '\(key.stringValue)' – \(context.debugDescription)"
        case let .typeMismatch(type, context):
            return "Type mismatch for \(type): \(context.debugDescription)"
        case let .valueNotFound(type, context):
            return "Missing value for \(type): \(context.debugDescription)"
        @unknown default:
            return decodingError.localizedDescription
        }
    }

    static func parseWithFallbackFormatters(_ value: String) -> Date? {
        for pattern in fallbackDatePatterns {
            let formatter = DateFormatter()
            formatter.calendar = Calendar(identifier: .iso8601)
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.timeZone = TimeZone(secondsFromGMT: 0)
            formatter.dateFormat = pattern

            if let date = formatter.date(from: value) {
                return date
            }
        }

        return nil
    }

    static func ensureTimezoneIfMissing(in value: String) -> String? {
        guard let tIndex = value.firstIndex(of: "T") else {
            return nil
        }

        let timeStart = value.index(after: tIndex)
        guard timeStart < value.endIndex else {
            return nil
        }

        let timePortion = value[timeStart...]
        if timePortion.contains(where: { $0 == "Z" || $0 == "+" || $0 == "-" }) {
            return nil
        }

        return value + "Z"
    }
}

private struct AnyEncodable: Encodable {
    private let encoder: (Encoder) throws -> Void

    init(_ encodable: Encodable) {
        self.encoder = encodable.encode
    }

    func encode(to encoder: Encoder) throws {
        try self.encoder(encoder)
    }
}

private struct ErrorEnvelopeResponse: Decodable {
    let detail: String?
    let message: String?
}
