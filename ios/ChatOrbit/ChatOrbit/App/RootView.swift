import SwiftUI

struct RootView: View {
    @EnvironmentObject private var sessionController: SessionController

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
                        ProfileView(user: user, sessionController: sessionController)
                            .navigationTitle("Profile")
                    }
                    .tabItem {
                        Label("Profile", systemImage: "person.crop.circle")
                    }
                }
            } else {
                AuthView(viewModel: AuthViewModel(sessionController: sessionController))
            }
        }
        .task {
            await sessionController.restoreSession()
        }
    }
}

struct RootView_Previews: PreviewProvider {
    static var previews: some View {
        RootView()
            .environmentObject(SessionController())
    }
}
