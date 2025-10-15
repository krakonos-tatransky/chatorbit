import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | ChatOrbit",
  description: "Learn how ChatOrbit handles peer-to-peer messaging data, encryption, and session metadata.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <h1>Privacy Policy</h1>
        <p className="legal-page__intro">Last updated {lastUpdated}</p>

        <section className="legal-section">
          <h2>1. Overview</h2>
          <p>
            ChatOrbit is designed for private, ephemeral conversations. Messages flow directly between participants using
            peer-to-peer technology. When supported by both browsers we negotiate end-to-end encryption so that only the people
            in the session can read the content.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Data We Process</h2>
          <ul className="legal-list">
            <li>
              <strong>Token issuance logs:</strong> We temporarily record an IP address or client identifier to enforce the
              one-hour rate limit for generating session tokens.
            </li>
            <li>
              <strong>Session metadata:</strong> The database stores the token value, expiration timestamps, countdown settings,
              and anonymised participant identifiers. This metadata is required to coordinate the countdown timer and to show who
              is connected. We never store message bodies or encryption keys.
            </li>
            <li>
              <strong>Diagnostic events:</strong> If you opt into client debugging, limited technical details may be written to
              your local device to help troubleshoot WebRTC connectivity.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Session Deletion and Retention</h2>
          <p>
            Messages are not retained on our servers. When a session ends automatically or when a participant presses the “End
            session” button, the session is marked as deleted in the database, connected peers are notified, and the token can no
            longer be used. Residual metadata is purged according to operational retention schedules required for security and
            abuse prevention.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. International & GDPR Considerations</h2>
          <p>
            Because ChatOrbit does not store message content and only retains minimal operational data, we act as a data
            controller for the limited personal data described above. The lawful basis for processing is legitimate interest in
            operating a secure communications platform. You may request access to, correction of, or deletion of identifiable data
            linked to a token by contacting us at
            {" "}
            <a href="mailto:privacy@chatorbit.app">privacy@chatorbit.app</a>.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Security</h2>
          <p>
            We apply industry-standard security practices to protect the infrastructure that brokers session setup, including
            transport-layer encryption, hardened hosting environments, and monitoring for abuse. Because communication is peer to
            peer, we do not have visibility into or control over the content of your messages.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Your Choices</h2>
          <p>
            Participation is voluntary. You can decline to create a session, end an active session at any time, or choose not to
            share a token that you generated. Clearing your browser storage will remove local debugging artifacts created by the
            application.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Updates</h2>
          <p>
            We may revise this policy when functionality or legal requirements change. We will highlight material updates inside
            the product. Continuing to use ChatOrbit after an update becomes effective means you accept the revised policy.
          </p>
        </section>
      </div>
    </main>
  );
}
