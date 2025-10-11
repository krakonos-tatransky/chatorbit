"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { apiUrl, wsUrl } from "@/lib/api";
import { getIceServers } from "@/lib/webrtc";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function logEvent(message: string, ...details: unknown[]) {
  console.log(`[SessionView] ${message}`, ...details);
}

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

type EncryptedMessage = {
  sessionId: string;
  messageId: string;
  participantId: string;
  role: string;
  createdAt: string;
  encryptedContent: string;
  hash: string;
  deleted?: boolean;
};

type Props = {
  token: string;
  participantIdFromQuery?: string;
};

export function SessionView({ token, participantIdFromQuery }: Props) {
  const [participantId, setParticipantId] = useState<string | null>(participantIdFromQuery ?? null);
  const [participantRole, setParticipantRole] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [socketReady, setSocketReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingSignalsRef = useRef<any[]>([]);
  const hasSentOfferRef = useRef<boolean>(false);
  const hashedMessagesRef = useRef<Map<string, EncryptedMessage>>(new Map());
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const encryptionPromiseRef = useRef<Promise<CryptoKey> | null>(null);

  useEffect(() => {
    hashedMessagesRef.current.clear();
    setMessages([]);
    encryptionKeyRef.current = null;
    encryptionPromiseRef.current = null;
  }, [token]);

  const ensureEncryptionKey = useCallback(async () => {
    if (encryptionKeyRef.current) {
      return encryptionKeyRef.current;
    }
    if (!encryptionPromiseRef.current) {
      encryptionPromiseRef.current = deriveKey(token)
        .then((key) => {
          encryptionKeyRef.current = key;
          return key;
        })
        .finally(() => {
          encryptionPromiseRef.current = null;
        });
    }
    return encryptionPromiseRef.current;
  }, [token]);

  const handlePeerMessage = useCallback(
    async (raw: string) => {
      logEvent("Received raw data channel payload", raw);
      try {
        const payload = JSON.parse(raw);
        if (payload.type === "message") {
          const incoming = payload.message as EncryptedMessage;
          if (!incoming?.messageId || incoming.sessionId !== token) {
            logEvent("Ignoring unexpected data channel message", payload);
            return;
          }
          try {
            const key = await ensureEncryptionKey();
            if (!key) {
              throw new Error("Encryption key unavailable");
            }
            const content = await decryptText(key, incoming.encryptedContent);
            const expectedHash = await computeMessageHash(
              incoming.sessionId,
              incoming.participantId,
              incoming.messageId,
              content,
            );
            if (expectedHash !== incoming.hash) {
              console.warn("Hash mismatch for message", incoming.messageId);
              setError("Ignored a message with mismatched hash.");
              return;
            }
            hashedMessagesRef.current.set(incoming.messageId, { ...incoming, deleted: false });
            setMessages((prev) =>
              upsertMessage(prev, {
                messageId: incoming.messageId,
                participantId: incoming.participantId,
                role: incoming.role,
                content,
                createdAt: incoming.createdAt,
              }),
            );
            setError(null);
            logEvent("Processed decrypted message", {
              messageId: incoming.messageId,
              participantId: incoming.participantId,
              role: incoming.role,
              createdAt: incoming.createdAt,
            });
          } catch (cause) {
            console.error("Unable to decrypt incoming message", cause);
            setError("Unable to decrypt incoming message.");
          }
        } else if (payload.type === "delete") {
          const messageId = payload.messageId as string | undefined;
          const sessionId = (payload.sessionId as string | undefined) ?? token;
          if (!messageId || sessionId !== token) {
            return;
          }
          const existing = hashedMessagesRef.current.get(messageId);
          if (existing) {
            hashedMessagesRef.current.set(messageId, { ...existing, deleted: true });
          } else {
            hashedMessagesRef.current.set(messageId, {
              sessionId,
              messageId,
              participantId: payload.participantId ?? "",
              role: payload.role ?? "",
              createdAt: payload.createdAt ?? new Date().toISOString(),
              encryptedContent: "",
              hash: payload.hash ?? "",
              deleted: true,
            });
          }
          setMessages((prev) => prev.filter((item) => item.messageId !== messageId));
          logEvent("Processed delete instruction", { messageId, sessionId });
        }
      } catch (cause) {
        console.error("Unable to parse data channel payload", cause);
      }
    },
    [ensureEncryptionKey, token],
  );

  const attachDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      dataChannelRef.current = channel;
      logEvent("Attached data channel", { label: channel.label, readyState: channel.readyState });
      channel.onopen = () => {
        setConnected(true);
        setError(null);
        logEvent("Data channel opened", { label: channel.label });
      };
      channel.onclose = () => {
        setConnected(false);
        dataChannelRef.current = null;
        if (participantRole === "host") {
          hasSentOfferRef.current = false;
        }
        logEvent("Data channel closed", { label: channel.label });
      };
      channel.onerror = () => {
        setConnected(false);
        logEvent("Data channel encountered an error", { label: channel.label });
      };
      channel.onmessage = (event) => {
        logEvent("Data channel message received", { label: channel.label, length: event.data?.length });
        void handlePeerMessage(event.data);
      };
    },
    [handlePeerMessage, participantRole],
  );

  const sendSignal = useCallback(
    (signalType: string, payload: unknown) => {
      if (!participantId) {
        return;
      }
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return;
      }
      logEvent("Sending signal", { signalType, payload });
      socket.send(
        JSON.stringify({
          type: "signal",
          signalType,
          payload,
        }),
      );
    },
    [participantId],
  );

  const processSignalPayload = useCallback(
    async (pc: RTCPeerConnection, payload: any) => {
      const signalType = payload.signalType as string;
      const detail = payload.payload;

      logEvent("Processing signaling payload", { signalType, hasRemote: !!pc.remoteDescription });

      const flushPendingCandidates = async () => {
        const queue = pendingCandidatesRef.current;
        while (queue.length > 0) {
          const candidate = queue.shift();
          if (!candidate) {
            continue;
          }
          try {
            await pc.addIceCandidate(candidate);
            logEvent("Applied queued ICE candidate", candidate);
          } catch (cause) {
            console.error("Failed to apply queued ICE candidate", cause);
          }
        }
      };

      if (signalType === "offer" && detail) {
        logEvent("Applying remote offer");
        await pc.setRemoteDescription(detail as RTCSessionDescriptionInit);
        await flushPendingCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        logEvent("Created answer", answer);
        sendSignal("answer", answer);
      } else if (signalType === "answer" && detail) {
        logEvent("Applying remote answer");
        await pc.setRemoteDescription(detail as RTCSessionDescriptionInit);
        await flushPendingCandidates();
      } else if (signalType === "iceCandidate") {
        if (detail) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(detail as RTCIceCandidateInit);
            logEvent("Applied ICE candidate from peer", detail);
          } else {
            pendingCandidatesRef.current.push(detail as RTCIceCandidateInit);
            logEvent("Queued ICE candidate until remote description is available", detail);
          }
        } else if (pc.remoteDescription) {
          await pc.addIceCandidate(null);
          logEvent("Applied end-of-candidates signal");
        }
      }
    },
    [sendSignal],
  );

  const handleSignal = useCallback(
    async (payload: any) => {
      const pc = peerConnectionRef.current;
      if (!pc) {
        logEvent("Queueing signaling payload until peer connection is ready", payload);
        pendingSignalsRef.current.push(payload);
        return;
      }
      try {
        await processSignalPayload(pc, payload);
      } catch (cause) {
        console.error("Failed to process signaling payload", cause);
      }
    },
    [processSignalPayload],
  );

  useEffect(() => {
    if (!participantId || !participantRole) {
      return;
    }
    if (peerConnectionRef.current) {
      return;
    }

    logEvent("Creating new RTCPeerConnection", { participantId, participantRole });
    const peerConnection = new RTCPeerConnection({
      iceServers: getIceServers(),
    });
    peerConnectionRef.current = peerConnection;

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = typeof event.candidate.toJSON === "function" ? event.candidate.toJSON() : event.candidate;
        sendSignal("iceCandidate", candidate);
        logEvent("Discovered ICE candidate", candidate);
      } else {
        sendSignal("iceCandidate", null);
        logEvent("Finished gathering ICE candidates");
      }
    };

    peerConnection.onconnectionstatechange = () => {
      logEvent("Peer connection state changed", peerConnection.connectionState);
      const state = peerConnection.connectionState;
      if (state === "connected") {
        setConnected(true);
        setError(null);
      } else if (state === "failed" || state === "disconnected" || state === "closed") {
        setConnected(false);
        if (participantRole === "host") {
          hasSentOfferRef.current = false;
        }
      }
    };

    if (participantRole === "host") {
      logEvent("Creating data channel as host");
      const channel = peerConnection.createDataChannel("chat");
      attachDataChannel(channel);
    } else {
      peerConnection.ondatachannel = (event) => {
        logEvent("Received data channel", { label: event.channel.label });
        attachDataChannel(event.channel);
      };
    }

    const backlog = pendingSignalsRef.current.splice(0);
    if (backlog.length > 0) {
      logEvent("Processing queued signaling payloads", { count: backlog.length });
      void (async () => {
        for (const item of backlog) {
          try {
            await processSignalPayload(peerConnection, item);
          } catch (cause) {
            console.error("Failed to process queued signaling payload", cause);
          }
        }
      })();
    }

    return () => {
      logEvent("Tearing down peer connection", { participantId, participantRole });
      pendingCandidatesRef.current = [];
      pendingSignalsRef.current = [];
      hasSentOfferRef.current = false;
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      peerConnection.close();
      peerConnectionRef.current = null;
      setConnected(false);
    };
  }, [attachDataChannel, participantId, participantRole, sendSignal]);

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
      setParticipantRole(payload.role ?? null);
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
      logEvent("Fetching initial session status");
      try {
        const statusResponse = await fetch(apiUrl(`/api/sessions/${token}/status`));

        if (statusResponse.ok) {
          const statusPayload = await statusResponse.json();
          setSessionStatus(mapStatus(statusPayload));
          setRemainingSeconds(statusPayload.remaining_seconds ?? null);
          logEvent("Loaded session status", statusPayload);
        } else if (statusResponse.status === 404) {
          setError("Session not found or expired.");
          logEvent("Session status request returned 404");
          return;
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load session state.");
        console.error("Failed to load session status", cause);
      }
    }

    bootstrap();
  }, [participantId, token]);

  useEffect(() => {
    if (!participantId || !sessionStatus) {
      return;
    }
    const record = sessionStatus.participants.find((participant) => participant.participantId === participantId);
    if (record?.role && record.role !== participantRole) {
      setParticipantRole(record.role);
    }
  }, [participantId, participantRole, sessionStatus]);

  useEffect(() => {
    if (!participantId) {
      return;
    }

    const url = wsUrl(`/ws/sessions/${token}?participantId=${participantId}`);
    logEvent("Opening WebSocket", { url });
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setSocketReady(true);
      logEvent("WebSocket connection established");
    };

    socket.onclose = () => {
      setSocketReady(false);
      socketRef.current = null;
      logEvent("WebSocket connection closed");
    };

    socket.onmessage = (event) => {
      logEvent("Received WebSocket message", event.data);
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "status") {
          setSessionStatus(mapStatus(payload));
          setRemainingSeconds(payload.remaining_seconds ?? null);
          logEvent("Updated status from WebSocket", payload);
        } else if (payload.type === "error") {
          setError(payload.message);
          logEvent("Received WebSocket error", payload);
        } else if (payload.type === "session_closed") {
          setSessionStatus((prev) => (prev ? { ...prev, status: "closed", remainingSeconds: 0 } : prev));
          setRemainingSeconds(0);
          if (dataChannelRef.current) {
            dataChannelRef.current.close();
          }
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
          setConnected(false);
        } else if (payload.type === "signal") {
          void handleSignal(payload);
        }
      } catch (cause) {
        console.error("Failed to parse WebSocket payload", cause);
      }
    };

    return () => {
      logEvent("Closing WebSocket");
      socket.close();
    };
  }, [handleSignal, participantId, token]);

  useEffect(() => {
    if (
      participantRole !== "host" ||
      !socketReady ||
      !participantId ||
      !peerConnectionRef.current ||
      hasSentOfferRef.current ||
      sessionStatus?.status !== "active" ||
      connected
    ) {
      return;
    }

    async function createOffer() {
      logEvent("Attempting to create WebRTC offer");
      try {
        const pc = peerConnectionRef.current;
        if (!pc) {
          logEvent("Peer connection missing while creating offer");
          return;
        }
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        hasSentOfferRef.current = true;
        sendSignal("offer", offer);
        logEvent("Created and sent WebRTC offer", offer);
      } catch (cause) {
        console.error("Failed to create WebRTC offer", cause);
      }
    }

    void createOffer();
  }, [connected, participantId, participantRole, sendSignal, sessionStatus?.status, socketReady]);

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
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== "open") {
      setError("Connection is not ready yet.");
      return;
    }
    if (!participantId || !participantRole) {
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

    const messageId = generateMessageId();
    const createdAt = new Date().toISOString();

    try {
      const key = await ensureEncryptionKey();
      if (!key) {
        throw new Error("Encryption key unavailable");
      }
      const encryptedContent = await encryptText(key, trimmed);
      const hash = await computeMessageHash(token, participantId, messageId, trimmed);
      const record: EncryptedMessage = {
        sessionId: token,
        messageId,
        participantId,
        role: participantRole,
        createdAt,
        encryptedContent,
        hash,
        deleted: false,
      };
      hashedMessagesRef.current.set(messageId, record);
      channel.send(
        JSON.stringify({
          type: "message",
          message: record,
        }),
      );
      setMessages((prev) =>
        upsertMessage(prev, {
          messageId,
          participantId,
          role: participantRole,
          content: trimmed,
          createdAt,
        }),
      );
      setDraft("");
      setError(null);
    } catch (cause) {
      console.error("Failed to encrypt or send message", cause);
      setError("Unable to encrypt or send your message.");
    }
  }

  function handleDelete(messageId: string) {
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== "open") {
      return;
    }
    const existing = hashedMessagesRef.current.get(messageId);
    if (existing) {
      hashedMessagesRef.current.set(messageId, { ...existing, deleted: true });
    } else {
      hashedMessagesRef.current.set(messageId, {
        sessionId: token,
        messageId,
        participantId: participantId ?? "",
        role: participantRole ?? "",
        createdAt: new Date().toISOString(),
        encryptedContent: "",
        hash: "",
        deleted: true,
      });
    }
    channel.send(
      JSON.stringify({
        type: "delete",
        sessionId: token,
        messageId,
        participantId,
      }),
    );
    setMessages((prev) => prev.filter((item) => item.messageId !== messageId));
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

