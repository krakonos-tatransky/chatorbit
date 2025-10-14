"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { apiUrl, wsUrl } from "@/lib/api";
import { getIceServers } from "@/lib/webrtc";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type TimeoutHandle = ReturnType<typeof setTimeout>;

type CryptoLike = {
  subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  randomUUID?: () => string;
};

function resolveCrypto(): CryptoLike | null {
  const globalScope: any =
    typeof globalThis !== "undefined"
      ? globalThis
      : typeof self !== "undefined"
        ? self
        : typeof window !== "undefined"
          ? window
          : undefined;

  if (!globalScope) {
    return null;
  }

  const candidates = [
    globalScope.crypto,
    globalScope.msCrypto,
    globalScope?.webkitCrypto,
    globalScope.navigator?.crypto,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const subtle: SubtleCrypto | undefined =
      candidate.subtle ?? candidate.webkitSubtle ?? candidate.webcrypto?.subtle;
    const getRandomValues: CryptoLike["getRandomValues"] | undefined =
      typeof candidate.getRandomValues === "function"
        ? candidate.getRandomValues.bind(candidate)
        : typeof candidate.webcrypto?.getRandomValues === "function"
          ? candidate.webcrypto.getRandomValues.bind(candidate.webcrypto)
          : undefined;
    const randomUUID: CryptoLike["randomUUID"] | undefined =
      typeof candidate.randomUUID === "function"
        ? candidate.randomUUID.bind(candidate)
        : typeof candidate.webcrypto?.randomUUID === "function"
          ? candidate.webcrypto.randomUUID.bind(candidate.webcrypto)
          : undefined;

    if (subtle && getRandomValues) {
      return { subtle, getRandomValues, randomUUID };
    }
  }

  return null;
}

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const MAX_ICE_FAILURE_RETRIES = 3;

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

type EncryptionMode = "aes-gcm" | "none";

