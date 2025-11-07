"use client";

import { useLanguage } from "@/components/language/language-provider";
import { getTermsTranslation } from "@/lib/i18n/translations";

type HeadingLevel = "h1" | "h2";

type TermsOfServiceContentProps = {
  className?: string;
  headingLevel?: HeadingLevel;
  showHeading?: boolean;
};

export function TermsOfServiceContent({
  className,
  headingLevel = "h1",
  showHeading = true,
}: TermsOfServiceContentProps) {
  const {
    language,
    translations: { legalPages },
  } = useLanguage();
  const { lastUpdated, sections } = getTermsTranslation(language);
  const HeadingTag = headingLevel === "h1" ? "h1" : "h2";

  return (
    <div className={className}>
      {showHeading ? <HeadingTag>{legalPages.termsTitle}</HeadingTag> : null}
      <p className="legal-page__intro">{legalPages.lastUpdated.replace("{date}", lastUpdated)}</p>

      {sections.map((section) => (
        <section key={section.title} className="legal-section">
          <h2>{section.title}</h2>
          {section.body}
        </section>
      ))}
    </div>
  );
}
