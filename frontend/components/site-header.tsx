"use client";

import Image from "next/image";
import { useState } from "react";

import { LegalAwareLink } from "@/components/legal/legal-aware-link";

const CHAT_ORBIT_LOGO_URL = "/brand/chat-orbit-logo.svg";

const NAV_ITEMS = [
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/privacy-policy", label: "Privacy Policy" },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <LegalAwareLink href="/" className="site-logo" onClick={closeMenu}>
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
        <button
          type="button"
          className="site-nav__toggle"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          onClick={toggleMenu}
        >
          <svg
            aria-hidden
            className="site-nav__toggle-icon"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        </button>
        <nav
          className={`site-nav${isMenuOpen ? " site-nav--open" : ""}`}
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => (
            <LegalAwareLink
              key={item.href}
              href={item.href}
              onClick={closeMenu}
            >
              {item.label}
            </LegalAwareLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