type EncryptedMessage = {
  sessionId: string;
  messageId: string;
  participantId: string;
  role: string;
  createdAt: string;
  encryptedContent?: string;
  content?: string;
  hash?: string;
  encryption?: EncryptionMode;
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
  const [tokenCopyState, setTokenCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [socketReconnectNonce, setSocketReconnectNonce] = useState(0);
  const [peerResetNonce, setPeerResetNonce] = useState(0);
  const [supportsEncryption, setSupportsEncryption] = useState<boolean | null>(null);
  const [peerSupportsEncryption, setPeerSupportsEncryption] = useState<boolean | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingSignalsRef = useRef<any[]>([]);
  const hasSentOfferRef = useRef<boolean>(false);
  const hashedMessagesRef = useRef<Map<string, EncryptedMessage>>(new Map());
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const encryptionPromiseRef = useRef<Promise<CryptoKey> | null>(null);
  const tokenCopyTimeoutRef = useRef<number | null>(null);
  const capabilityAnnouncedRef = useRef(false);
  const peerSupportsEncryptionRef = useRef<boolean | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<TimeoutHandle | null>(null);
  const iceFailureRetriesRef = useRef(0);
  const iceRetryTimeoutRef = useRef<TimeoutHandle | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const initialMessagesHandledRef = useRef(false);

  const ensureAudioContext = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextClass =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    let context = audioContextRef.current;
    if (!context || context.state === "closed") {
      try {
        context = new AudioContextClass();
      } catch (cause) {
        console.warn("Unable to create AudioContext", cause);
        return null;
      }
      audioContextRef.current = context as AudioContext;
    }

    if (context.state === "suspended") {
      void context.resume().catch(() => {});
    }

    return context as AudioContext;
  }, []);

  const playNotificationTone = useCallback(() => {
    const context = ensureAudioContext();
    if (!context) {
      return;
    }

    const now = context.currentTime;
    const duration = 0.4;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, now);
    oscillator.frequency.exponentialRampToValueAtTime(880, now + duration * 0.6);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };

    oscillator.start(now);
    oscillator.stop(now + duration);
  }, [ensureAudioContext]);

  useEffect(() => {
    hashedMessagesRef.current.clear();
    setMessages([]);
    encryptionKeyRef.current = null;
    encryptionPromiseRef.current = null;
    capabilityAnnouncedRef.current = false;
    peerSupportsEncryptionRef.current = null;
    setPeerSupportsEncryption(null);
    knownMessageIdsRef.current.clear();
    initialMessagesHandledRef.current = false;
  }, [token]);

  useEffect(() => {
    setSupportsEncryption(resolveCrypto() !== null);
  }, []);

  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      if (context) {
        audioContextRef.current = null;
        context.close().catch(() => {});
      }
    };
  }, []);

  const ensureEncryptionKey = useCallback(async () => {
    if (supportsEncryption !== true) {
      throw new Error("Encryption is not supported in this environment.");
    }
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
  }, [supportsEncryption, token]);

  useEffect(() => {
    const knownIds = knownMessageIdsRef.current;
    const newMessages: Message[] = [];

    for (const message of messages) {
      if (!knownIds.has(message.messageId)) {
        knownIds.add(message.messageId);
        newMessages.push(message);
      }
    }

    if (!initialMessagesHandledRef.current) {
      initialMessagesHandledRef.current = true;
      return;
    }

    if (newMessages.some((message) => message.participantId !== participantId)) {
      playNotificationTone();
    }
  }, [messages, participantId, playNotificationTone]);

  const handleCopyToken = useCallback(async () => {
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
      await navigator.clipboard.writeText(token);
      setTokenCopyState("copied");
    } catch (cause) {
      console.error("Failed to copy session token", cause);
      setTokenCopyState("failed");
    }

    tokenCopyTimeoutRef.current = window.setTimeout(() => setTokenCopyState("idle"), 2000);
  }, [token]);

  const resetPeerConnection = useCallback(
    ({ recreate = true, delayMs }: { recreate?: boolean; delayMs?: number } = {}) => {
      if (iceRetryTimeoutRef.current) {
        clearTimeout(iceRetryTimeoutRef.current);
        iceRetryTimeoutRef.current = null;
      }
      const existing = peerConnectionRef.current;
      if (existing) {
        try {
          existing.close();
        } catch (cause) {
          console.warn("Failed to close RTCPeerConnection", cause);
        }
      }
      peerConnectionRef.current = null;
      dataChannelRef.current = null;
      pendingCandidatesRef.current = [];
      pendingSignalsRef.current = [];
      hasSentOfferRef.current = false;
      setConnected(false);
      capabilityAnnouncedRef.current = false;
      peerSupportsEncryptionRef.current = null;
      setPeerSupportsEncryption(null);
      if (!recreate) {
        return;
      }
      if (delayMs && delayMs > 0) {
        iceRetryTimeoutRef.current = setTimeout(() => {
          iceRetryTimeoutRef.current = null;
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            setPeerResetNonce((value) => value + 1);
          }
        }, delayMs);
      } else {
        setPeerResetNonce((value) => value + 1);
      }
    },
    [setConnected, setPeerResetNonce],
  );

  const sendCapabilities = useCallback(() => {
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== "open") {
      return;
    }
    if (supportsEncryption === null) {
      logEvent("Encryption capability unknown; delaying announcement");
      return;
    }
    const encryptionSupported = supportsEncryption === true;
    logEvent("Announcing capabilities", { supportsEncryption: encryptionSupported });
    channel.send(
      JSON.stringify({
        type: "capabilities",
        supportsEncryption: encryptionSupported,
      }),
    );
    capabilityAnnouncedRef.current = true;
  }, [supportsEncryption]);

  useEffect(() => {
    if (supportsEncryption === null) {
      return;
    }
    if (capabilityAnnouncedRef.current) {
      return;
    }
    if (dataChannelRef.current?.readyState === "open") {
      sendCapabilities();
    }
  }, [sendCapabilities, supportsEncryption]);

  const handlePeerMessage = useCallback(
    async (raw: string) => {
      logEvent("Received raw data channel payload", raw);
      try {
        const payload = JSON.parse(raw);
        if (payload.type === "capabilities") {
          const remoteSupports = Boolean(payload.supportsEncryption);
          peerSupportsEncryptionRef.current = remoteSupports;
          setPeerSupportsEncryption(remoteSupports);
          if (!capabilityAnnouncedRef.current) {
            sendCapabilities();
          }
          return;
        }
        if (payload.type === "message") {
          const incoming = payload.message as EncryptedMessage;
          if (!incoming?.messageId || incoming.sessionId !== token) {
            logEvent("Ignoring unexpected data channel message", payload);
            return;
          }
          const encryptionMode: EncryptionMode = incoming.encryption ?? "aes-gcm";
          if (peerSupportsEncryptionRef.current === null) {
            const inferred = encryptionMode !== "none";
            peerSupportsEncryptionRef.current = inferred;
            setPeerSupportsEncryption(inferred);
          }
          try {
            let content: string;
            if (encryptionMode === "none") {
              content = incoming.content ?? "";
            } else {
              if (supportsEncryption !== true) {
                throw new Error("Browser cannot decrypt messages in this session.");
              }
              const key = await ensureEncryptionKey();
              if (!incoming.encryptedContent) {
                throw new Error("Encrypted payload is missing.");
              }
              content = await decryptText(key, incoming.encryptedContent);
            }
            if (incoming.hash) {
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
            }
            hashedMessagesRef.current.set(incoming.messageId, {
              ...incoming,
              content,
              encryption: encryptionMode,
              deleted: false,
            });
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
            logEvent("Processed incoming message", {
              messageId: incoming.messageId,
              participantId: incoming.participantId,
              role: incoming.role,
              createdAt: incoming.createdAt,
              encryption: encryptionMode,
            });
          } catch (cause) {
            console.error("Unable to process incoming message", cause);
            setError("Unable to process an incoming message.");
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
    [ensureEncryptionKey, sendCapabilities, supportsEncryption, token],
  );

  const attachDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      dataChannelRef.current = channel;
      logEvent("Attached data channel", { label: channel.label, readyState: channel.readyState });
      channel.onopen = () => {
        setConnected(true);
        setError(null);
        iceFailureRetriesRef.current = 0;
        logEvent("Data channel opened", { label: channel.label });
        capabilityAnnouncedRef.current = false;
        sendCapabilities();
      };
      channel.onclose = () => {
        setConnected(false);
        dataChannelRef.current = null;
        if (participantRole === "host") {
          hasSentOfferRef.current = false;
        }
        peerSupportsEncryptionRef.current = null;
        setPeerSupportsEncryption(null);
        logEvent("Data channel closed", { label: channel.label });
      };
      channel.onerror = () => {
        setConnected(false);
        peerSupportsEncryptionRef.current = null;
        setPeerSupportsEncryption(null);
        logEvent("Data channel encountered an error", { label: channel.label });
      };
      channel.onmessage = (event) => {
        logEvent("Data channel message received", { label: channel.label, length: event.data?.length });
        void handlePeerMessage(event.data);
      };
    },
    [handlePeerMessage, participantRole, sendCapabilities],
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
      if (event.candidate && event.candidate.candidate) {
        const candidate = typeof event.candidate.toJSON === "function" ? event.candidate.toJSON() : event.candidate;
        sendSignal("iceCandidate", candidate);
        logEvent("Discovered ICE candidate", candidate);
      } else {
        logEvent("ICE candidate gathering complete");
      }
    };

    peerConnection.onconnectionstatechange = () => {
      logEvent("Peer connection state changed", peerConnection.connectionState);
      const state = peerConnection.connectionState;
      if (state === "connected") {
        setConnected(true);
        setError(null);
        iceFailureRetriesRef.current = 0;
      } else if (state === "failed" || state === "disconnected" || state === "closed") {
        setConnected(false);
        if (participantRole === "host") {
          hasSentOfferRef.current = false;
        }
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      logEvent("ICE connection state changed", state);
      if (state === "failed" && participantRole === "host" && peerConnectionRef.current === peerConnection) {
        if (iceFailureRetriesRef.current < MAX_ICE_FAILURE_RETRIES) {
          const attempt = iceFailureRetriesRef.current + 1;
          iceFailureRetriesRef.current = attempt;
          resetPeerConnection({ delayMs: 1000 * attempt });
          logEvent("ICE connection failed; scheduling retry", { attempt });
        } else {
          setError("Connection failed. Please refresh to retry.");
          logEvent("ICE connection failed and maximum retries reached");
        }
      } else if (state === "connected") {
        iceFailureRetriesRef.current = 0;
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
      resetPeerConnection({ recreate: false });
    };
  }, [
    attachDataChannel,
    participantId,
    participantRole,
    peerResetNonce,
    processSignalPayload,
    resetPeerConnection,
    sendSignal,
  ]);

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

    let active = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const url = wsUrl(`/ws/sessions/${token}?participantId=${participantId}`);
    logEvent("Opening WebSocket", { url });
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      if (!active) {
        return;
      }
      reconnectAttemptsRef.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setSocketReady(true);
      setError(null);
      iceFailureRetriesRef.current = 0;
      logEvent("WebSocket connection established");
      resetPeerConnection();
    };

    socket.onclose = () => {
      if (!active) {
        return;
      }
      setSocketReady(false);
      socketRef.current = null;
      setConnected(false);
      resetPeerConnection({ recreate: false });
      logEvent("WebSocket connection closed");
      if (participantId) {
        const attempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = attempt;
        const backoffAttempt = Math.min(attempt, 6);
        const delay = Math.min(
          RECONNECT_BASE_DELAY_MS * 2 ** (backoffAttempt - 1),
          RECONNECT_MAX_DELAY_MS,
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          setSocketReconnectNonce((value) => value + 1);
        }, delay);
        logEvent("Scheduling WebSocket reconnect", { attempt, delay });
      }
    };

    socket.onerror = (event) => {
      if (!active) {
        return;
      }
      logEvent("WebSocket error", event);
      setError("WebSocket error");
    };

    socket.onmessage = (event) => {
      if (!active) {
        return;
      }
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
          resetPeerConnection({ recreate: false });
          setConnected(false);
        } else if (payload.type === "signal") {
          void handleSignal(payload);
        }
      } catch (cause) {
        console.error("Failed to parse WebSocket payload", cause);
      }
    };

    return () => {
      active = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      socketRef.current = null;
      socket.close();
    };
  }, [handleSignal, participantId, resetPeerConnection, socketReconnectNonce, token]);

  useEffect(() => {
    if (
      participantRole !== "host" ||
      !socketReady ||
      !participantId ||
      !peerConnectionRef.current ||
      hasSentOfferRef.current ||
      sessionStatus?.status !== "active" ||
      connected ||
      (sessionStatus?.connectedParticipants && sessionStatus.connectedParticipants.length < 2)
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
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
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    connected,
    participantId,
    participantRole,
    sendSignal,
    sessionStatus?.connectedParticipants,
    sessionStatus?.status,
    socketReady,
  ]);

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

  const connectedParticipantCount = useMemo(() => {
    const connectedIds = new Set(sessionStatus?.connectedParticipants ?? []);
    if (connected) {
      if (participantId) {
        connectedIds.add(participantId);
      }
      for (const participant of sessionStatus?.participants ?? []) {
        connectedIds.add(participant.participantId);
      }
    }
    return Math.min(connectedIds.size, 2);
  }, [connected, participantId, sessionStatus?.connectedParticipants, sessionStatus?.participants]);

  const countdownLabel = useMemo(() => {
    if (remainingSeconds === null) {
      return sessionStatus?.status === "issued" ? "Waiting for partner…" : "Starting…";
    }
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [remainingSeconds, sessionStatus?.status]);

  const encryptionAlertMessage = useMemo(() => {
    if (supportsEncryption === false && peerSupportsEncryption === false) {
      return "Messages are sent without end-to-end encryption because neither browser in this session supports it.";
    }
    if (supportsEncryption === false) {
      return "Messages are sent without end-to-end encryption because this browser does not support it.";
    }
    if (peerSupportsEncryption === false) {
      return "Messages are sent without end-to-end encryption because the other participant's browser does not support it.";
    }
    return null;
  }, [peerSupportsEncryption, supportsEncryption]);

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

    if (peerSupportsEncryption === null) {
      setError("Connection is still negotiating. Please wait a moment before sending a message.");
      return;
    }

    const useEncryption = supportsEncryption === true && peerSupportsEncryption === true;
    const encryptionMode: EncryptionMode = useEncryption ? "aes-gcm" : "none";

    const messageId = generateMessageId();
    const createdAt = new Date().toISOString();

    try {
      const hash = await computeMessageHash(token, participantId, messageId, trimmed);
      let record: EncryptedMessage;
      if (useEncryption) {
        const key = await ensureEncryptionKey();
        if (!key) {
          throw new Error("Encryption key unavailable");
        }
        const encryptedContent = await encryptText(key, trimmed);
        record = {
          sessionId: token,
          messageId,
          participantId,
          role: participantRole,
          createdAt,
          encryptedContent,
          hash,
          encryption: encryptionMode,
          deleted: false,
        };
      } else {
        record = {
          sessionId: token,
          messageId,
          participantId,
          role: participantRole,
          createdAt,
          content: trimmed,
          hash,
          encryption: encryptionMode,
          deleted: false,
        };
      }
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
      console.error("Failed to send message", cause);
      setError("Unable to send your message.");
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

  useEffect(() => {
    return () => {
      if (tokenCopyTimeoutRef.current) {
        window.clearTimeout(tokenCopyTimeoutRef.current);
        tokenCopyTimeoutRef.current = null;
      }
      resetPeerConnection({ recreate: false });
      if (iceRetryTimeoutRef.current) {
        clearTimeout(iceRetryTimeoutRef.current);
        iceRetryTimeoutRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      const socket = socketRef.current;
      if (socket) {
        socket.close();
        socketRef.current = null;
      }
    };
  }, [resetPeerConnection]);

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
          <div className="session-token-header">
            <p className="session-token">Token</p>
            <button
              type="button"
              className={`session-token-copy${
                tokenCopyState === "copied" ? " session-token-copy--success" : ""
              }${tokenCopyState === "failed" ? " session-token-copy--error" : ""}`}
              onClick={handleCopyToken}
              aria-label="Copy session token"
            >
              {tokenCopyState === "copied" ? "Copied" : "Copy"}
            </button>
            <span className="session-token-copy-status" role="status" aria-live="polite">
              {tokenCopyState === "copied"
                ? "Token copied to clipboard"
                : tokenCopyState === "failed"
                  ? "Unable to copy token"
                  : ""}
            </span>
          </div>
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
            <span
              className={`status-indicator${
                sessionStatus?.status === "closed" || sessionStatus?.status === "expired"
                  ? " status-indicator--ended"
                  : connected
                    ? " status-indicator--active"
                    : ""
              }`}
              aria-hidden
            />
            <span>
              {sessionStatus?.status === "closed"
                ? "Ended"
                : sessionStatus?.status === "expired"
                  ? "Expired"
                  : connected
                    ? "Connected"
                    : "Waiting"}
            </span>
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
          <span>Connected participants: {connectedParticipantCount}/2</span>
          <span>
            Limit: {sessionStatus ? sessionStatus.messageCharLimit.toLocaleString() : "—"} chars/message
          </span>
        </div>

        {encryptionAlertMessage ? (
          <div className="alert alert--info">{encryptionAlertMessage}</div>
        ) : null}

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
            <button
              type="submit"
              disabled={!connected || sessionStatus?.status !== "active" || peerSupportsEncryption === null}
              className="button button--cyan"
            >
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
  const cryptoLike = resolveCrypto();
  if (cryptoLike?.randomUUID) {
    return cryptoLike.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`;
}

async function deriveKey(token: string): Promise<CryptoKey> {
  const cryptoLike = resolveCrypto();
  if (!cryptoLike) {
    throw new Error("Web Crypto API is not available.");
  }
  const digest = await cryptoLike.subtle.digest("SHA-256", textEncoder.encode(token));
  return cryptoLike.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function encryptText(key: CryptoKey, plaintext: string): Promise<string> {
  const cryptoLike = resolveCrypto();
  if (!cryptoLike) {
    throw new Error("Web Crypto API is not available.");
  }
  const iv = cryptoLike.getRandomValues(new Uint8Array(12));
  const encoded = textEncoder.encode(plaintext);
  const encrypted = await cryptoLike.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return toBase64(combined);
}

async function decryptText(key: CryptoKey, payload: string): Promise<string> {
  const cryptoLike = resolveCrypto();
  if (!cryptoLike) {
    throw new Error("Web Crypto API is not available.");
  }
  const bytes = fromBase64(payload);
  if (bytes.length < 13) {
    throw new Error("Encrypted payload is not valid.");
  }
  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  const decrypted = await cryptoLike.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return textDecoder.decode(decrypted);
}

async function computeMessageHash(
  sessionId: string,
  participantId: string,
  messageId: string,
  content: string,
): Promise<string> {
  const cryptoLike = resolveCrypto();
  const composite = `${sessionId}:${participantId}:${messageId}:${content}`;
  if (cryptoLike?.subtle) {
    const digest = await cryptoLike.subtle.digest("SHA-256", textEncoder.encode(composite));
    return toBase64(new Uint8Array(digest));
  }
  return toBase64(sha256Bytes(composite));
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

function sha256Bytes(input: string): Uint8Array {
  const message = textEncoder.encode(input);
  const messageLength = message.length;
  const paddedLength = (messageLength + 9 + 63) & ~63;
  const buffer = new ArrayBuffer(paddedLength);
  const bytes = new Uint8Array(buffer);
  bytes.set(message);
  bytes[messageLength] = 0x80;
  const view = new DataView(buffer);
  const bitLength = messageLength * 8;
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  view.setUint32(paddedLength - 8, highBits, false);
  view.setUint32(paddedLength - 4, lowBits, false);

  const hash = new Uint32Array([
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19,
  ]);

  const k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];

    for (let index = 0; index < 64; index += 1) {
      const S1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[index] + words[index]) >>> 0;
      const S0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const outputView = new DataView(result.buffer);
  for (let index = 0; index < 8; index += 1) {
    outputView.setUint32(index * 4, hash[index], false);
  }
  return result;
}

function rotateRight(value: number, amount: number): number {
  return ((value >>> amount) | (value << (32 - amount))) >>> 0;
}
