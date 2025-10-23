"use client";

import { useCallback, useRef } from "react";

import { JoinSessionCard } from "@/components/join-session-card";
import { TokenRequestCard } from "@/components/token-request-card";

export default function HomePage() {
  const requestCardRef = useRef<HTMLDivElement | null>(null);
  const joinCardRef = useRef<HTMLDivElement | null>(null);
  const joinTokenInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToRequestCard = useCallback(() => {
    requestCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToJoinCard = useCallback(() => {
    joinCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    window.setTimeout(() => {
      joinTokenInputRef.current?.focus({ preventScroll: true });
    }, 350);
  }, []);

  return (
    <main className="page-wrapper">
      <div className="page-inner">
        <header className="hero">
          <span className="hero__badge">ChatOrbit Sessions</span>
          <h1 className="hero__title">Spin up a private two-person chat in seconds</h1>
          <div className="hero__actions" aria-label="Get started">
            <button type="button" className="button button--cyan hero__action-button" onClick={scrollToRequestCard}>
              Need token
            </button>
            <button type="button" className="button button--indigo hero__action-button" onClick={scrollToJoinCard}>
              Have token
            </button>
          </div>
          <p className="hero__subtitle">
            Generate a shareable access token, send it to your contact, and meet in an ephemeral chat room. Once the second device
            connects a secure countdown begins—when it reaches zero the session closes itself.
          </p>
        </header>

        <section className="section-grid">
          <div ref={requestCardRef} id="token-request-card">
            <TokenRequestCard />
          </div>
          <div ref={joinCardRef} id="join-session-card">
            <JoinSessionCard tokenInputRef={joinTokenInputRef} />
          </div>
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
