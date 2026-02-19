"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";

import { JoinSessionCard } from "@/components/join-session-card";
import { TokenRequestCard } from "@/components/token-request-card";
import { useLanguage } from "@/components/language/language-provider";

const APP_STORE_URL = "https://apps.apple.com/za/app/chatorbit-secure-chat/id6759070105";

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

        <section className="app-download-card">
          <div className="app-download-card__content">
            <h2>{home.mobileApp.title}</h2>
            <p>{home.mobileApp.subtitle}</p>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="app-store-badge"
              aria-label={home.mobileApp.downloadButton}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span className="app-store-badge__text">
                <span className="app-store-badge__label">{home.mobileApp.downloadButton}</span>
              </span>
            </a>
          </div>
          <div className="app-download-card__qr">
            <Image
              src="/appstore-qr.png"
              alt="App Store QR code"
              width={140}
              height={140}
              className="app-download-card__qr-img"
            />
            <span className="app-download-card__qr-label">{home.mobileApp.scanQr}</span>
          </div>
        </section>
      </div>
    </main>
  );
}
