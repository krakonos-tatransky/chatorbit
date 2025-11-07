"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { usePathname } from "next/navigation";

import { LegalAwareLink } from "@/components/legal/legal-aware-link";
import { LanguageSwitcher } from "@/components/language/language-switcher";
import { useLanguage } from "@/components/language/language-provider";

const CHAT_ORBIT_LOGO_URL = "/brand/chat-orbit-logo.svg";

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const [search, setSearch] = useState<string | null>(null);
  const {
    translations: { navigation },
  } = useLanguage();
  const isSessionPage = pathname?.startsWith("/session/") ?? false;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setSearch(window.location.search);
  }, [pathname]);

  const reportAbuseLink = useMemo(() => {
    if (!pathname?.startsWith("/session/")) {
      return null;
    }
    const params = new URLSearchParams(search ?? undefined);
    params.set("reportAbuse", "1");
    const query = params.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, search]);

  const baseNavItems = useMemo(
    () => [
      { href: "/help", label: navigation.help },
      { href: "/terms-of-service", label: navigation.terms },
      { href: "/privacy-policy", label: navigation.privacy },
    ],
    [navigation.help, navigation.privacy, navigation.terms],
  );

  const navItems = useMemo(() => {
    if (!reportAbuseLink) {
      return baseNavItems;
    }
    return [...baseNavItems, { href: reportAbuseLink, label: navigation.reportAbuse }];
  }, [baseNavItems, navigation.reportAbuse, reportAbuseLink]);

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
        <div className="site-header__timer-slot" id="site-header-timer" />
        <div className="site-header__nav-group">
          <LanguageSwitcher hideOnMobile={isSessionPage} />
          <button
            type="button"
            className="site-nav__toggle"
            aria-label={isMenuOpen ? navigation.closeMenu : navigation.openMenu}
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
            {navItems.map((item) => (
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
      </div>
    </header>
  );
}