function generateMessageId(): string {
  const globalCrypto: Crypto | undefined = typeof crypto !== "undefined" ? crypto : undefined;
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`;
}

async function deriveKey(token: string): Promise<CryptoKey> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto API is not available.");
  }
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(token));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptText(key: CryptoKey, plaintext: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("Web Crypto API is not available.");
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = textEncoder.encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return toBase64(combined);
}

async function decryptText(key: CryptoKey, payload: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto API is not available.");
  }
  const bytes = fromBase64(payload);
  if (bytes.length < 13) {
    throw new Error("Encrypted payload is not valid.");
  }
  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return textDecoder.decode(decrypted);
}

async function computeMessageHash(
  sessionId: string,
  participantId: string,
  messageId: string,
  content: string,
): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto API is not available.");
  }
  const composite = `${sessionId}:${participantId}:${messageId}:${content}`;
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(composite));
  return toBase64(new Uint8Array(digest));
}

function upsertMessage(list: Message[], message: Message): Message[] {
  const next = list.filter((item) => item.messageId !== message.messageId);
  next.push(message);
  next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return next;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  const globalBuffer = (globalThis as { Buffer?: any }).Buffer;
  if (globalBuffer) {
    return globalBuffer.from(bytes).toString("base64");
  }
  throw new Error("Base64 encoding is not supported in this environment.");
}

function fromBase64(value: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  const globalBuffer = (globalThis as { Buffer?: any }).Buffer;
  if (globalBuffer) {
    return globalBuffer.from(value, "base64");
  }
  throw new Error("Base64 decoding is not supported in this environment.");
}
