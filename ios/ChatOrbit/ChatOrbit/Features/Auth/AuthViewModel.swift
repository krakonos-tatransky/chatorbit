import AuthenticationServices
import Foundation

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email: String = ""
    @Published var password: String = ""
    @Published var displayName: String = ""
    @Published var isRegistering: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private let sessionController: SessionController
    private let service: AuthServiceProtocol
    private let nameFormatter = PersonNameComponentsFormatter()

    init(sessionController: SessionController, service: AuthServiceProtocol = AuthService()) {
        self.sessionController = sessionController
        self.service = service
    }

    func toggleMode() {
        isRegistering.toggle()
        errorMessage = nil
    }

    func submit() async {
        guard email.isEmpty == false, password.count >= 8 else {
            errorMessage = "Enter a valid email and a password of at least 8 characters."
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let response: AuthResponse
            if isRegistering {
                guard displayName.isEmpty == false else {
                    errorMessage = "Display name is required."
                    return
                }
                response = try await service.register(name: displayName, email: email, password: password)
            } else {
                response = try await service.signIn(email: email, password: password)
            }

            sessionController.update(authResponse: response)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func continueAsGuest() {
        sessionController.startGuestSession()
        errorMessage = nil
    }

    func prepareAppleRequest(_ request: ASAuthorizationAppleIDRequest) {
        request.requestedScopes = [.fullName, .email]
    }

    func handleAppleCompletion(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case let .success(authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else { return }

            let providedName = credential.fullName.flatMap { nameFormatter.string(from: $0) }?.trimmingCharacters(in: .whitespacesAndNewlines)
            let fallbackName = providedName?.isEmpty == false ? providedName! : "Guest"
            sessionController.startGuestSession(displayName: fallbackName)
            errorMessage = nil
        case let .failure(error):
            errorMessage = error.localizedDescription
        }
    }
}
