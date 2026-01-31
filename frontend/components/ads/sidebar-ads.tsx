"use client";

import { useEffect, useState } from "react";
import { AdUnit } from "./ad-unit";
import { PlaceholderAd } from "./placeholder-ad";

const SIDEBAR_AD_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT || "";
const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "";

// Show placeholder ads when AdSense is not configured or for testing
const SHOW_PLACEHOLDER_ADS = process.env.NEXT_PUBLIC_SHOW_PLACEHOLDER_ADS === "true";

/**
 * Sidebar ads that appear on both sides of the main content.
 * Only visible on desktop screens (>= 1400px wide).
 * Shows placeholder ads when AdSense is not available or blocked.
 */
export function SidebarAds() {
  const [adsBlocked, setAdsBlocked] = useState(false);

  useEffect(() => {
    // Check if AdSense script loaded successfully
    const checkAdsLoaded = () => {
      if (typeof window !== "undefined") {
        // If adsbygoogle array doesn't exist or script failed, ads are likely blocked
        const adsenseLoaded = typeof window.adsbygoogle !== "undefined";
        setAdsBlocked(!adsenseLoaded);
      }
    };

    // Give AdSense time to load
    const timer = setTimeout(checkAdsLoaded, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Show placeholder ads if:
  // 1. Explicitly enabled via env var, OR
  // 2. No AdSense config, OR
  // 3. Ads are blocked by browser
  const showPlaceholders = SHOW_PLACEHOLDER_ADS || !ADSENSE_PUBLISHER_ID || !SIDEBAR_AD_SLOT || adsBlocked;

  return (
    <>
      <aside className="sidebar-ad sidebar-ad--left" aria-label="Advertisement">
        {showPlaceholders ? (
          <PlaceholderAd width={160} height={600} />
        ) : (
          <AdUnit
            slot={SIDEBAR_AD_SLOT}
            format="auto"
            responsive={true}
            style={{ display: "block" }}
          />
        )}
      </aside>
      <aside className="sidebar-ad sidebar-ad--right" aria-label="Advertisement">
        {showPlaceholders ? (
          <PlaceholderAd width={160} height={600} />
        ) : (
          <AdUnit
            slot={SIDEBAR_AD_SLOT}
            format="auto"
            responsive={true}
            style={{ display: "block" }}
          />
        )}
      </aside>
    </>
  );
}
