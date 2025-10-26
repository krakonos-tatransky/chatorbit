import AuthenticationServices
import SwiftUI

struct AuthView: View {
    @StateObject private var viewModel: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme

    init(viewModel: AuthViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()
                VStack(alignment: .leading, spacing: 16) {
                    Text(viewModel.isRegistering ? "Create your account" : "Welcome back")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    if viewModel.isRegistering {
                        TextField("Display name", text: $viewModel.displayName)
                            .textContentType(.name)
                            .textInputAutocapitalization(.words)
                            .padding()
                            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }

                    TextField("Email", text: $viewModel.email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding()
                        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))

                    SecureField("Password", text: $viewModel.password)
                        .textContentType(.password)
                        .padding()
                        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                Button {
                    Task { await viewModel.submit() }
                } label: {
                    HStack {
                        if viewModel.isLoading {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(viewModel.isRegistering ? "Sign up" : "Sign in")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .foregroundColor(.white)
                }
                .disabled(viewModel.isLoading)

                Button(action: viewModel.toggleMode) {
                    Text(viewModel.isRegistering ? "Already have an account? Sign in" : "Need an account? Register")
                        .font(.footnote)
                        .fontWeight(.semibold)
                }

                SignInWithAppleButton(.signIn, onRequest: viewModel.prepareAppleRequest(_:), onCompletion: viewModel.handleAppleCompletion(_:))
                    .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
                    .frame(height: 48)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                Text("Sign in with Apple will be enabled soon. For now it personalizes your guest profile so you're ready when the backend integration lands.")
                    .font(.footnote)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)

                Button(action: {
                    viewModel.continueAsGuest()
                    dismiss()
                }) {
                    Text("Continue as guest")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                Spacer()
            }
            .padding()
        }
    }
}

struct AuthView_Previews: PreviewProvider {
    static var previews: some View {
        AuthView(viewModel: AuthViewModel(sessionController: SessionController()))
    }
}
