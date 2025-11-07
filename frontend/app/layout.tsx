import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LegalOverlayProvider } from "@/components/legal/legal-overlay-provider";
import { LanguageProvider } from "@/components/language/language-provider";
import { SiteFooter } from "@/components/site-footer";
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
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <LegalOverlayProvider>
            <div className="site-shell">
              <SiteHeader />
              <div className="site-content">{children}</div>
              <SiteFooter />
            </div>
          </LegalOverlayProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
