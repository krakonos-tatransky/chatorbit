"use client";

import { AdUnit } from "./ad-unit";

const SIDEBAR_AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT || "";

/**
 * Sidebar ads that appear on both sides of the main content.
 * Only visible on desktop screens (>= 1400px wide).
 * Uses the same ad slot for both sides - Google will serve appropriate ads.
 */
export function SidebarAds() {
  if (!SIDEBAR_AD_SLOT) {
    return null;
  }

  return (
    <>
      <aside className="sidebar-ad sidebar-ad--left" aria-label="Advertisement">
        <AdUnit
          slot={SIDEBAR_AD_SLOT}
          format="auto"
          responsive={true}
          style={{ display: "block" }}
        />
      </aside>
      <aside className="sidebar-ad sidebar-ad--right" aria-label="Advertisement">
        <AdUnit
          slot={SIDEBAR_AD_SLOT}
          format="auto"
          responsive={true}
          style={{ display: "block" }}
        />
      </aside>
    </>
  );
}
