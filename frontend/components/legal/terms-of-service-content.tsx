import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/lib/terms-content";

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
  const HeadingTag = headingLevel === "h1" ? "h1" : "h2";

  return (
    <div className={className}>
      {showHeading ? <HeadingTag>Terms of Service</HeadingTag> : null}
      <p className="legal-page__intro">Last updated {TERMS_LAST_UPDATED}</p>

      {TERMS_SECTIONS.map((section) => (
        <section key={section.title} className="legal-section">
          <h2>{section.title}</h2>
          {section.body}
        </section>
      ))}
    </div>
  );
}
