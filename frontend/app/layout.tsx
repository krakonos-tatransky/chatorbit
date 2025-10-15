import "./globals.css";
import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ChatOrbit",
  description:
    "Issue temporary tokens and meet privately in a peer-style chat session with a countdown timer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <div className="site-header__inner">
              <Link href="/" className="site-logo">
                <span className="site-logo__mark" aria-hidden>
                  <Image
                    src="/brand/chat-orbit-shield-logo.svg"
                    alt=""
                    width={40}
                    height={40}
                    priority
                  />
                </span>
                <span className="site-logo__text">ChatOrbit</span>
              </Link>
              <nav className="site-nav" aria-label="Primary">
                <Link href="/terms-of-service">Terms of Service</Link>
                <Link href="/privacy-policy">Privacy Policy</Link>
              </nav>
            </div>
          </header>
          <div className="site-content">{children}</div>
          <footer className="site-footer">
            <div className="site-footer__inner">
              <p>© {year} ChatOrbit. Peer-to-peer chat without server-side archives.</p>
              <nav className="site-footer__links" aria-label="Legal">
                <Link href="/terms-of-service">Terms</Link>
                <Link href="/privacy-policy">Privacy</Link>
              </nav>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
