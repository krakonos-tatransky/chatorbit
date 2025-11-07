"use client";

import { useLanguage } from "@/components/language/language-provider";
import { getPrivacyTranslation } from "@/lib/i18n/translations";

type HeadingLevel = "h1" | "h2";

type PrivacyPolicyContentProps = {
  className?: string;
  headingLevel?: HeadingLevel;
  showHeading?: boolean;
};

export function PrivacyPolicyContent({
  className,
  headingLevel = "h1",
  showHeading = true,
}: PrivacyPolicyContentProps) {
  const {
    language,
    translations: { legalPages },
  } = useLanguage();
  const { lastUpdated, sections } = getPrivacyTranslation(language);
  const HeadingTag = headingLevel === "h1" ? "h1" : "h2";

  return (
    <div className={className}>
      {showHeading ? <HeadingTag>{legalPages.privacyTitle}</HeadingTag> : null}
      <p className="legal-page__intro">{legalPages.lastUpdated.replace("{date}", lastUpdated)}</p>

      {sections.map((section, index) => (
        <section key={`${section.title}-${index}`} className="legal-section">
          <h2>{section.title}</h2>
          {section.body}
        </section>
      ))}
    </div>
  );
}
