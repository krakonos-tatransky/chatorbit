import type { Metadata } from "next";

import { TermsOfServiceContent } from "@/components/legal/terms-of-service-content";

export const metadata: Metadata = {
  title: "Terms of Service | ChatOrbit",
  description:
    "Understand the ground rules for using ChatOrbit, including prohibited conduct and the ephemeral nature of each session.",
};

export default function TermsOfServicePage() {
  return (
    <main className="legal-page">
      <TermsOfServiceContent className="legal-page__inner" />
    </main>
  );
}
