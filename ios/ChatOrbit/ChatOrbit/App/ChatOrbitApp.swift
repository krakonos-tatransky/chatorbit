import SwiftUI

@main
struct ChatOrbitApp: App {
    @StateObject private var sessionController = SessionController()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(sessionController)
        }
    }
}
