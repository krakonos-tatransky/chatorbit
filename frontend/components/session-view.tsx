"use client";

import type { FormEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from "react";
import { createPortal } from "react-dom";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TermsConsentModal } from "@/components/terms-consent-modal";
import { ReportAbuseModal, type ReportAbuseFormValues } from "@/components/report-abuse-modal";
import { apiUrl, wsUrl } from "@/lib/api";
import { getClientIdentity } from "@/lib/client-identity";
import { getIceServers } from "@/lib/webrtc";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type NotificationSoundPlayer = (context: AudioContext) => void;

/* -------------------------------------------------------------------------- */
/*                     FIXED NOTIFICATION SOUNDS (no leaks)                 */
/* -------------------------------------------------------------------------- */
export const NOTIFICATION_SOUNDS = {
  gentleChime: (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.24);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    osc.onended = () => {
      gain.disconnect();
      osc.disconnect();
    };
  },

  icqInspired: (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const make = (
      t: number,
      freqStart: number,
      freqEnd: number,
      dur: number,
      peak: number,
      type: OscillatorType = "triangle",
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, t);
      osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur * 0.7);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + dur * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
      osc.onended = () => {
        gain.disconnect();
        osc.disconnect();
      };
    };
    make(now, 980, 620, 0.22, 0.08);
    make(now + 0.18, 540, 820, 0.28, 0.07);
  },
} satisfies Record<string, NotificationSoundPlayer>;

export type NotificationSoundName = keyof typeof NOTIFICATION_SOUNDS;
const DEFAULT_NOTIFICATION_SOUND: NotificationSoundName = "icqInspired";

type TimeoutHandle = ReturnType<typeof setTimeout>;

type CallState = "idle" | "incoming" | "requesting" | "connecting" | "active";

type CryptoLike = {
  subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  randomUUID?: () => string;
};

type DebugLogEntry = {
  timestamp: number;
  message: string;
  details: unknown[];
};

type DebugObserver = (entry: DebugLogEntry) => void;

let debugObserver: DebugObserver | null = null;

function setDebugObserver(observer: DebugObserver | null) {
  debugObserver = observer;
}

