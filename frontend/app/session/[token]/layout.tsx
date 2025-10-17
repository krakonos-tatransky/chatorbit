import type { ReactNode } from "react";

import { LegalOverlayProvider } from "@/components/legal/legal-overlay-provider";

export default function SessionLayout({ children }: { children: ReactNode }) {
  return <LegalOverlayProvider>{children}</LegalOverlayProvider>;
}
