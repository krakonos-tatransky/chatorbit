"use client";

import type { FormEvent, RefObject } from "react";
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/language/language-provider";
import { apiUrl } from "@/lib/api";
import { getClientIdentity } from "@/lib/client-identity";

type JoinResponse = {
  token: string;
  participant_id: string;
  role: string;
  session_active: boolean;
  session_started_at: string | null;
  session_expires_at: string | null;
  message_char_limit: number;
};

type JoinSessionCardProps = {
  tokenInputRef?: RefObject<HTMLInputElement>;
};

export function JoinSessionCard({ tokenInputRef }: JoinSessionCardProps) {
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const {
    translations: { joinCard },
  } = useLanguage();

  useEffect(() => {
    getClientIdentity().catch((error) => {
      console.warn("Unable to prefetch client identity", error);
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.trim()) {
      setError(joinCard.missingTokenError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const trimmedToken = token.trim();
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
        throw new Error(body.detail || joinCard.unknownError);
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
      setError(cause instanceof Error ? cause.message : joinCard.unknownError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card card--indigo">
      <h2 className="card__title">{joinCard.title}</h2>
      <p className="card__subtitle">{joinCard.subtitle}</p>

      <form onSubmit={handleSubmit} className="form">
        <label className="form__label">
          <span>{joinCard.tokenLabel}</span>
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="input input--token"
            placeholder={joinCard.tokenPlaceholder}
            maxLength={64}
            ref={tokenInputRef}
          />
        </label>

        <button type="submit" disabled={loading} className="button button--indigo">
          {loading ? joinCard.submitLoading : joinCard.submitIdle}
        </button>
      </form>

      {error ? <p className="alert alert--error">{error}</p> : null}

      <div className="hint-card">
        <h3>{joinCard.hintTitle}</h3>
        <ul>
          {joinCard.hints.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
