import Foundation

final class WebSocketManager: NSObject {
    enum Event {
        case connected
        case disconnected(Error?)
        case message(Data)
    }

    private var webSocketTask: URLSessionWebSocketTask?
    private let session: URLSession
    private let eventHandler: (Event) -> Void

    init(url: URL, tokenProvider: @escaping () -> String?, eventHandler: @escaping (Event) -> Void) {
        self.eventHandler = eventHandler
        let configuration = URLSessionConfiguration.default
        if let token = tokenProvider() {
            configuration.httpAdditionalHeaders = ["Authorization": "Bearer \(token)"]
        }
        self.session = URLSession(configuration: configuration)
        super.init()
        connect(url: url)
    }

    func send(data: Data) {
        if let string = String(data: data, encoding: .utf8) {
            webSocketTask?.send(.string(string)) { [weak self] error in
                if let error {
                    self?.deliver(.disconnected(error))
                }
            }
        } else {
            webSocketTask?.send(.data(data)) { [weak self] error in
                if let error {
                    self?.deliver(.disconnected(error))
                }
            }
        }
    }

    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
    }

    private func connect(url: URL) {
        webSocketTask = session.webSocketTask(with: url)
        listen()
        webSocketTask?.resume()
        deliver(.connected)
    }

    private func listen() {
        webSocketTask?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case let .success(message):
                switch message {
                case let .data(data):
                    self.deliver(.message(data))
                case let .string(string):
                    self.deliver(.message(Data(string.utf8)))
                @unknown default:
                    break
                }
                self.listen()
            case let .failure(error):
                self.deliver(.disconnected(error))
            }
        }
    }

    private func deliver(_ event: Event) {
        if Thread.isMainThread {
            eventHandler(event)
        } else {
            DispatchQueue.main.async { [eventHandler] in
                eventHandler(event)
            }
        }
    }
}
