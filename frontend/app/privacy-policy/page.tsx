import type { Metadata } from "next";

import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";

export const metadata: Metadata = {
  title: "Privacy Policy | ChatOrbit",
  description: "Learn how ChatOrbit handles peer-to-peer messaging data, encryption, and session metadata.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <PrivacyPolicyContent className="legal-page__inner" />
    </main>
  );
}
