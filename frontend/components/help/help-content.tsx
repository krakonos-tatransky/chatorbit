"use client";

import { createElement, type ReactNode } from "react";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type TroubleshootingSection = {
  id: string;
  title: string;
  steps: ReactNode[];
};

export const TROUBLESHOOTING_SECTIONS: TroubleshootingSection[] = [
  {
    id: "iphone",
    title: "iPhone and iPad (Safari or Firefox)",
    steps: [
      (
        <>
          Open <strong>Settings → Privacy &amp; Security → Camera/Microphone</strong> and make sure Firefox or Safari is allowed
          to use both.
        </>
      ),
      (
        <>
          In the browser, open the address bar menu for your session and set both Camera and Microphone permissions to
          <strong>Allow</strong>.
        </>
      ),
      (
        <>
          If prompts still do not appear, clear the website data for chat-orbit.com (or your deployment) and reload the session
          to trigger a fresh permission request.
        </>
      ),
    ],
  },
  {
    id: "android",
    title: "Android (Chrome, Firefox, or Edge)",
    steps: [
      (
        <>
          Check <strong>Settings → Apps → [Browser] → Permissions</strong> and confirm Camera and Microphone are enabled.
        </>
      ),
      <>Within the browser, tap the lock icon in the address bar and turn on both permissions for the site.</>,
      (
        <>
          Reload the page. If the call still fails, try starting the video request from the affected device so the permission
          prompt happens in direct response to your tap.
        </>
      ),
    ],
  },
  {
    id: "desktop",
    title: "Desktop (Windows, macOS, or Linux)",
    steps: [
      <>Close any other application that might already be using the camera or microphone.</>,
      <>Use the browser's site information panel (typically the lock icon) to allow Camera and Microphone access.</>,
      (
        <>
          On macOS, open <strong>System Settings → Privacy &amp; Security → Camera/Microphone</strong> and enable access for your
          browser. On Windows, go to <strong>Settings → Privacy &amp; security → Camera/Microphone</strong> and make sure both
          system-wide and browser-specific toggles are on.
        </>
      ),
    ],
  },
];

type HelpContentProps = {
  headingLevel?: HeadingTag;
  sectionHeadingLevel?: HeadingTag;
  cardHeadingLevel?: HeadingTag;
  headingId?: string;
  showHeading?: boolean;
};

export function HelpContent({
  headingLevel = "h1",
  sectionHeadingLevel,
  cardHeadingLevel,
  headingId = "help-page-title",
  showHeading = true,
}: HelpContentProps) {
  const HeadingTag = headingLevel;
  const SectionHeadingTag: HeadingTag = sectionHeadingLevel ?? (headingLevel === "h1" ? "h2" : "h3");
  const CardHeadingTag: HeadingTag = cardHeadingLevel ?? (SectionHeadingTag === "h2" ? "h3" : "h4");

  return (
    <>
      <div className="help-page__intro">
        {showHeading ? createElement(HeadingTag, { id: headingId }, "Help & FAQ") : null}
        <p>
          Having trouble starting a video chat? Follow the steps below for your device to restore camera and microphone access
          and get back into your session.
        </p>
      </div>
      <section className="help-page__topic" aria-labelledby="video-troubleshooting">
        {createElement(SectionHeadingTag, { id: "video-troubleshooting" }, "Video call fails or camera never starts")}
        <p>
          ChatOrbit needs permission to use both your camera and microphone before a call can begin. If either permission is
          blocked, the call request will stop with an error. Use the tips below for your platform to re-enable access.
        </p>
        <div className="help-page__topics">
          {TROUBLESHOOTING_SECTIONS.map((section) => (
            <article key={section.id} className="help-page__card">
              {createElement(CardHeadingTag, { id: `help-${section.id}` }, section.title)}
              <ol>
                {section.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
