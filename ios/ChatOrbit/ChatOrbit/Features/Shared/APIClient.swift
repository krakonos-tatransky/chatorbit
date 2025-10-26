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
        self.decoder.dateDecodingStrategy = .iso8601
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .iso8601
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
            return try decoder.decode(T.self, from: data)
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
        case let .unknown(error):
            return error.localizedDescription
        }
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
