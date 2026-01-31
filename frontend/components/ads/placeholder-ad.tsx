"use client";

import { useEffect, useState } from "react";

interface PlaceholderAdProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

const PLACEHOLDER_ADS = [
  {
    title: "ChatOrbit Pro",
    description: "Upgrade for longer sessions",
    cta: "Learn More",
    bgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    title: "Secure Messaging",
    description: "End-to-end encrypted",
    cta: "Try Now",
    bgGradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  {
    title: "Video Calls",
    description: "Crystal clear P2P video",
    cta: "Connect",
    bgGradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    title: "Privacy First",
    description: "No message storage",
    cta: "Get Started",
    bgGradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  },
];

/**
 * Placeholder advertisement component for testing ad placements.
 * Shows rotating demo ads when real AdSense ads aren't available.
 */
export function PlaceholderAd({
  width = 160,
  height = 600,
  className = ""
}: PlaceholderAdProps) {
  const [adIndex, setAdIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in on mount
    const fadeTimer = setTimeout(() => setIsVisible(true), 100);

    // Rotate ads every 8 seconds
    const rotateTimer = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setAdIndex((prev) => (prev + 1) % PLACEHOLDER_ADS.length);
        setIsVisible(true);
      }, 300);
    }, 8000);

    return () => {
      clearTimeout(fadeTimer);
      clearInterval(rotateTimer);
    };
  }, []);

  const currentAd = PLACEHOLDER_ADS[adIndex];

  return (
    <div
      className={`placeholder-ad ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        background: currentAd.bgGradient,
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.3s ease-in-out",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Ad badge */}
      <span
        style={{
          position: "absolute",
          top: "8px",
          left: "8px",
          fontSize: "10px",
          fontWeight: "600",
          color: "rgba(255,255,255,0.7)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Ad
      </span>

      {/* Demo indicator */}
      <span
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          fontSize: "9px",
          fontWeight: "500",
          color: "rgba(255,255,255,0.5)",
          background: "rgba(0,0,0,0.2)",
          padding: "2px 6px",
          borderRadius: "4px",
        }}
      >
        Demo
      </span>

      {/* Ad content */}
      <div
        style={{
          textAlign: "center",
          color: "white",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
          }}
        >
          💬
        </div>

        <h4
          style={{
            margin: "0 0 8px",
            fontSize: "18px",
            fontWeight: "700",
            textShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        >
          {currentAd.title}
        </h4>

        <p
          style={{
            margin: "0 0 20px",
            fontSize: "13px",
            opacity: 0.9,
            lineHeight: 1.4,
          }}
        >
          {currentAd.description}
        </p>

        <button
          style={{
            background: "rgba(255,255,255,0.95)",
            color: "#333",
            border: "none",
            borderRadius: "20px",
            padding: "10px 24px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            transition: "transform 0.2s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onClick={() => {/* Demo - no action */}}
        >
          {currentAd.cta}
        </button>
      </div>

      {/* Decorative elements */}
      <div
        style={{
          position: "absolute",
          bottom: "-30px",
          right: "-30px",
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "-20px",
          left: "-20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        }}
      />
    </div>
  );
}
