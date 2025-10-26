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
}
