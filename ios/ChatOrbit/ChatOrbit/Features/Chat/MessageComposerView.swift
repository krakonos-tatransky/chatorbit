import SwiftUI

struct MessageComposerView: View {
    @Binding var text: String
    let isSending: Bool
    let onSend: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: 12) {
            TextEditor(text: $text)
                .frame(minHeight: 36, maxHeight: 120)
                .padding(8)
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))

            Button(action: onSend) {
                Image(systemName: isSending ? "hourglass" : "paperplane.fill")
                    .font(.system(size: 20, weight: .semibold))
                    .padding(12)
                    .background(Color.accentColor, in: Circle())
                    .foregroundColor(.white)
            }
            .disabled(isSending || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
    }
}
