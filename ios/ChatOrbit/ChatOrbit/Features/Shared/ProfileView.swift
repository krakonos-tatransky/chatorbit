import SwiftUI

struct ProfileView: View {
    let user: User
    @ObservedObject var sessionController: SessionController
    let isGuest: Bool
    let onSignInTapped: () -> Void

    var body: some View {
        Form {
            if isGuest {
                Section(header: Text("Guest mode")) {
                    Text("You're exploring ChatOrbit without signing in. Upgrade to an account any time to sync chats across devices and unlock future perks.")
                        .font(.callout)
                        .foregroundColor(.secondary)

                    Button(action: onSignInTapped) {
                        Text("Sign in or create account")
                            .frame(maxWidth: .infinity)
                    }

                    Text("Guest sessions reset when the app is reinstalled. Sign in later to carry your history with you.")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                }
            } else {
                Section(header: Text("Account")) {
                    LabeledContent("Name", value: user.displayName)
                    LabeledContent("Email", value: user.email)
                    LabeledContent("Joined", value: user.createdAt.formatted(date: .abbreviated, time: .shortened))
                }

                Section {
                    Button(role: .destructive, action: sessionController.signOut) {
                        Text("Sign out")
                            .frame(maxWidth: .infinity)
                    }
                }
            }
        }
    }
}
