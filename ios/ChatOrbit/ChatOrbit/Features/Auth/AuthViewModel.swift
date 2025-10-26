import Foundation

struct ReportAbuseFormValidator {
    static func canSubmit(email: String, summary: String) -> Bool {
        guard summary.count >= 10 else { return false }
        return email.range(of: "^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", options: [.regularExpression, .caseInsensitive]) != nil
    }
}
