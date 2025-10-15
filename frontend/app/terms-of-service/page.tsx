import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | ChatOrbit",
  description:
    "Understand the ground rules for using ChatOrbit, including prohibited conduct and the ephemeral nature of each session.",
};

export default function TermsOfServicePage() {
  const lastUpdated = "October 14, 2025";
  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <h1>Terms of Service</h1>
        <p className="legal-page__intro">Last updated {lastUpdated}</p>

        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using ChatOrbit (the "Service"), you agree to these Terms of Service. You must be at least 18 years
            old or have the legal capacity to enter into a binding agreement. If you do not agree, you may not use the Service.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Description of Service</h2>
          <p>
            ChatOrbit is a peer-to-peer communication platform that connects participants directly using WebRTC technology.
            Messages travel straight between browsers without being stored on our servers. When supported by both browsers, end
            to end encryption using AES-GCM with keys derived from session tokens ensures that only the intended recipients can
            read the content.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Prohibited Uses</h2>
          <p>You agree that you will not use the Service to:</p>
          <ul className="legal-list">
            <li>Engage in illegal activity or violate any applicable law or regulation.</li>
            <li>Harass, threaten, defame, or otherwise harm other users.</li>
            <li>Transmit malware, viruses, or other harmful code.</li>
            <li>Bypass or undermine security, encryption, or authentication mechanisms.</li>
            <li>Impersonate another person or entity or submit false information.</li>
          </ul>
          <p>Any violation may result in immediate termination of access without notice.</p>
        </section>

        <section className="legal-section">
          <h2>4. Session Lifecycle</h2>
          <ul className="legal-list">
            <li>Tokens can only be claimed within their activation window and expire automatically afterwards.</li>
            <li>
              Once two participants connect, a countdown begins. When it reaches zero, the session closes itself and cannot be
              reopened.
            </li>
            <li>
              Either participant may actively end a session at any time. When you choose to end a session, it is flagged as
              deleted in the database, all participants are notified, and the token can no longer be reused.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. No Message Storage or Backdoors</h2>
          <p>
            ChatOrbit does not store message content or encryption keys. Messages exist only in device memory during an active
            session. The Service is designed without backdoors or mechanisms that would allow us to decrypt messages. Signaling
            servers may temporarily process metadata such as session tokens, participant identifiers, and connection status to
            facilitate communication, but this information is not retained longer than necessary.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. User Responsibilities</h2>
          <p>
            You are solely responsible for your use of the Service and for the content you share. You must comply with all laws
            regarding data protection, privacy, and electronic communications. Because communications are peer to peer, you
            should only share session tokens with trusted parties and must secure your devices against unauthorized access.
          </p>
          <p>
            The Communications Decency Act (47 U.S.C. § 230) protects online services from liability for user-generated content.
            By using ChatOrbit you acknowledge that you—not ChatOrbit—are responsible for the messages you send and receive.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Intellectual Property</h2>
          <p>
            The Service, including code, design, and documentation, is the property of ChatOrbit and its licensors. You may not
            copy, modify, distribute, reverse engineer, or create derivative works except as permitted by applicable open-source
            licenses or with our prior written consent.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Disclaimer of Warranties</h2>
          <p>
            The Service is provided on an "as is" and "as available" basis without warranties of any kind, whether express or
            implied, including merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that
            the Service will be uninterrupted, secure, or error free.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, ChatOrbit will not be liable for any direct, indirect, incidental,
            consequential, or punitive damages arising from or related to your use of the Service, including loss of data,
            privacy breaches, or illegal activity conducted by users. Our aggregate liability will not exceed the amount you paid
            (if any) in the twelve months preceding the claim.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless ChatOrbit, its affiliates, and agents from any claims, liabilities,
            damages, or expenses (including legal fees) arising from your use of the Service or violation of these Terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Termination</h2>
          <p>
            We may suspend or terminate your access to the Service at our discretion, with or without notice, for any reason
            including suspected violations of these Terms or unlawful conduct.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Governing Law</h2>
          <p>
            These Terms are governed by the laws of California, USA, without regard to conflict of law principles. You agree to
            submit to the exclusive jurisdiction of the state and federal courts located in California for resolution of any
            dispute related to the Service.
          </p>
        </section>

        <section className="legal-section">
          <h2>13. Changes to Terms</h2>
          <p>
            We may update these Terms to reflect new features, legal requirements, or operational changes. When revisions are
            material we will post an updated notice in the application. Continued use of ChatOrbit after changes take effect
            constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>14. Contact</h2>
          <p>
            Questions about these terms can be sent to <a href="mailto:legal@chatorbit.com">legal@chatorbit.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
