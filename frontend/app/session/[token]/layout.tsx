import type { ReactNode } from "react";

import { LegalOverlayBoundary } from "@/components/legal/legal-overlay-provider";
import { PreventNavigationPrompt } from "@/components/prevent-navigation-prompt";

export default function SessionLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PreventNavigationPrompt />
      <LegalOverlayBoundary>{children}</LegalOverlayBoundary>
    </>
  );
}
