import SwiftUI

struct RootView: View {
    @EnvironmentObject private var sessionController: SessionController
    @State private var isPresentingAuth = false

    var body: some View {
        Group {
            if let user = sessionController.currentUser {
                TabView {
                    NavigationStack {
                        ChatListView(viewModel: ChatListViewModel(sessionController: sessionController))
                            .navigationTitle("Chats")
                    }
                    .tabItem {
                        Label("Chats", systemImage: "bubble.left.and.bubble.right")
                    }

                    NavigationStack {
                        VideoLobbyView(sessionController: sessionController)
                            .navigationTitle("Meetings")
                    }
                    .tabItem {
                        Label("Video", systemImage: "video")
                    }

                    NavigationStack {
                        ProfileView(
                            user: user,
                            sessionController: sessionController,
                            isGuest: sessionController.isGuestSession,
                            onSignInTapped: { isPresentingAuth = true }
                        )
                            .navigationTitle("Profile")
                    }
                    .tabItem {
                        Label("Profile", systemImage: "person.crop.circle")
                    }
                }
            } else {
                ProgressView()
            }
        }
        .task {
            await sessionController.restoreSession()
        }
        .sheet(isPresented: $isPresentingAuth) {
            AuthView(viewModel: AuthViewModel(sessionController: sessionController))
        }
        .onChange(of: sessionController.isGuestSession) { isGuest in
            if isGuest == false {
                isPresentingAuth = false
            }
        }
    }
}

struct RootView_Previews: PreviewProvider {
    static var previews: some View {
        RootView()
            .environmentObject(SessionController())
    }
}
