"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "";

interface AdUnitProps {
  slot: string;
  format?: "auto" | "fluid" | "rectangle" | "vertical" | "horizontal";
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdUnit({
  slot,
  format = "auto",
  responsive = true,
  className = "",
  style,
}: AdUnitProps) {
  const pathname = usePathname();

  useEffect(() => {
    const pushAd = () => {
      if (typeof window === "undefined") return;
      if (!ADSENSE_PUBLISHER_ID) return;

      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (err) {
        console.error("AdSense push failed:", err);
      }
    };

    // Small delay to ensure the script is loaded
    const timer = setTimeout(pushAd, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!ADSENSE_PUBLISHER_ID) {
    return null;
  }

  return (
    <ins
      key={pathname}
      className={`adsbygoogle ${className}`}
      style={style || { display: "block" }}
      data-ad-client={ADSENSE_PUBLISHER_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
    />
  );
}
