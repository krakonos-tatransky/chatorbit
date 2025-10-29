"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";

import { useSearchParams } from "next/navigation";

import { SessionView } from "@/components/session-view";

const TRUE_LIKE_VALUES = new Set(["1", "true", "yes"]);

export default function SessionPage() {
  return (
    <Suspense fallback={<SessionPageFallback />}>
      <SessionPageContent />
    </Suspense>
  );
}

function SessionPageContent() {
  const searchParams = useSearchParams();

  const { token, participantId, reportAbuseRequested } = useMemo(() => {
    const tokenValue = searchParams.get("token") ?? undefined;
    const participantValue = searchParams.get("participant") ?? undefined;
    const reportAbuseRaw = searchParams.get("reportAbuse")?.toLowerCase();

    return {
      token: tokenValue ?? undefined,
      participantId: participantValue ?? undefined,
      reportAbuseRequested: reportAbuseRaw ? TRUE_LIKE_VALUES.has(reportAbuseRaw) : false,
    };
  }, [searchParams]);

  if (!token) {
    return <MissingTokenNotice />;
  }

  return (
    <SessionView
      token={token}
      participantIdFromQuery={participantId}
      initialReportAbuseOpen={reportAbuseRequested}
    />
  );
}

function MissingTokenNotice() {
  return (
    <main className="page-wrapper">
      <div className="page-inner" style={{ maxWidth: "640px", alignItems: "center", textAlign: "center", gap: "2rem" }}>
        <div className="card card--indigo" style={{ gap: "1rem" }}>
          <h1 className="card__title" style={{ fontSize: "1.5rem" }}>
            Session token required
          </h1>
          <p className="card__subtitle" style={{ color: "rgba(226, 232, 240, 0.8)", fontSize: "0.95rem" }}>
            Use the token request form to mint a new session or ask your host for the join link. Paste the token into the join
            form to continue.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
            <Link className="button button--cyan" href="/#token-request-card">
              Request a token
            </Link>
            <Link className="button button--indigo" href="/#join-session-card">
              Join with a token
            </Link>
          </div>
          <Link className="helper-text" href="/">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

function SessionPageFallback() {
  return (
    <main className="page-wrapper">
      <div className="page-inner" style={{ maxWidth: "640px", alignItems: "center", textAlign: "center", gap: "2rem" }}>
        <div className="card card--indigo" style={{ gap: "1rem" }}>
          <h1 className="card__title" style={{ fontSize: "1.5rem" }}>
            Loading session…
          </h1>
          <p className="card__subtitle" style={{ color: "rgba(226, 232, 240, 0.8)", fontSize: "0.95rem" }}>
            Preparing your secure chat hand-off. If this screen persists, refresh or request a new token.
          </p>
        </div>
      </div>
    </main>
  );
}
