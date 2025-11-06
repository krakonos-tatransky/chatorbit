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
    <main className="page-wrapper page-wrapper--ios">
      <div className="page-inner">
        <header className="hero ios-hero">
          <div className="ios-hero__status-bar" aria-hidden="true">
            <span className="ios-hero__status-time">9:41</span>
            <div className="ios-hero__status-icons">
              <span className="ios-hero__status-icon ios-hero__status-icon--signal" />
              <span className="ios-hero__status-icon ios-hero__status-icon--wifi" />
              <span className="ios-hero__status-icon ios-hero__status-icon--battery" />
            </div>
          </div>
          <div className="ios-hero__dynamic-island" aria-hidden="true">
            <span className="ios-hero__pill ios-hero__pill--primary">Session ready</span>
            <span className="ios-hero__pill">Secure relay</span>
          </div>
          <div className="ios-hero__content">
            <span className="hero__badge ios-hero__badge">ChatOrbit Sessions</span>
            <h1 className="hero__title ios-hero__title">Spin up a private two-person chat in seconds</h1>
            <p className="hero__subtitle ios-hero__subtitle">
              Generate a shareable access token, send it to your contact, and meet in an ephemeral chat room. Once the second
              device connects a secure countdown begins—when it reaches zero the session closes itself.
            </p>
            <div className="ios-hero__cta-stack" aria-label="Get started">
              <button type="button" className="button button--cyan hero__action-button ios-button" onClick={scrollToRequestCard}>
                Need token
              </button>
              <button
                type="button"
                className="button button--indigo hero__action-button ios-button ios-button--outline"
                onClick={scrollToJoinCard}
              >
                Have token
              </button>
            </div>
          </div>
          <div className="ios-hero__device" aria-hidden="true">
            <div className="ios-hero__device-frame">
              <div className="ios-hero__device-screen">
                <div className="ios-hero__device-header">
                  <span className="ios-hero__device-title">Token Concierge</span>
                  <span className="ios-hero__device-caption">Tap to mint and share securely</span>
                </div>
                <div className="ios-hero__device-cards">
                  <div className="ios-hero__device-card ios-hero__device-card--primary">
                    <span className="ios-hero__device-card-label">Mint token</span>
                    <span className="ios-hero__device-card-value">~12s</span>
                  </div>
                  <div className="ios-hero__device-card">
                    <span className="ios-hero__device-card-label">Pair devices</span>
                    <span className="ios-hero__device-card-value">Secure relay</span>
                  </div>
                  <div className="ios-hero__device-card">
                    <span className="ios-hero__device-card-label">Countdown</span>
                    <span className="ios-hero__device-card-value">Auto-close</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
