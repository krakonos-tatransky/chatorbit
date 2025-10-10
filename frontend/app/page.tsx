import { JoinSessionCard } from "@/components/join-session-card";
import { TokenRequestCard } from "@/components/token-request-card";

export default function HomePage() {
  return (
    <main className="page-wrapper">
      <div className="page-inner">
        <header className="hero">
          <span className="hero__badge">ChatOrbit Sessions</span>
          <h1 className="hero__title">Spin up a private two-person chat in seconds</h1>
          <p className="hero__subtitle">
            Generate a shareable access token, send it to your contact, and meet in an ephemeral chat room. Once the second device
            connects a secure countdown begins—when it reaches zero the session closes itself.
          </p>
        </header>

        <section className="section-grid">
          <TokenRequestCard />
          <JoinSessionCard />
        </section>

        <section className="meta-card">
          <h2>How it works</h2>
          <ol>
            <li>
              <span className="meta-number">1</span>
              <span>
                Request a token and choose the activation window plus the countdown for the live session.
              </span>
            </li>
            <li>
              <span className="meta-number meta-number--indigo">2</span>
              <span>Share the token however you like. The first partner to log in reserves the host seat.</span>
            </li>
            <li>
              <span className="meta-number meta-number--emerald">3</span>
              <span>
                Once both devices connect, message bundles flow directly with end-to-end encryption and a live timer.
              </span>
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
