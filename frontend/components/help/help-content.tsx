"use client";

import { createElement } from "react";

import { useLanguage } from "@/components/language/language-provider";
import { getHelpTranslation } from "@/lib/i18n/translations";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type HelpContentProps = {
  headingLevel?: HeadingTag;
  sectionHeadingLevel?: HeadingTag;
  cardHeadingLevel?: HeadingTag;
  headingId?: string;
  showHeading?: boolean;
};

export function HelpContent({
  headingLevel = "h1",
  sectionHeadingLevel,
  cardHeadingLevel,
  headingId = "help-page-title",
  showHeading = true,
}: HelpContentProps) {
  const { language } = useLanguage();
  const { heading, intro, troubleshootingTitle, troubleshootingDescription, sections } = getHelpTranslation(language);
  const HeadingTag = headingLevel;
  const SectionHeadingTag: HeadingTag = sectionHeadingLevel ?? (headingLevel === "h1" ? "h2" : "h3");
  const CardHeadingTag: HeadingTag = cardHeadingLevel ?? (SectionHeadingTag === "h2" ? "h3" : "h4");

  return (
    <>
      <div className="help-page__intro">
        {showHeading ? createElement(HeadingTag, { id: headingId }, heading) : null}
        <p>{intro}</p>
      </div>
      <section className="help-page__topic" aria-labelledby="video-troubleshooting">
        {createElement(SectionHeadingTag, { id: "video-troubleshooting" }, troubleshootingTitle)}
        <p>{troubleshootingDescription}</p>
        <div className="help-page__topics">
          {sections.map((section) => (
            <article key={section.id} className="help-page__card">
              {createElement(CardHeadingTag, { id: `help-${section.id}` }, section.title)}
              <ol>
                {section.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