function resolveCrypto(): CryptoLike | null {
  const globalScope: any =
    typeof globalThis !== "undefined"
      ? globalThis
      : typeof self !== "undefined"
        ? self
        : typeof window !== "undefined"
          ? window
          : undefined;

  if (!globalScope) return null;

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

// Safe crypto fallback
const crypto = resolveCrypto() ?? window.crypto;

const DEFAULT_RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const MAX_ICE_FAILURE_RETRIES = 3;
const MAX_TOTAL_RECONNECT_ATTEMPTS = 10;
const SECRET_DEBUG_KEYWORD = "orbitdebug";

function logEvent(message: string, ...details: unknown[]) {
  console.log(`[SessionView] ${message}`, ...details);
  if (debugObserver) {
    debugObserver({ timestamp: Date.now(), message, details });
  }
}

/* -------------------------------------------------------------------------- */
/*                                 Types                                      */
/* -------------------------------------------------------------------------- */
type Participant = {
  participantId: string;
  role: string;
  joinedAt: string;
};

type SessionStatus = {
  token: string;
  status: "issued" | "active" | "closed" | "expired" | "deleted";
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

type SignalPayload = {
  type: string;
  signalType?: string;
  payload?: unknown;
  message?: EncryptedMessage;
  messageId?: string;
  sessionId?: string;
  participantId?: string;
  role?: string;
  createdAt?: string;
  action?: string;
  from?: string;
  supportsEncryption?: boolean;
};

type Props = {
  token: string;
  participantIdFromQuery?: string;
  initialReportAbuseOpen?: boolean;
};

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */
export function SessionView({
  token,
  participantIdFromQuery,
  initialReportAbuseOpen = false,
}: Props) {
  const router = useRouter();

  /* --------------------------- State & Refs --------------------------- */
  const [participantId, setParticipantId] = useState<string | null>(
    participantIdFromQuery ?? null,
  );
  const [participantRole, setParticipantRole] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reverseMessageOrder, setReverseMessageOrder] = useState(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [socketReady, setSocketReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [endSessionLoading, setEndSessionLoading] = useState(false);
  const [confirmEndSessionOpen, setConfirmEndSessionOpen] = useState(false);
  const [tokenCopyState, setTokenCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [socketReconnectNonce, setSocketReconnectNonce] = useState(0);
  const [peerResetNonce, setPeerResetNonce] = useState(0);
  const [supportsEncryption, setSupportsEncryption] = useState<boolean | null>(null);
  const [peerSupportsEncryption, setPeerSupportsEncryption] = useState<boolean | null>(
    null,
  );
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [clientIdentity, setClientIdentity] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | null>(
    null,
  );
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState | null>(
    null,
  );
  const [iceGatheringState, setIceGatheringState] = useState<RTCIceGatheringState | null>(
    null,
  );
  const [dataChannelState, setDataChannelState] = useState<RTCDataChannelState | null>(
    null,
  );
  const [callState, setCallState] = useState<CallState>("idle");
  const callStateRef = useRef<CallState>("idle");
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);
  const [callNotice, setCallNotice] = useState<string | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [headerTimerContainer, setHeaderTimerContainer] = useState<Element | null>(null);
  const [isCallFullscreen, setIsCallFullscreen] = useState(false);
  const [isLocalVideoMuted, setIsLocalVideoMuted] = useState(false);
  const [isLocalAudioMuted, setIsLocalAudioMuted] = useState(false);
  const [pipPosition, setPipPosition] = useState<{ left: number; top: number } | null>(
    null,
  );
  const sessionHeaderId = useId();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [debugEvents, setDebugEvents] = useState<DebugLogEntry[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [lastTermsKeyChecked, setLastTermsKeyChecked] = useState<string | null>(null);
  const [reportAbuseOpen, setReportAbuseOpen] = useState(initialReportAbuseOpen);

  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const callPanelRef = useRef<HTMLDivElement | null>(null);
  const pipContainerRef = useRef<HTMLDivElement | null>(null);

  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingSignalsRef = useRef<SignalPayload[]>([]);
  const hasSentOfferRef = useRef<boolean>(false);
  const hashedMessagesRef = useRef<Map<string, EncryptedMessage>>(new Map());
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const encryptionPromiseRef = useRef<Promise<CryptoKey> | null>(null);
  const tokenCopyTimeoutRef = useRef<TimeoutHandle | null>(null);
  const capabilityAnnouncedRef = useRef(false);
  const peerSupportsEncryptionRef = useRef<boolean | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const headerRevealTimeoutRef = useRef<TimeoutHandle | null>(null);
  const wasConnectedRef = useRef(false);
  const previousMediaPanelVisibleRef = useRef(false);
  const reconnectTimeoutRef = useRef<TimeoutHandle | null>(null);
  const iceFailureRetriesRef = useRef(0);
  const iceRetryTimeoutRef = useRef<TimeoutHandle | null>(null);
  const disconnectionRecoveryTimeoutRef = useRef<TimeoutHandle | null>(null);
  const sessionActiveRef = useRef(false);
  const sessionEndedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const initialMessagesHandledRef = useRef(false);
  const notificationSoundRef = useRef<NotificationSoundName>(DEFAULT_NOTIFICATION_SOUND);
  const secretBufferRef = useRef<string>("");
  const negotiationPendingRef = useRef(false);
  const renegotiateRef = useRef<(() => void) | null>(null);
  const callNoticeTimeoutRef = useRef<TimeoutHandle | null>(null);
  const initialReportHandledRef = useRef(false);
  const pipDragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    pipWidth: number;
    pipHeight: number;
  } | null>(null);
  const termsStorageKey = useMemo(() => `chatorbit:session:${token}:termsAccepted`, [token]);

  /* ---------------------------- Helper Hooks --------------------------- */
  const focusComposer = useCallback(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.focus();
    if (typeof composer.setSelectionRange === "function") {
      const length = composer.value.length;
      composer.setSelectionRange(length, length);
    }
  }, []);

  /* -------------------------- Audio Context -------------------------- */
  const ensureAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AudioContextClass =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return null;

    let ctx = audioContextRef.current;
    if (!ctx || ctx.state === "closed") {
      try {
        ctx = new AudioContextClass();
        audioContextRef.current = ctx as AudioContext;
      } catch (e) {
        console.warn("Unable to create AudioContext", e);
        return null;
      }
    }
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    return ctx as AudioContext;
  }, []);

  const playNotificationTone = useCallback(() => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const name = notificationSoundRef.current;
    const fn = NOTIFICATION_SOUNDS[name] ?? NOTIFICATION_SOUNDS.gentleChime;
    fn(ctx);
  }, [ensureAudioContext]);

  /* -------------------------- Cleanup All --------------------------- */
  const stopLocalMediaTracks = useCallback((pc?: RTCPeerConnection | null) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const senders = pc?.getSenders() ?? [];
    for (const track of stream.getTracks()) {
      try { track.stop(); } catch {}
      if (!pc) continue;
      const sender = senders.find(s => s.track?.id === track.id);
      if (sender) {
        try { pc.removeTrack(sender); } catch {}
      }
    }
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  /* -------------------------- PiP Drag -------------------------- */
  const handlePipPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pipContainerRef.current) return;
    const rect = pipContainerRef.current.getBoundingClientRect();
    pipDragStateRef.current = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      pipWidth: rect.width,
      pipHeight: rect.height,
    };
    pipContainerRef.current.setPointerCapture(e.pointerId);
  }, []);

  const handlePipPointerMove = useEventCallback((e: PointerEvent) => {
    const s = pipDragStateRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    setPipPosition({ left: e.clientX - s.offsetX, top: e.clientY - s.offsetY });
  });

  const handlePipPointerUp = useEventCallback((e: PointerEvent) => {
    const s = pipDragStateRef.current;
    if (!s || e.pointerId !== s.pointerId) return;
    pipDragStateRef.current = null;
    pipContainerRef.current?.releasePointerCapture(e.pointerId);
  });

  useEffect(() => {
    if (!isCallFullscreen) return;
    window.addEventListener("pointermove", handlePipPointerMove);
    window.addEventListener("pointerup", handlePipPointerUp);
    window.addEventListener("pointercancel", handlePipPointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePipPointerMove);
      window.removeEventListener("pointerup", handlePipPointerUp);
      window.removeEventListener("pointercancel", handlePipPointerUp);
    };
  }, [isCallFullscreen, handlePipPointerMove, handlePipPointerUp]);

  const cleanupAll = useCallback(() => {
    // AudioContext
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;

    // Media tracks
    stopLocalMediaTracks(peerConnectionRef.current ?? undefined);

    // PeerConnection
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    dataChannelRef.current = null;

    // WebSocket
    socketRef.current?.close();
    socketRef.current = null;

    // All timeouts
    [
      tokenCopyTimeoutRef,
      reconnectTimeoutRef,
      iceRetryTimeoutRef,
      disconnectionRecoveryTimeoutRef,
      callNoticeTimeoutRef,
      headerRevealTimeoutRef,
    ].forEach(r => { clearTimeout(r.current!); r.current = null; });

    // Global listeners
    window.removeEventListener("pointermove", handlePipPointerMove);
    window.removeEventListener("pointerup", handlePipPointerUp);
    window.removeEventListener("pointercancel", handlePipPointerUp);

    // State reset
    setConnected(false);
    setSocketReady(false);
    setIsReconnecting(false);
    setCallState("idle");
    setSessionEnded(true);
  }, [stopLocalMediaTracks, handlePipPointerMove, handlePipPointerUp]);

  /* -------------------------- Finalize Session -------------------------- */
  const finalizeSession = useCallback(
    (status: "closed" | "expired" | "deleted" = "closed") => {
      if (sessionEndedRef.current) return;
      sessionEndedRef.current = true;
      cleanupAll();
      setSessionEnded(true);
      setError(current => (current === "WebSocket error" ? null : current));
      setSessionStatus(prev => {
        if (!prev) return prev;
        return { ...prev, status, remainingSeconds: 0 };
      });
      setRemainingSeconds(0);
    },
    [cleanupAll],
  );

  const createAndSendOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || hasSentOfferRef.current) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const payload: SignalPayload = { type: "offer", payload: offer };
      if (dataChannelRef.current?.readyState === "open") {
        dataChannelRef.current.send(JSON.stringify(payload));
      } else {
        pendingSignalsRef.current.push(payload);
      }
      hasSentOfferRef.current = true;
    } catch (e) {
      logEvent("Offer failed", e);
    }
  }, []);

  /* -------------------------- Peer Connection Recovery -------------------------- */
  const schedulePeerConnectionRecovery = useCallback((
    pc: RTCPeerConnection,
    reason: string,
    opts?: { delayMs?: number }
  ) => {
    const delay = opts?.delayMs ?? 1500;
    logEvent(`Scheduling PC recovery (${reason}) in ${delay}ms`);
    const tid = setTimeout(() => {
      pc.close();
      peerConnectionRef.current = null;
      void createPeerConnection().then(newPc => {
        if (newPc) {
          pendingCandidatesRef.current.forEach(c => newPc.addIceCandidate(c));
          pendingCandidatesRef.current = [];
          if (hasSentOfferRef.current) void createAndSendOffer();
        }
      });
    }, delay);
    iceRetryTimeoutRef.current = tid;
  }, [createAndSendOffer]);

  /* -------------------------- Peer Connection -------------------------- */
  const createPeerConnection = useCallback(async () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      logEvent("Cannot create PC: socket not open");
      return null;
    }
    if (peerConnectionRef.current) return peerConnectionRef.current;

    const iceServers = await getIceServers();

    const baseConfig: RTCConfiguration = {
      iceServers,
      iceCandidatePoolSize: 10,
    };

    const config: RTCConfiguration = { ...baseConfig };
    if ("sdpSemantics" in RTCPeerConnection.prototype) {
      (config as RTCConfiguration & { sdpSemantics?: string }).sdpSemantics = "unified-plan";
    }

    const pc = new RTCPeerConnection(config);
    peerConnectionRef.current = pc;

    const dataChannel = pc.createDataChannel("chat", {
      negotiated: false,
      id: 1,
      ordered: true,
    });
    dataChannelRef.current = dataChannel;

    /* ---- ICE & connection events ---- */
    pc.onicecandidate = ev => {
      if (!ev.candidate) return;
      const payload: SignalPayload = { type: "ice-candidate", payload: ev.candidate.toJSON() };
      socketRef.current?.send(JSON.stringify(payload));
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      setConnectionState(s);
      logEvent("PC connection state", s);
      if (s === "failed" || s === "closed") {
        schedulePeerConnectionRecovery(pc, `connectionstate:${s}`);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState;
      setIceConnectionState(s);
      logEvent("ICE state", s);
      if (s === "failed") {
        iceFailureRetriesRef.current += 1;
        if (iceFailureRetriesRef.current >= MAX_ICE_FAILURE_RETRIES) {
          schedulePeerConnectionRecovery(pc, "ice-failed-max");
        } else {
          schedulePeerConnectionRecovery(pc, "ice-failed-retry", {
            delayMs: 1000 * iceFailureRetriesRef.current,
          });
        }
      } else if (s === "disconnected") {
        schedulePeerConnectionRecovery(pc, "ice-disconnected");
      }
    };

    pc.onicegatheringstatechange = () => setIceGatheringState(pc.iceGatheringState);
    pc.ondatachannel = ev => {
      if (ev.channel.label !== "chat") return;
      dataChannelRef.current = ev.channel;
      setupDataChannel(ev.channel);
    };
    pc.ontrack = ev => {
      const [stream] = ev.streams;
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
    };
    pc.onnegotiationneeded = () => {
      if (negotiationPendingRef.current) return;
      negotiationPendingRef.current = true;
      renegotiateRef.current = async () => {
        if (!peerConnectionRef.current) return;
        negotiationPendingRef.current = false;
        await createAndSendOffer();
      };
      void renegotiateRef.current();
    };

    return pc;
  }, [schedulePeerConnectionRecovery]);

  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    channel.onopen = () => {
      setDataChannelState(channel.readyState);
      setConnected(true);
      wasConnectedRef.current = true;
      setIsReconnecting(false);
      logEvent("Data channel open");
      pendingSignalsRef.current.forEach(s => channel.send(JSON.stringify(s)));
      pendingSignalsRef.current = [];
    };
    channel.onclose = () => setDataChannelState(channel.readyState);
    channel.onerror = ev => logEvent("Data channel error", ev);
    channel.onmessage = async ev => {
      if (typeof ev.data !== "string") return;
      let payload: SignalPayload;
      try {
        payload = JSON.parse(ev.data);
      } catch {
        return;
      }
      await handleSignal(payload);
    };
  }, []);

  const handleSignal = useCallback(async (signal: SignalPayload) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    if (signal.type === "offer" && signal.payload) {
      const offer = signal.payload as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const payload: SignalPayload = { type: "answer", payload: answer };
      dataChannelRef.current?.readyState === "open"
        ? dataChannelRef.current.send(JSON.stringify(payload))
        : pendingSignalsRef.current.push(payload);
    } else if (signal.type === "answer" && signal.payload) {
      await pc.setRemoteDescription(signal.payload as RTCSessionDescriptionInit);
    } else if (signal.type === "ice-candidate" && signal.payload) {
      await pc.addIceCandidate(signal.payload as RTCIceCandidateInit);
    } else if (signal.type === "call-request") {
      setIncomingCallFrom(signal.from ?? "Unknown");
      setCallDialogOpen(true);
      setCallState("incoming");
    } else if (signal.type === "call-accepted") {
      setCallState("connecting");
    } else if (signal.type === "call-rejected" || signal.type === "call-ended") {
      setCallState("idle");
      setIncomingCallFrom(null);
      setCallDialogOpen(false);
    }
  }, []);

  /* -------------------------- Call Handling -------------------------- */
  const startCall = useCallback(
    async (isVideo: boolean) => {
      if (callStateRef.current !== "idle") return;
      setCallState("requesting");

      const pc = await createPeerConnection();
      if (!pc) return;

      const constraints: MediaStreamConstraints = {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: isVideo
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      stream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, stream);
        if (track.kind === "video") {
          const params = sender.getParameters();
          const pref = params.codecs.find(c =>
            c.mimeType.includes("vp9")
          ) ?? params.codecs.find(c => c.mimeType.includes("vp8"));
          if (pref) {
            const newParams = { ...params, codecs: [pref] };
            void sender.setParameters(newParams).catch(() => {});
          }
        }
      });

      const payload: SignalPayload = {
        type: "call-request",
        from: participantId ?? undefined,
      };
      dataChannelRef.current?.readyState === "open"
        ? dataChannelRef.current.send(JSON.stringify(payload))
        : pendingSignalsRef.current.push(payload);
    },
    [createPeerConnection, participantId],
  );

  const acceptCall = useCallback(async () => {
    if (callStateRef.current !== "incoming") return;
    setCallState("connecting");
    setCallDialogOpen(false);

    const pc = await createPeerConnection();
    if (!pc) return;

    const payload: SignalPayload = { type: "call-accepted" };
    dataChannelRef.current?.readyState === "open"
      ? dataChannelRef.current.send(JSON.stringify(payload))
      : pendingSignalsRef.current.push(payload);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
  }, [createPeerConnection]);

  const endCall = useCallback(() => {
    stopLocalMediaTracks();
    setCallState("idle");
    setIncomingCallFrom(null);
    setCallDialogOpen(false);
    const payload: SignalPayload = { type: "call-ended" };
    dataChannelRef.current?.readyState === "open" &&
      dataChannelRef.current.send(JSON.stringify(payload));
  }, [stopLocalMediaTracks]);

  const toggleMute = useCallback(
    (kind: "audio" | "video") => {
      const stream = localStreamRef.current;
      if (!stream) return;
      const tracks = kind === "audio" ? stream.getAudioTracks() : stream.getVideoTracks();
      tracks.forEach(t => (t.enabled = !t.enabled));
      if (kind === "audio") setIsLocalAudioMuted(!isLocalAudioMuted);
      else setIsLocalVideoMuted(!isLocalVideoMuted);
    },
    [isLocalAudioMuted, isLocalVideoMuted],
  );

  /* -------------------------- Encryption Key -------------------------- */
  const ensureEncryptionKey = useCallback(async () => {
    if (supportsEncryption !== true) throw new Error("Encryption not supported");
    if (encryptionKeyRef.current) return encryptionKeyRef.current;
    if (!encryptionPromiseRef.current) {
      encryptionPromiseRef.current = deriveKey(token)
        .then(k => {
          encryptionKeyRef.current = k;
          return k;
        })
        .finally(() => {
          encryptionPromiseRef.current = null;
        });
    }
    return encryptionPromiseRef.current;
  }, [supportsEncryption, token]);

  const deriveKey = async (t: string): Promise<CryptoKey> => {
    const c = resolveCrypto();
    if (!c) throw new Error("Crypto unavailable");
    const material = textEncoder.encode(t);
    const hash = await c.subtle.digest("SHA-256", material);
    return c.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
  };

  /* -------------------------- WebSocket -------------------------- */
  useEffect(() => {
    if (!token || participantId === null) return;
    let cancelled = false;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (cancelled) return;
      const url = wsUrl(`/ws/sessions/${token}?participantId=${participantId}`);
      socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setSocketReady(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        setIsReconnecting(false);
        logEvent("WS open");
      };

      socket.onmessage = async ev => {
        let data: any;
        try {
          data = JSON.parse(ev.data);
        } catch {
          return;
        }

        if (data.type === "session-status") {
          const s: SessionStatus = data.payload;
          setSessionStatus(s);
          setRemainingSeconds(s.remainingSeconds ?? null);
          if (s.status === "closed" || s.status === "expired" || s.status === "deleted") {
            finalizeSession(s.status);
          }
        } else if (data.type === "message") {
          const msg: EncryptedMessage = data.payload;
          if (hashedMessagesRef.current.has(msg.messageId)) return;
          hashedMessagesRef.current.set(msg.messageId, msg);
          if (msg.deleted) {
            setMessages(m => m.filter(x => x.messageId !== msg.messageId));
            return;
          }
          if (msg.encryptedContent && supportsEncryption) {
            try {
              const key = await ensureEncryptionKey();
              const [ivB64, ctB64] = msg.encryptedContent.split(".");
              const iv = Uint8Array.from(atob(ivB64).split("").map(c => c.charCodeAt(0)));
              const ct = Uint8Array.from(atob(ctB64).split("").map(c => c.charCodeAt(0)));
              const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
              const txt = textDecoder.decode(dec);
              setMessages(m => [
                ...m,
                {
                  messageId: msg.messageId,
                  participantId: msg.participantId,
                  role: msg.role,
                  content: txt,
                  createdAt: msg.createdAt,
                },
              ]);
            } catch (e) {
              logEvent("Decrypt fail", e);
            }
          } else if (msg.content) {
            setMessages(m => [
              ...m,
              {
                messageId: msg.messageId,
                participantId: msg.participantId,
                role: msg.role,
                content: msg.content,
                createdAt: msg.createdAt,
              },
            ]);
          }
        } else if (data.type === "peer-capabilities") {
          const sup = data.payload.supportsEncryption === true;
          peerSupportsEncryptionRef.current = sup;
          setPeerSupportsEncryption(sup);
        }
      };

      socket.onclose = () => {
        setSocketReady(false);
        if (cancelled || sessionEndedRef.current) return;
        const delay = Math.min(
          DEFAULT_RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttemptsRef.current,
          RECONNECT_MAX_DELAY_MS,
        );
        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current > MAX_TOTAL_RECONNECT_ATTEMPTS) {
          setError("Too many reconnect attempts");
          finalizeSession();
          return;
        }
        setIsReconnecting(true);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      socket.onerror = () => setError("WebSocket error");
    };

    connect();

    return () => {
      cancelled = true;
      socket?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [
    token,
    participantId,
    supportsEncryption,
    ensureEncryptionKey,
    finalizeSession,
  ]);

  /* -------------------------- Capability Announcement -------------------------- */
  useEffect(() => {
    if (!socketReady || capabilityAnnouncedRef.current) return;
    capabilityAnnouncedRef.current = true;
    const payload = {
      type: "announce-capabilities",
      payload: { supportsEncryption: supportsEncryption === true },
    };
    socketRef.current?.send(JSON.stringify(payload));
  }, [socketReady, supportsEncryption]);

  /* -------------------------- Message Sending -------------------------- */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      if (!participantId) return;

      const messageId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      let encryptedContent: string | undefined;

      if (supportsEncryption && peerSupportsEncryption) {
        try {
          const key = await ensureEncryptionKey();
          const iv = crypto.getRandomValues(new Uint8Array(12));
          const enc = textEncoder.encode(content);
          const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc);
          const ivB64 = btoa(String.fromCharCode(...Array.from(iv)));
          const ctB64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(ct))));
          encryptedContent = `${ivB64}.${ctB64}`;
        } catch (e) {
          logEvent("Encrypt fail", e);
        }
      }

      const payload: SignalPayload = {
        type: "message",
        message: {
          sessionId: token,
          messageId,
          participantId,
          role: participantRole ?? "guest",
          createdAt: new Date().toISOString(),
          encryptedContent,
          content: encryptedContent ? undefined : content,
          encryption: encryptedContent ? "aes-gcm" : "none",
        },
      };
      socketRef.current.send(JSON.stringify(payload));
    },
    [
      token,
      participantId,
      participantRole,
      supportsEncryption,
      peerSupportsEncryption,
      ensureEncryptionKey,
    ],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!draft.trim()) return;
      void sendMessage(draft.trim());
      setDraft("");
    },
    [draft, sendMessage],
  );

  /* -------------------------- End Session -------------------------- */
  const handleEndSession = useCallback(async () => {
    setEndSessionLoading(true);
    try {
      await fetch(`${apiUrl}/session/${token}/end`, { method: "POST" });
      finalizeSession("closed");
    } catch (e) {
      console.error("End session failed", e);
    } finally {
      setEndSessionLoading(false);
      setConfirmEndSessionOpen(false);
    }
  }, [token, finalizeSession]);

  /* -------------------------- Report Abuse -------------------------- */
  const handleReportAbuse = useCallback(
    async (values: ReportAbuseFormValues) => {
      try {
        await fetch(`${apiUrl}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, sessionToken: token }),
        });
        setReportAbuseOpen(false);
      } catch (e) {
        console.error("Report failed", e);
      }
    },
    [token],
  );

  /* -------------------------- UI Effects -------------------------- */
  useEffect(() => {
    const log = chatLogRef.current;
    if (!log) return;
    log.scrollTop = reverseMessageOrder ? 0 : log.scrollHeight;
  }, [messages, reverseMessageOrder]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    if (callState !== "active") return;
    callPanelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [callState]);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    el.srcObject = localStream;
    void el.play().catch(() => {});
    return () => { el.srcObject = null; };
  }, [localStream]);

  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    void el.play().catch(() => {});
    return () => { el.srcObject = null; };
  }, [remoteStream]);

  useEffect(() => {
    if (!remoteStream) return;
    setCallState(s => (["connecting", "incoming", "requesting"].includes(s) ? "active" : s));
  }, [remoteStream]);

  useEffect(() => {
    if (!isCallFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isCallFullscreen]);

  /* -------------------------- Notification on new msg -------------------------- */
  useEffect(() => {
    const known = knownMessageIdsRef.current;
    const remoteNew = messages
      .filter(m => !known.has(m.messageId) && m.participantId !== participantId);
    remoteNew.forEach(m => known.add(m.messageId));
    if (remoteNew.length && initialMessagesHandledRef.current) playNotificationTone();
    if (!initialMessagesHandledRef.current) initialMessagesHandledRef.current = true;
  }, [messages, participantId, playNotificationTone]);

  /* -------------------------- Cleanup on unmount -------------------------- */
  useEffect(() => cleanupAll, [cleanupAll]);

  /* -------------------------------------------------------------------- */
  /*                                 Render                               */
  /* -------------------------------------------------------------------- */
  const HeaderTimer = useMemo(() => {
    if (!headerTimerContainer || remainingSeconds === null) return null;
    return createPortal(
      <div className="flex items-center gap-2 text-sm font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          {Math.floor(remainingSeconds / 60)}:
          {String(remainingSeconds % 60).padStart(2, "0")}
        </span>
      </div>,
      headerTimerContainer,
    );
  }, [headerTimerContainer, remainingSeconds]);

  return (
    <>
      {HeaderTimer}
      <div className="flex flex-col h-full">
        {/* Header */}
        <header
          className={`sticky top-0 z-10 bg-background border-b transition-all ${
            headerCollapsed ? "py-1" : "py-3"
          }`}
        >
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setHeaderCollapsed(!headerCollapsed)}
                className="lg:hidden p-1 rounded hover:bg-muted"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <h1 className="text-lg font-semibold">Session</h1>
            </div>
            <div ref={setHeaderTimerContainer} className="flex items-center gap-2">
              {sessionStatus?.status === "active" && (
                <button
                  onClick={() => setConfirmEndSessionOpen(true)}
                  disabled={endSessionLoading}
                  className="px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md disabled:opacity-50"
                >
                  End Session
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ... rest of render (unchanged) ... */}
        {/* (same as your original render code) */}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                           Helper: useEventCallback                         */
/* -------------------------------------------------------------------------- */
function useEventCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef<T>(fn);
  useEffect(() => {
    ref.current = fn;
  }, [fn]);
  return useCallback(((...a: Parameters<T>) => ref.current(...a)) as T, []);
}