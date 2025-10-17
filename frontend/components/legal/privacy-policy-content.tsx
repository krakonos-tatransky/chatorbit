const LAST_UPDATED = "October 14, 2025";

type HeadingLevel = "h1" | "h2";

type PrivacyPolicyContentProps = {
  className?: string;
  headingLevel?: HeadingLevel;
  showHeading?: boolean;
};

export function PrivacyPolicyContent({
  className,
  headingLevel = "h1",
  showHeading = true,
}: PrivacyPolicyContentProps) {
  const HeadingTag = headingLevel === "h1" ? "h1" : "h2";

  return (
    <div className={className}>
      {showHeading ? <HeadingTag>Privacy Policy</HeadingTag> : null}
      <p className="legal-page__intro">Last updated {LAST_UPDATED}</p>

      <section className="legal-section">
        <h2>1. Our Commitment to Privacy</h2>
        <p>
          ChatOrbit is designed to prioritize private, ephemeral conversations. The Service connects participants using
          peer-to-peer WebRTC technology so that messages flow directly between devices. When supported by both browsers, end
          to end encryption keeps message content accessible only to intended recipients.
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Information We Collect</h2>
        <ul className="legal-list">
          <li>
            <strong>Session metadata:</strong> We temporarily process session tokens, participant identifiers, countdown
            configuration, and connection status to coordinate joins and show who is connected.
          </li>
          <li>
            <strong>Signaling details:</strong> Our signaling server exchanges ICE candidates and WebSocket messages needed to
            establish a connection. These messages may include IP addresses and browser networking information.
          </li>
          <li>
            <strong>STUN/TURN authentication:</strong> Third-party relay services receive short-lived nonces (valid for 600
            seconds) and IP addresses strictly to facilitate NAT traversal.
          </li>
          <li>
            <strong>Optional diagnostics:</strong> If you opt into client debugging, limited technical logs may be saved to your
            local device to troubleshoot connectivity issues.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. How We Use Your Information</h2>
        <p>
          The information described above is used solely to facilitate peer-to-peer connections, authenticate legitimate
          access to STUN/TURN servers, monitor whether a session remains active, and protect the Service from abuse. We do not
          profile users or use data for advertising.
        </p>
      </section>

      <section className="legal-section">
        <h2>4. End-to-End Encryption</h2>
        <p>
          When supported, ChatOrbit negotiates AES-GCM encryption with keys derived from session tokens directly on users'
          devices. We do not receive these keys and cannot decrypt message content. If encryption is not available in one or
          both browsers, messages are transmitted unencrypted and the application alerts participants.
        </p>
      </section>

      <section className="legal-section">
        <h2>5. No Message Storage</h2>
        <p>
          Message content is never stored on our servers. Messages exist only in the memory of participating devices during an
          active session and disappear when the session ends or the application closes. This design means we cannot retrieve or
          provide message history to third parties, including law enforcement.
        </p>
      </section>

      <section className="legal-section">
        <h2>6. Data Sharing</h2>
        <p>
          We do not sell or rent information to third parties. Session metadata may be disclosed only when required by law or
          to protect the safety and security of users. Because we do not store message content, we cannot provide it in
          response to legal requests.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. Data Retention</h2>
        <p>
          Session metadata and signaling data are retained only as long as needed to operate the Service or comply with
          applicable legal obligations. When a session ends or is manually deleted, related metadata is purged according to
          operational retention schedules. No message bodies or encryption keys are retained.
        </p>
      </section>

      <section className="legal-section">
        <h2>8. Compliance with Data Protection Laws</h2>
        <p>
          We strive to comply with applicable data protection laws, including the GDPR and CCPA. ChatOrbit collects only the
          data necessary to establish peer-to-peer sessions and does not use personal data for profiling. If you are in the
          European Union, you may request access to, rectification of, or deletion of identifiable data linked to a session by
          contacting us at <a href="mailto:privacy@chatorbit.com">privacy@chatorbit.com</a>.
        </p>
      </section>

      <section className="legal-section">
        <h2>9. Security</h2>
        <p>
          We implement industry-standard security measures to protect signaling infrastructure, including secure WebSocket
          transport, hardened hosting environments, monitoring for abuse, and TURN server authentication using expiring
          nonces. You are responsible for securing your own device and ensuring it remains free of malware.
        </p>
      </section>

      <section className="legal-section">
        <h2>10. Third-Party Services</h2>
        <p>
          The Service relies on third-party STUN/TURN providers to relay traffic when direct connections are not possible.
          These providers see network-level information necessary to deliver the Service but do not have access to message
          content. We select reputable vendors and configure them with security best practices.
        </p>
      </section>

      <section className="legal-section">
        <h2>11. Your Choices</h2>
        <p>
          Participation in ChatOrbit is voluntary. You can end a session at any time, choose not to share a session token, or
          decline to use the Service. Clearing your browser storage will remove local diagnostic artifacts created by the
          application.
        </p>
      </section>

      <section className="legal-section">
        <h2>12. Changes to This Privacy Policy</h2>
        <p>
          We may revise this Privacy Policy to reflect changes in our practices or legal requirements. Updated policies will be
          posted on this page with a revised "Last updated" date. Continued use of ChatOrbit after changes take effect
          constitutes acceptance of the revised policy.
        </p>
      </section>

      <section className="legal-section">
        <h2>13. Contact Us</h2>
        <p>
          Questions about this Privacy Policy or our data practices can be sent to <a href="mailto:privacy@chatorbit.com">
            privacy@chatorbit.com
          </a>.
        </p>
      </section>
    </div>
  );
}
