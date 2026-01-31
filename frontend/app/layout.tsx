import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";

import { LegalOverlayProvider } from "@/components/legal/legal-overlay-provider";
import { LanguageProvider } from "@/components/language/language-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SidebarAds } from "@/components/ads";

const CHAT_ORBIT_LOGO_URL = "/brand/chat-orbit-logo.svg";
// Master switch for AdSense - must be explicitly set to "true" to enable
const ADSENSE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ADSENSE === "true";
const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "";

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
      <head>
        {/* Only load AdSense if explicitly enabled via NEXT_PUBLIC_ENABLE_ADSENSE=true */}
        {ADSENSE_ENABLED && ADSENSE_PUBLISHER_ID && (
          <>
            <meta name="google-adsense-account" content={ADSENSE_PUBLISHER_ID} />
            <Script
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
          </>
        )}
      </head>
      <body>
        <LanguageProvider>
          <LegalOverlayProvider>
            <div className="site-shell">
              <SiteHeader />
              <div className="site-content">{children}</div>
              <SiteFooter />
            </div>
            <SidebarAds />
          </LegalOverlayProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
