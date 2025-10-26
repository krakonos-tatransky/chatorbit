import SwiftUI

struct ReportAbusePayload {
    var email: String
    var summary: String
    var questionnaire: ReportAbuseQuestionnaire
}

struct ReportAbuseView: View {
    @Binding var isPresented: Bool
    var onSubmit: (ReportAbusePayload) -> Void

    @State private var email: String = ""
    @State private var summary: String = ""
    @State private var immediateThreat: Bool = false
    @State private var involvesCriminalActivity: Bool = false
    @State private var requiresFollowUp: Bool = false
    @State private var additionalDetails: String = ""

    var body: some View {
        Form {
            Section("Contact") {
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .disableAutocorrection(true)
            }

            Section("Summary") {
                TextEditor(text: $summary)
                    .frame(minHeight: 100)
            }

            Section("Checklist") {
                Toggle("Immediate threat", isOn: $immediateThreat)
                Toggle("May involve criminal activity", isOn: $involvesCriminalActivity)
                Toggle("I can provide follow-up details", isOn: $requiresFollowUp)
            }

            Section("Additional details") {
                TextEditor(text: $additionalDetails)
                    .frame(minHeight: 80)
            }
        }
        .navigationTitle("Report abuse")
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Cancel") { isPresented = false }
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Submit") {
                    let questionnaire = ReportAbuseQuestionnaire(
                        immediateThreat: immediateThreat,
                        involvesCriminalActivity: involvesCriminalActivity,
                        requiresFollowUp: requiresFollowUp,
                        additionalDetails: additionalDetails.isEmpty ? nil : additionalDetails
                    )
                    let payload = ReportAbusePayload(
                        email: email,
                        summary: summary,
                        questionnaire: questionnaire
                    )
                    onSubmit(payload)
                    isPresented = false
                }
                .disabled(ReportAbuseFormValidator.canSubmit(email: email, summary: summary) == false)
            }
        }
    }
}
