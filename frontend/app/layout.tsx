import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ChatOrbit",
  description:
    "Issue temporary tokens and meet privately in a peer-style chat session with a countdown timer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
