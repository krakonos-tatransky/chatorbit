import type { ReactNode } from "react";

import { LegalOverlayBoundary } from "@/components/legal/legal-overlay-provider";

export default function SessionLayout({ children }: { children: ReactNode }) {
  return <LegalOverlayBoundary>{children}</LegalOverlayBoundary>;
}
