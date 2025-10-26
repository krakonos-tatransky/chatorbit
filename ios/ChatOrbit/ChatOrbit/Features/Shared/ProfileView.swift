import SwiftUI

struct ProfileView: View {
    let user: User
    @ObservedObject var sessionController: SessionController

    var body: some View {
        Form {
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
