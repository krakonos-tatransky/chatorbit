"use client";

import { useCallback, useRef } from "react";

import { JoinSessionCard } from "@/components/join-session-card";
import { TokenRequestCard } from "@/components/token-request-card";
import { useLanguage } from "@/components/language/language-provider";

export default function HomePage() {
  const {
    translations: { home },
  } = useLanguage();
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
          <span className="hero__badge">{home.heroBadge}</span>
          <h1 className="hero__title">{home.heroTitle}</h1>
          <div className="hero__actions" aria-label="Get started">
            <button type="button" className="button button--cyan hero__action-button" onClick={scrollToRequestCard}>
              {home.needToken}
            </button>
            <button type="button" className="button button--indigo hero__action-button" onClick={scrollToJoinCard}>
              {home.haveToken}
            </button>
          </div>
          <p className="hero__subtitle">{home.heroSubtitle}</p>
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
          <h2>{home.howItWorks}</h2>
          <ol>
            <li>
              <span className="meta-number">1</span>
              <span>{home.steps[0]}</span>
            </li>
            <li>
              <span className="meta-number meta-number--indigo">2</span>
              <span>{home.steps[1]}</span>
            </li>
            <li>
              <span className="meta-number meta-number--emerald">3</span>
              <span>{home.steps[2]}</span>
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
