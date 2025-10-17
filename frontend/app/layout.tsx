import "./globals.css";
import Image from "next/image";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LegalAwareLink } from "@/components/legal/legal-aware-link";
import { LegalOverlayProvider } from "@/components/legal/legal-overlay-provider";

const CHAT_ORBIT_LOGO_URL = "/brand/chat-orbit-logo.svg";

export const metadata: Metadata = {
  title: "ChatOrbit",
  description:
    "Issue temporary tokens and meet privately in a peer-style chat session with a countdown timer.",
  icons: {
    icon: CHAT_ORBIT_LOGO_URL,
    shortcut: CHAT_ORBIT_LOGO_URL,
    apple: CHAT_ORBIT_LOGO_URL,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <html lang="en">
      <body>
        <LegalOverlayProvider>
          <div className="site-shell">
            <header className="site-header">
              <div className="site-header__inner">
                <LegalAwareLink href="/" className="site-logo">
                  <span className="site-logo__mark" aria-hidden>
                    <Image
                      src={CHAT_ORBIT_LOGO_URL}
                      alt=""
                      width={88}
                      height={88}
                      sizes="(max-width: 540px) 34px, 44px"
                      priority
                    />
                  </span>
                  <span className="site-logo__text">ChatOrbit</span>
                </LegalAwareLink>
                <nav className="site-nav" aria-label="Primary">
                  <LegalAwareLink href="/terms-of-service">Terms of Service</LegalAwareLink>
                  <LegalAwareLink href="/privacy-policy">Privacy Policy</LegalAwareLink>
                </nav>
              </div>
            </header>
            <div className="site-content">{children}</div>
            <footer className="site-footer">
              <div className="site-footer__inner">
                <p>© {year} ChatOrbit. Peer-to-peer chat without server-side archives.</p>
                <nav className="site-footer__links" aria-label="Legal">
                  <LegalAwareLink href="/terms-of-service">Terms</LegalAwareLink>
                  <LegalAwareLink href="/privacy-policy">Privacy</LegalAwareLink>
                </nav>
              </div>
            </footer>
          </div>
        </LegalOverlayProvider>
      </body>
    </html>
  );
}
