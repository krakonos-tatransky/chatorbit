"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { apiUrl } from "@/lib/api";

type TokenResult = {
  token: string;
  validity_expires_at: string;
  session_ttl_seconds: number;
  message_char_limit: number;
  created_at: string;
};

const validityOptions = [
  { value: "1_day", label: "1 day" },
  { value: "1_week", label: "1 week" },
  { value: "1_month", label: "1 month" },
  { value: "1_year", label: "1 year" },
];

const ttlPresets = [5, 15, 30, 60, 180, 720];

export function TokenRequestCard() {
  const [validity, setValidity] = useState<string>("1_day");
  const [sessionMinutes, setSessionMinutes] = useState<number>(60);
  const [messageLimit, setMessageLimit] = useState<number>(2000);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TokenResult | null>(null);

  const ttlHours = useMemo(() => (sessionMinutes / 60).toFixed(1), [sessionMinutes]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/api/tokens"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          validity_period: validity,
          session_ttl_minutes: sessionMinutes,
          message_char_limit: messageLimit,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "Unable to issue a token.");
      }

      const payload = (await response.json()) as TokenResult;
      setResult(payload);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card card--cyan">
      <h2 className="card__title">Request a new session token</h2>
      <p className="card__subtitle">
        Define how long the token stays claimable and how long the active session should last. Each device can mint ten tokens per
        hour.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <label className="form__label">
          <span>Validity window</span>
          <select value={validity} onChange={(event) => setValidity(event.target.value)} className="select">
            {validityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="form__label">
          <span>Session time-to-live (minutes)</span>
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
          <p className="helper-text">≈ {ttlHours} hours</p>
        </div>

        <label className="form__label">
          <span>Message character limit</span>
          <input
            type="number"
            min={200}
            max={16000}
            step={100}
            value={messageLimit}
            onChange={(event) => setMessageLimit(Number(event.target.value))}
            className="input"
          />
          <span className="helper-text">Between 200 and 16,000 characters per message.</span>
        </label>

        <button type="submit" disabled={loading} className="button button--cyan">
          {loading ? "Issuing token…" : "Generate token"}
        </button>
      </form>

      {error ? <p className="alert alert--error">{error}</p> : null}

      {result ? (
        <div className="result-card">
          <div className="result-card__row">
            <span>Token</span>
            <strong className="result-card__token">{result.token}</strong>
          </div>
          <div className="result-card__row">
            <span>Valid until</span>
            <span>{new Date(result.validity_expires_at).toLocaleString()}</span>
          </div>
          <div className="result-card__row">
            <span>Session TTL</span>
            <span>{Math.round(result.session_ttl_seconds / 60)} minutes</span>
          </div>
          <div className="result-card__row">
            <span>Character limit</span>
            <span>{result.message_char_limit.toLocaleString()} characters</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
