"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { apiUrl, wsUrl } from "@/lib/api";

type Participant = {
  participantId: string;
  role: string;
  joinedAt: string;
};

type SessionStatus = {
  token: string;
  status: "issued" | "active" | "closed" | "expired";
  validityExpiresAt: string;
  sessionStartedAt: string | null;
  sessionExpiresAt: string | null;
  messageCharLimit: number;
  participants: Participant[];
  remainingSeconds: number | null;
  connectedParticipants?: string[];
};

type Message = {
  messageId: string;
  participantId: string;
  role: string;
  content: string;
  createdAt: string;
};

type Props = {
  token: string;
  participantIdFromQuery?: string;
};

export function SessionView({ token, participantIdFromQuery }: Props) {
  const [participantId, setParticipantId] = useState<string | null>(participantIdFromQuery ?? null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (participantId) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const stored = sessionStorage.getItem(`chatOrbit.session.${token}`);
    if (stored) {
      const payload = JSON.parse(stored);
      setParticipantId(payload.participantId);
      setSessionStatus((prev) =>
        prev ?? {
          token,
          status: payload.sessionActive ? "active" : "issued",
          validityExpiresAt: payload.sessionExpiresAt ?? payload.sessionStartedAt ?? new Date().toISOString(),
          sessionStartedAt: payload.sessionStartedAt,
          sessionExpiresAt: payload.sessionExpiresAt,
          messageCharLimit: payload.messageCharLimit,
          participants: [],
          remainingSeconds: null,
        },
      );
    }
  }, [participantId, token]);

  useEffect(() => {
    if (!participantId) {
      return;
    }

    async function bootstrap() {
      try {
        const [statusResponse, messagesResponse] = await Promise.all([
          fetch(apiUrl(`/api/sessions/${token}/status`)),
          fetch(apiUrl(`/api/sessions/${token}/messages`)),
        ]);

        if (statusResponse.ok) {
          const statusPayload = await statusResponse.json();
          setSessionStatus(mapStatus(statusPayload));
          setRemainingSeconds(statusPayload.remaining_seconds ?? null);
        } else if (statusResponse.status === 404) {
          setError("Session not found or expired.");
          return;
        }

        if (messagesResponse.ok) {
          const list = await messagesResponse.json();
          setMessages(
            (list.items as any[]).map((item) => ({
              messageId: item.message_id,
              participantId: item.participant_id,
              role: item.role,
              content: item.content,
              createdAt: item.created_at,
            })),
          );
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load session state.");
      }
    }

    bootstrap();
  }, [participantId, token]);

  useEffect(() => {
    if (!participantId) {
      return;
    }

    const url = wsUrl(`/ws/sessions/${token}?participantId=${participantId}`);
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "status") {
          setSessionStatus(mapStatus(payload));
          setRemainingSeconds(payload.remaining_seconds ?? null);
        } else if (payload.type === "message") {
          const message = payload.message;
          setMessages((prev) => {
            const exists = prev.some((item) => item.messageId === message.message_id);
            if (exists) {
              return prev;
            }
            return [
              ...prev,
              {
                messageId: message.message_id,
                participantId: message.participant_id,
                role: message.role,
                content: message.content,
                createdAt: message.created_at,
              },
            ];
          });
        } else if (payload.type === "delete") {
          const target = payload.messageId as string;
          setMessages((prev) => prev.filter((item) => item.messageId !== target));
        } else if (payload.type === "error") {
          setError(payload.message);
        } else if (payload.type === "session_closed") {
          setSessionStatus((prev) => (prev ? { ...prev, status: "closed", remainingSeconds: 0 } : prev));
          setRemainingSeconds(0);
        }
      } catch (cause) {
        console.error("Failed to parse WebSocket payload", cause);
      }
    };

    return () => {
      socket.close();
    };
  }, [participantId, token]);

  useEffect(() => {
    if (remainingSeconds === null) {
      return;
    }
    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current === null) {
          return current;
        }
        return Math.max(0, current - 1);
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [remainingSeconds]);

  const countdownLabel = useMemo(() => {
    if (remainingSeconds === null) {
      return sessionStatus?.status === "issued" ? "Waiting for partner…" : "Starting…";
    }
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [remainingSeconds, sessionStatus?.status]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setError("Connection is not ready yet.");
      return;
    }
    if (!participantId) {
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    if (sessionStatus?.messageCharLimit && trimmed.length > sessionStatus.messageCharLimit) {
      setError(`Messages are limited to ${sessionStatus.messageCharLimit} characters.`);
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: "message",
        content: trimmed,
      }),
    );
    setDraft("");
  }

  function handleDelete(messageId: string) {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    socketRef.current.send(
      JSON.stringify({
        type: "delete",
        messageId,
      }),
    );
  }

  if (!participantId) {
    return (
      <div className="back-card">
        <h2>No participant record found</h2>
        <p>Join the session again from the landing page so we can link this device to the token.</p>
        <Link href="/">Go back</Link>
      </div>
    );
  }

  return (
    <div className="session-shell">
      <div className="session-header">
        <div>
          <p className="session-token">Token</p>
          <p className="session-token-value">{token}</p>
          <p className="session-role">
            You are signed in as
            <span>
              {" "}
              {sessionStatus?.participants.find((p) => p.participantId === participantId)?.role ?? "guest"}
            </span>
            .
          </p>
        </div>
        <div className="countdown">
          <div className="status-pill">
            <span className={`status-indicator${connected ? " status-indicator--active" : ""}`} aria-hidden />
            <span>{connected ? "Connected" : "Waiting"}</span>
          </div>
          <p className="countdown-label">Session timer</p>
          <p className="countdown-time">{countdownLabel}</p>
        </div>
      </div>

      {sessionStatus?.status === "closed" ? (
        <div className="session-alert session-alert--ended">Session ended. Request a new token to start over.</div>
      ) : null}

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="chat-panel">
        <div className="chat-panel__stats">
          <span>Connected participants: {sessionStatus?.connectedParticipants?.length ?? 0}/2</span>
          <span>
            Limit: {sessionStatus ? sessionStatus.messageCharLimit.toLocaleString() : "—"} chars/message
          </span>
        </div>

        <div className="chat-log">
          {messages.length === 0 ? (
            <p>No messages yet. Start the conversation!</p>
          ) : (
            messages.map((message) => {
              const mine = message.participantId === participantId;
              return (
                <div key={message.messageId} className={`message${mine ? " message--own" : ""}`}>
                  <div className="message-meta">
                    <span>{mine ? "You" : message.role}</span>
                    <span className="message__time">
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="message__body">{message.content}</div>
                  {mine ? (
                    <button type="button" onClick={() => handleDelete(message.messageId)} className="message__delete">
                      Delete
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSend} className="composer">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="textarea"
            placeholder="Type your message…"
            disabled={sessionStatus?.status !== "active"}
          />
          <div className="composer__footer">
            <span>
              {draft.length}/{sessionStatus?.messageCharLimit ?? 0}
            </span>
            <button type="submit" disabled={!connected || sessionStatus?.status !== "active"} className="button button--cyan">
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function mapStatus(payload: any): SessionStatus {
  return {
    token: payload.token,
    status: payload.status,
    validityExpiresAt: payload.validity_expires_at,
    sessionStartedAt: payload.session_started_at,
    sessionExpiresAt: payload.session_expires_at,
    messageCharLimit: payload.message_char_limit,
    participants: (payload.participants || []).map((participant: any) => ({
      participantId: participant.participant_id ?? participant.participantId,
      role: participant.role,
      joinedAt: participant.joined_at ?? participant.joinedAt,
    })),
    remainingSeconds: payload.remaining_seconds ?? payload.remainingSeconds ?? null,
    connectedParticipants: payload.connected_participants ?? payload.connectedParticipants ?? [],
  };
}
