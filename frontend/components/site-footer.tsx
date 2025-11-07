"use client";

import { useLanguage } from "@/components/language/language-provider";
import { LegalAwareLink } from "@/components/legal/legal-aware-link";

export function SiteFooter() {
  const {
    translations: { footer },
  } = useLanguage();
  const year = new Date().getFullYear().toString();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>{footer.copyright.replace("{year}", year)}</p>
        <nav className="site-footer__links" aria-label="Legal">
          <LegalAwareLink href="/help">{footer.help}</LegalAwareLink>
          <LegalAwareLink href="/terms-of-service">{footer.terms}</LegalAwareLink>
          <LegalAwareLink href="/privacy-policy">{footer.privacy}</LegalAwareLink>
        </nav>
      </div>
    </footer>
  );
}
