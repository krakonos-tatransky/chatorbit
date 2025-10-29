import SwiftUI

struct SessionHomeView: View {
    @StateObject private var viewModel = SessionHomeViewModel()
    @State private var path: [SessionStartContext] = []

    private let ttlOptions: [Int] = [5, 15, 30, 60, 180, 720]
    private let validityOptions: [(value: String, label: String)] = [
        ("1_day", "1 day"),
        ("1_week", "1 week"),
        ("1_month", "1 month"),
        ("1_year", "1 year")
    ]
    private let numberFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .none
        formatter.minimum = 200
        formatter.maximum = 16000
        return formatter
    }()

    private var selectedValidityLabel: String {
        validityOptions.first(where: { $0.value == viewModel.validitySelection })?.label ?? viewModel.validitySelection
    }

    private var sessionLengthOptions: [Int] {
        var options = ttlOptions
        if options.contains(viewModel.sessionMinutes) == false {
            options.append(viewModel.sessionMinutes)
        }
        return options.sorted()
    }

    private func durationLabel(for minutes: Int) -> String {
        if minutes >= 60 {
            let hours = Double(minutes) / 60.0
            if hours.truncatingRemainder(dividingBy: 1) == 0 {
                let wholeHours = Int(hours)
                return "\(wholeHours) \(wholeHours == 1 ? "hour" : "hours")"
            } else {
                return String(format: "%.1f hours", hours)
            }
        }
        return "\(minutes) \(minutes == 1 ? "minute" : "minutes")"
    }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    hero
                    tokenRequestCard
                    joinCard
                    howItWorks
                }
                .padding()
            }
            .navigationDestination(for: SessionStartContext.self) { context in
                SessionView(context: context)
            }
            .navigationTitle("ChatOrbit Sessions")
            .background(Color(uiColor: .systemGroupedBackground))
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Spin up a private two-person chat in seconds")
                .font(.largeTitle.bold())
            Text("Generate a token, share it with your partner, and start an encrypted chat plus video session once both devices connect.")
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.accentColor.opacity(0.1), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var tokenRequestCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Request a new session token")
                .font(.title3.bold())
            Text("Define how long the token stays active and how long the live session should last once both participants connect.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            VStack(alignment: .leading, spacing: 12) {
                Text("Validity window")
                    .font(.footnote.bold())
                    .foregroundStyle(.secondary)
                Picker("Validity", selection: $viewModel.validitySelection) {
                    ForEach(validityOptions, id: \.value) { option in
                        Text(option.label).tag(option.value)
                    }
                }
                .pickerStyle(.wheel)
                .labelsHidden()
                .frame(height: 140)
                .clipped()
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color(uiColor: .secondarySystemBackground))
                )
                Text("Selected: \(selectedValidityLabel)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 12) {
                Text("Session time-to-live (minutes)")
                    .font(.footnote.bold())
                    .foregroundStyle(.secondary)
                Picker("Session length", selection: $viewModel.sessionMinutes) {
                    ForEach(sessionLengthOptions, id: \.self) { value in
                        Text(durationLabel(for: value)).tag(value)
                    }
                }
                .pickerStyle(.wheel)
                .labelsHidden()
                .frame(height: 140)
                .clipped()
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color(uiColor: .secondarySystemBackground))
                )
                Text("Selected: \(durationLabel(for: viewModel.sessionMinutes))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Stepper(value: $viewModel.sessionMinutes, in: 1...1440, step: 1) {
                    Text("Custom: \(viewModel.sessionMinutes) minutes (~\(viewModel.sessionHoursDescription))")
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Message character limit")
                    .font(.footnote.bold())
                    .foregroundStyle(.secondary)
                TextField("Message limit", value: $viewModel.messageLimit, formatter: numberFormatter)
                    .keyboardType(.numberPad)
                    .padding(10)
                    .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            Button {
                Task { await viewModel.issueToken() }
            } label: {
                if viewModel.isRequestingToken {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Text("Generate token")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isRequestingToken)

            if let error = viewModel.requestError {
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
            if let startError = viewModel.startError {
                Text(startError)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }

            if let result = viewModel.issuedToken {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Token")
                            .font(.headline.monospaced())
                        Spacer()
                        Button(action: viewModel.copyToken) {
                            Text(viewModel.tokenCopyFeedback ?? "Copy")
                                .font(.footnote.bold())
                        }
                        .buttonStyle(.bordered)
                    }
                    Text(result.token)
                        .font(.callout.monospaced())
                        .padding(8)
                        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    Text("Valid until \(result.validityExpiresAt.formatted(date: .abbreviated, time: .shortened))")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Button("Start session now") {
                        Task {
                            do {
                                let context = try await viewModel.startSessionFromIssuedToken()
                                path.append(context)
                            } catch {}
                        }
                    }
                    .buttonStyle(.bordered)
                }
                .padding()
                .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
        }
        .padding()
        .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.05), radius: 12, x: 0, y: 4)
    }

    private var joinCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Join with an existing token")
                .font(.title3.bold())
            Text("Paste the token shared with you. The session starts as soon as both participants connect.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            TextField("Token", text: $viewModel.joinToken)
                .textInputAutocapitalization(.never)
                .disableAutocorrection(true)
                .textFieldStyle(.roundedBorder)
            Button {
                Task {
                    do {
                        let context = try await viewModel.joinSession(with: viewModel.joinToken)
                        path.append(context)
                    } catch {}
                }
            } label: {
                if viewModel.isJoining {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Text("Enter session")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isJoining)
            if let joinError = viewModel.joinError {
                Text(joinError)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
        .padding()
        .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.05), radius: 12, x: 0, y: 4)
    }

    private var howItWorks: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("How it works")
                .font(.headline)
            ForEach(1..<4) { index in
                HStack(alignment: .top, spacing: 12) {
                    Circle()
                        .fill(Color.accentColor.opacity(0.2))
                        .frame(width: 32, height: 32)
                        .overlay {
                            Text("\(index)")
                                .font(.callout.bold())
                        }
                    Text(stepDescription(for: index))
                        .font(.subheadline)
                }
            }
            SupportFooterView()
        }
        .padding()
        .background(Color(uiColor: .systemBackground), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.05), radius: 12, x: 0, y: 4)
    }

    private func stepDescription(for index: Int) -> String {
        switch index {
        case 1:
            return "Request a token and configure the activation window plus session countdown."
        case 2:
            return "Share the token with your partner. The first device that joins becomes the host."
        default:
            return "Once both devices connect, encrypted messages and video flow until the timer ends."
        }
    }
}
