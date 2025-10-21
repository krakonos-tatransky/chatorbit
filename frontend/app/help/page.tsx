import type { Metadata } from "next";

import { HelpContent } from "@/components/help/help-content";

export const metadata: Metadata = {
  title: "Help & FAQ | ChatOrbit",
  description:
    "Troubleshoot video calls and learn how to enable camera and microphone access for ChatOrbit on iPhone, Android, and desktop browsers.",
};

export default function HelpPage() {
  return (
    <main className="help-page" aria-labelledby="help-page-title">
      <HelpContent headingLevel="h1" headingId="help-page-title" showHeading />
    </main>
  );
}
