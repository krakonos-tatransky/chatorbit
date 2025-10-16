import type { Metadata } from "next";
import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/lib/terms-content";

export const metadata: Metadata = {
  title: "Terms of Service | ChatOrbit",
  description:
    "Understand the ground rules for using ChatOrbit, including prohibited conduct and the ephemeral nature of each session.",
};

export default function TermsOfServicePage() {
  return (
    <main className="legal-page">
      <div className="legal-page__inner">
        <h1>Terms of Service</h1>
        <p className="legal-page__intro">Last updated {TERMS_LAST_UPDATED}</p>

        {TERMS_SECTIONS.map((section) => (
          <section key={section.title} className="legal-section">
            <h2>{section.title}</h2>
            {section.body}
          </section>
        ))}
      </div>
    </main>
  );
}
