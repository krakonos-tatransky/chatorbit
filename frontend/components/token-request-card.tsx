"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/language/language-provider";
import { apiUrl } from "@/lib/api";
import { getClientIdentity } from "@/lib/client-identity";

type TokenResult = {
  token: string;
  validity_expires_at: string;
  session_ttl_seconds: number;
  message_char_limit: number;
  created_at: string;
};

type JoinResponse = {
  token: string;
  participant_id: string;
  role: string;
  session_active: boolean;
  session_started_at: string | null;
  session_expires_at: string | null;
  message_char_limit: number;
};

const ttlPresets = [5, 15, 30, 60, 180, 720];

export function TokenRequestCard() {
  const [validity, setValidity] = useState<string>("1_day");
  const [sessionMinutes, setSessionMinutes] = useState<number>(60);
  const [messageLimit, setMessageLimit] = useState<number>(2000);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TokenResult | null>(null);
  const [tokenCopyState, setTokenCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const tokenCopyTimeoutRef = useRef<number | null>(null);
  const resultActionsRef = useRef<HTMLDivElement | null>(null);
  const copyButtonRef = useRef<HTMLButtonElement | null>(null);
  const startSessionButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileFocusTimeoutRef = useRef<number | null>(null);
  const startSessionFocusTimeoutRef = useRef<number | null>(null);
  const [clientIdentity, setClientIdentity] = useState<string | null>(null);
  const [startSessionLoading, setStartSessionLoading] = useState<boolean>(false);
  const [startSessionError, setStartSessionError] = useState<string | null>(null);
  const [startSessionAvailable, setStartSessionAvailable] = useState<boolean>(false);
  const router = useRouter();
  const {
    translations: { tokenCard },
  } = useLanguage();

  const ttlHours = useMemo(() => (sessionMinutes / 60).toFixed(1), [sessionMinutes]);
  const validityOptions = useMemo(
    () => [
      { value: "1_day", label: tokenCard.validityOptions.oneDay },
      { value: "1_week", label: tokenCard.validityOptions.oneWeek },
      { value: "1_month", label: tokenCard.validityOptions.oneMonth },
      { value: "1_year", label: tokenCard.validityOptions.oneYear },
    ],
    [tokenCard.validityOptions.oneDay, tokenCard.validityOptions.oneMonth, tokenCard.validityOptions.oneWeek, tokenCard.validityOptions.oneYear],
  );

  useEffect(() => {
    let cancelled = false;
    getClientIdentity()
      .then((identity) => {
        if (!cancelled) {
          setClientIdentity(identity);
        }
      })
      .catch((error) => {
        console.warn("Unable to prefetch client identity", error);
      });

    return () => {
      if (tokenCopyTimeoutRef.current) {
        window.clearTimeout(tokenCopyTimeoutRef.current);
        tokenCopyTimeoutRef.current = null;
      }
      if (mobileFocusTimeoutRef.current) {
        window.clearTimeout(mobileFocusTimeoutRef.current);
        mobileFocusTimeoutRef.current = null;
      }
      if (startSessionFocusTimeoutRef.current) {
        window.clearTimeout(startSessionFocusTimeoutRef.current);
        startSessionFocusTimeoutRef.current = null;
      }
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tokenCopyTimeoutRef.current) {
      window.clearTimeout(tokenCopyTimeoutRef.current);
      tokenCopyTimeoutRef.current = null;
    }
    if (mobileFocusTimeoutRef.current) {
      window.clearTimeout(mobileFocusTimeoutRef.current);
      mobileFocusTimeoutRef.current = null;
    }
    if (startSessionFocusTimeoutRef.current) {
      window.clearTimeout(startSessionFocusTimeoutRef.current);
      startSessionFocusTimeoutRef.current = null;
    }
    setTokenCopyState("idle");
    setStartSessionError(null);
    setStartSessionLoading(false);
    setStartSessionAvailable(false);
  }, [result?.token]);

  useEffect(() => {
    if (!result?.token || typeof window === "undefined") {
      return;
    }

    const isMobileViewport = window.matchMedia?.("(max-width: 768px)").matches ?? false;
    if (!isMobileViewport) {
      return;
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const scrollTarget = resultActionsRef.current ?? copyButtonRef.current;
    scrollTarget?.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });

    if (mobileFocusTimeoutRef.current) {
      window.clearTimeout(mobileFocusTimeoutRef.current);
    }
    mobileFocusTimeoutRef.current = window.setTimeout(() => {
      copyButtonRef.current?.focus({ preventScroll: true });
    }, prefersReducedMotion ? 0 : 250);
  }, [result?.token]);

  useEffect(() => {
    if (!startSessionAvailable || typeof window === "undefined") {
      return;
    }

    const isMobileViewport = window.matchMedia?.("(max-width: 768px)").matches ?? false;
    if (!isMobileViewport) {
      return;
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (startSessionFocusTimeoutRef.current) {
      window.clearTimeout(startSessionFocusTimeoutRef.current);
    }
    startSessionFocusTimeoutRef.current = window.setTimeout(() => {
      startSessionButtonRef.current?.focus({ preventScroll: true });
    }, prefersReducedMotion ? 0 : 200);
  }, [startSessionAvailable]);

  const handleCopyToken = useCallback(async () => {
    if (!result?.token) {
      return;
    }

    setStartSessionAvailable(true);

    if (tokenCopyTimeoutRef.current) {
      window.clearTimeout(tokenCopyTimeoutRef.current);
      tokenCopyTimeoutRef.current = null;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setTokenCopyState("failed");
      tokenCopyTimeoutRef.current = window.setTimeout(() => setTokenCopyState("idle"), 2000);
      return;
    }

    try {
      await navigator.clipboard.writeText(result.token);
      setTokenCopyState("copied");
    } catch (cause) {
      console.error("Failed to copy session token", cause);
      setTokenCopyState("failed");
    }

    tokenCopyTimeoutRef.current = window.setTimeout(() => setTokenCopyState("idle"), 2000);
  }, [result?.token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setStartSessionError(null);

    try {
      const identity = clientIdentity ?? (await getClientIdentity());
      const response = await fetch(apiUrl("/api/tokens"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          validity_period: validity,
          session_ttl_minutes: sessionMinutes,
          message_char_limit: messageLimit,
          ...(identity ? { client_identity: identity } : {}),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || tokenCard.tokenIssueError);
      }

      const payload = (await response.json()) as TokenResult;
      setResult(payload);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : tokenCard.unknownError);
    } finally {
      setLoading(false);
    }
  }

  const handleStartSession = useCallback(async () => {
    if (!result?.token) {
      return;
    }

    setStartSessionError(null);
    setStartSessionLoading(true);

    try {
      const trimmedToken = result.token.trim();
      const identity = await getClientIdentity();
      const joinPayload: { token: string; participant_id?: string; client_identity?: string } = { token: trimmedToken };
      if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem(`chatOrbit.session.${trimmedToken}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed?.participantId) {
              joinPayload.participant_id = parsed.participantId;
            }
          } catch (cause) {
            console.warn("Failed to parse stored session payload", cause);
          }
        }
      }
      if (identity) {
        joinPayload.client_identity = identity;
      }

      const response = await fetch(apiUrl("/api/sessions/join"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(joinPayload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || tokenCard.tokenJoinError);
      }

      const payload = (await response.json()) as JoinResponse;
      const storageKey = `chatOrbit.session.${payload.token}`;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            token: payload.token,
            participantId: payload.participant_id,
            role: payload.role,
            sessionActive: payload.session_active,
            sessionStartedAt: payload.session_started_at,
            sessionExpiresAt: payload.session_expires_at,
            messageCharLimit: payload.message_char_limit,
          }),
        );
      }

      router.push(`/session/${payload.token}?participant=${payload.participant_id}`);
    } catch (cause) {
      setStartSessionError(cause instanceof Error ? cause.message : tokenCard.unknownError);
    } finally {
      setStartSessionLoading(false);
    }
  }, [result?.token, router]);

  return (
    <div className="card card--cyan">
      <h2 className="card__title">{tokenCard.title}</h2>
      <p className="card__subtitle">{tokenCard.subtitle}</p>

      <form onSubmit={handleSubmit} className="form">
        <label className="form__label">
          <span>{tokenCard.validityLabel}</span>
          <select value={validity} onChange={(event) => setValidity(event.target.value)} className="select">
            {validityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="form__label">
          <span>{tokenCard.ttlLabel}</span>
          <div className="chip-group">
            {ttlPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSessionMinutes(preset)}
                className={`chip${sessionMinutes === preset ? " chip--active" : ""}`}
              >
                {preset}m
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={1440}
              value={sessionMinutes}
              onChange={(event) => setSessionMinutes(Number(event.target.value))}
              className="input input--compact"
            />
          </div>
          <p className="helper-text">{tokenCard.ttlApproxHours.replace("{hours}", ttlHours)}</p>
        </div>

        <label className="form__label">
          <span>{tokenCard.messageLimitLabel}</span>
          <input
            type="number"
            min={200}
            max={16000}
            step={100}
            value={messageLimit}
            onChange={(event) => setMessageLimit(Number(event.target.value))}
            className="input"
          />
          <span className="helper-text">{tokenCard.messageLimitHelper}</span>
        </label>

        <button type="submit" disabled={loading} className="button button--cyan">
          {loading ? tokenCard.submitLoading : tokenCard.submitIdle}
        </button>
      </form>

      {error ? <p className="alert alert--error">{error}</p> : null}

      {result ? (
        <div className="result-card">
          <div className="result-card__row result-card__row--token">
            <div className="session-token-header" ref={resultActionsRef}>
              <p className="session-token">{tokenCard.tokenHeader}</p>
              <button
                type="button"
                ref={copyButtonRef}
                className={`session-token-copy${
                  tokenCopyState === "copied" ? " session-token-copy--success" : ""
                }${tokenCopyState === "failed" ? " session-token-copy--error" : ""}`}
                onClick={handleCopyToken}
                aria-label={tokenCard.copyLabel}
              >
                {tokenCopyState === "copied" ? tokenCard.copySuccess : tokenCard.copyIdle}
              </button>
              {startSessionAvailable ? (
                <button
                  type="button"
                  className="session-token-copy session-token-start"
                  ref={startSessionButtonRef}
                  onClick={handleStartSession}
                  disabled={startSessionLoading}
                >
                  {startSessionLoading ? tokenCard.startSessionLoading : tokenCard.startSession}
                </button>
              ) : null}
              <span className="session-token-copy-status" role="status" aria-live="polite">
                {tokenCopyState === "copied"
                  ? tokenCard.copySuccessStatus
                  : tokenCopyState === "failed"
                    ? tokenCard.copyErrorStatus
                    : ""}
              </span>
            </div>
            <p className="session-token-value">{result.token}</p>
          </div>
          <div className="result-card__row">
            <span>{tokenCard.validUntil}</span>
            <span>{new Date(result.validity_expires_at).toLocaleString()}</span>
          </div>
          <div className="result-card__row">
            <span>{tokenCard.sessionTtl}</span>
            <span>{tokenCard.ttlMinutes.replace("{minutes}", Math.round(result.session_ttl_seconds / 60).toString())}</span>
          </div>
          <div className="result-card__row">
            <span>{tokenCard.characterLimit}</span>
            <span>
              {tokenCard.characterCount.replace("{count}", result.message_char_limit.toLocaleString())}
            </span>
          </div>
          {startSessionError ? <p className="alert alert--error">{startSessionError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
