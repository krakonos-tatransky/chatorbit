import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | ChatOrbit",
  description:
    "Understand the ground rules for using ChatOrbit, including prohibited conduct and the ephemeral nature of each session.",
};

export default function TermsOfServicePage() {
  const lastUpdated = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <h1>Terms of Service</h1>
        <p className="legal-page__intro">Last updated {lastUpdated}</p>

        <section className="legal-section">
          <h2>1. Purpose</h2>
          <p>
            ChatOrbit enables two people to exchange messages directly between their browsers using peer-to-peer connections.
            Tokens expire quickly, sessions self-destruct, and no server-side archives of chat content are created.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Acceptable Use</h2>
          <p>
            You must use ChatOrbit in compliance with all applicable laws and regulations. The service may not be used to plan,
            commit, or facilitate illegal activity, to distribute malicious software, or to harass, threaten, or defraud other
            people. Violating these rules may result in suspension of access and may be reported to the appropriate authorities.
          </p>
          <p>
            The Communications Decency Act (47 U.S.C. § 230) protects online service providers from liability for the content of
            user communications. By acknowledging these terms, you agree that you—not ChatOrbit—are responsible for the messages
            you send or receive while using the application.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Session Lifecycle</h2>
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
          <h2>4. Privacy and Security</h2>
          <p>
            Messages are exchanged using end-to-end encryption when supported by both browsers. ChatOrbit does not store chat
            content, provide backdoors, or retain decrypted message history. System logs are limited to short-lived operational
            metadata required for security, abuse prevention, and to comply with applicable law.
          </p>
          <p>
            Because the service is peer-to-peer, you are responsible for ensuring that you only share tokens with trusted
            contacts and that your own devices are secure.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Disclaimers</h2>
          <p>
            ChatOrbit is provided on an “as is” and “as available” basis without warranties of any kind. We do not warrant that the
            service will be uninterrupted, secure, or error-free. To the fullest extent permitted by law, we disclaim all implied
            warranties, including merchantability, fitness for a particular purpose, and non-infringement.
          </p>
          <p>
            To the extent allowed by law, our total liability for any claim arising from the service will not exceed the amount you
            paid (if any) to use ChatOrbit in the twelve months preceding the incident.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Changes</h2>
          <p>
            We may update these terms from time to time to reflect new features, legal requirements, or operational changes. If a
            revision is material, we will post an updated notice in the application. Continued use of ChatOrbit after changes take
            effect constitutes acceptance of the revised terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Contact</h2>
          <p>
            Questions about these terms can be sent to
            {" "}
            <a href="mailto:legal@chatorbit.app">legal@chatorbit.app</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
