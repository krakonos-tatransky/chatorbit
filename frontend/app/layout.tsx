import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LegalAwareLink } from "@/components/legal/legal-aware-link";
import { LegalOverlayProvider } from "@/components/legal/legal-overlay-provider";
import { SiteHeader } from "@/components/site-header";

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
            <SiteHeader />
            <div className="site-content">{children}</div>
            <footer className="site-footer">
              <div className="site-footer__inner">
                <p>© {year} ChatOrbit. Peer-to-peer chat without server-side archives.</p>
                <nav className="site-footer__links" aria-label="Legal">
                  <LegalAwareLink href="/help">Help</LegalAwareLink>
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
