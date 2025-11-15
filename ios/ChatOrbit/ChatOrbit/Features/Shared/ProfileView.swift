import SwiftUI

struct SupportFooterView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Need more help?")
                .font(.headline)
            Text("ChatOrbit sessions are end-to-end encrypted between you and your partner. Visit our help center for more details or contact support@chatorbit.com.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            HStack(spacing: 16) {
                Link("Help", destination: SupportLinks.help)
                Link("Terms", destination: SupportLinks.terms)
                Link("Privacy", destination: SupportLinks.privacy)
            }
        }
    }
}
