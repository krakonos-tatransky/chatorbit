"use client";

import type { FormEvent, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
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

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

type NotificationSoundPlayer = (context: AudioContext) => void;

const gentlyDisconnectNodes = (nodes: AudioNode[]) => {
  for (const node of nodes) {
    try {
      node.disconnect();
    } catch (cause) {
      console.warn("Failed to disconnect audio node", cause);
    }
  }
};

export const NOTIFICATION_SOUNDS = {
  gentleChime: (context: AudioContext) => {
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

    oscillator.onended = () => gentlyDisconnectNodes([oscillator, gain]);
    oscillator.start(now);
    oscillator.stop(now + duration);
  },
  icqInspired: (context: AudioContext) => {
    const now = context.currentTime;

    const createChirp = (
      startTime: number,
      config: {
        startFrequency: number;
        endFrequency: number;
        duration: number;
        gainPeak: number;
        type?: OscillatorType;
      },
    ) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const { startFrequency, endFrequency, duration, gainPeak, type = "triangle" } = config;

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(startFrequency, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startTime + duration * 0.7);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + duration * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.onended = () => gentlyDisconnectNodes([oscillator, gain]);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    createChirp(now, {
      startFrequency: 980,
      endFrequency: 620,
      duration: 0.22,
      gainPeak: 0.08,
    });

    createChirp(now + 0.18, {
      startFrequency: 540,
      endFrequency: 820,
      duration: 0.28,
      gainPeak: 0.07,
    });

    const softBedOscillator = context.createOscillator();
    const softBedGain = context.createGain();

    softBedOscillator.type = "sine";
    softBedOscillator.frequency.setValueAtTime(410, now + 0.05);
    softBedOscillator.frequency.linearRampToValueAtTime(520, now + 0.5);

    softBedGain.gain.setValueAtTime(0.0001, now + 0.05);
    softBedGain.gain.linearRampToValueAtTime(0.02, now + 0.1);
    softBedGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    softBedOscillator.connect(softBedGain);
    softBedGain.connect(context.destination);

    softBedOscillator.onended = () => gentlyDisconnectNodes([softBedOscillator, softBedGain]);
    softBedOscillator.start(now + 0.05);
    softBedOscillator.stop(now + 0.55);
  },
} satisfies Record<string, NotificationSoundPlayer>;

export type NotificationSoundName = keyof typeof NOTIFICATION_SOUNDS;
const DEFAULT_NOTIFICATION_SOUND: NotificationSoundName = "icqInspired";

type TimeoutHandle = ReturnType<typeof setTimeout> | number;

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

const DEFAULT_RECONNECT_BASE_DELAY_MS = 1000;
const FAST_NETWORK_RECONNECT_DELAY_MS = 400;
const MODERATE_NETWORK_RECONNECT_DELAY_MS = 700;
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

export function SessionView({ token, participantIdFromQuery, initialReportAbuseOpen = false }: Props) {
  const router = useRouter();
  const [participantId, setParticipantId] = useState<string | null>(participantIdFromQuery ?? null);
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
  const [sessionEndedFromStorage, setSessionEndedFromStorage] = useState(false);
  const [endSessionLoading, setEndSessionLoading] = useState(false);
  const [confirmEndSessionOpen, setConfirmEndSessionOpen] = useState(false);
  const [tokenCopyState, setTokenCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [socketReconnectNonce, setSocketReconnectNonce] = useState(0);
  const [peerResetNonce, setPeerResetNonce] = useState(0);
  const [supportsEncryption, setSupportsEncryption] = useState<boolean | null>(null);
  const [peerSupportsEncryption, setPeerSupportsEncryption] = useState<boolean | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [clientIdentity, setClientIdentity] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | null>(null);
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState | null>(null);
  const [iceGatheringState, setIceGatheringState] = useState<RTCIceGatheringState | null>(null);
  const [dataChannelState, setDataChannelState] = useState<RTCDataChannelState | null>(null);
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
  const [pipPosition, setPipPosition] = useState<{ left: number; top: number } | null>(null);
  const sessionHeaderId = useId();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [debugEvents, setDebugEvents] = useState<DebugLogEntry[]>([]);
  const [reconnectBaseDelayMs, setReconnectBaseDelayMs] = useState(DEFAULT_RECONNECT_BASE_DELAY_MS);
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
  const focusComposer = useCallback(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.focus();
    if (typeof composer.setSelectionRange === "function") {
      const length = composer.value.length;
      composer.setSelectionRange(length, length);
    }
  }, []);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingSignalsRef = useRef<SignalPayload[]>([]);
  const hasSentOfferRef = useRef<boolean>(false);
  const hashedMessagesRef = useRef<Map<string, EncryptedMessage>>(new Map());
  const encryptionKeyRef = useRef<CryptoKey | null>(null);
  const encryptionPromiseRef = useRef<Promise<CryptoKey> | null>(null);
  const tokenCopyTimeoutRef = useRef<number | null>(null);
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

  // Load terms acceptance
  useEffect(() => {
    if (typeof window === "undefined") return;
    let storedAccepted = false;
    try {
      storedAccepted = window.localStorage.getItem(termsStorageKey) === "true";
    } catch (cause) {
      console.warn("Unable to read stored terms acknowledgment", cause);
    }
    setTermsAccepted(storedAccepted);
    setLastTermsKeyChecked(termsStorageKey);
  }, [termsStorageKey]);

  // Handle initial report abuse from URL
  useEffect(() => {
    if (!initialReportAbuseOpen || initialReportHandledRef.current) return;
    initialReportHandledRef.current = true;
    setReportAbuseOpen(true);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("reportAbuse");
      const nextSearch = url.searchParams.toString();
      const nextPath = nextSearch ? `${url.pathname}?${nextSearch}` : url.pathname;
      router.replace(nextPath, { scroll: false });
    }
  }, [initialReportAbuseOpen, router]);

  // Scroll chat log
  useEffect(() => {
    const log = chatLogRef.current;
    if (!log) return;
    if (reverseMessageOrder) {
      log.scrollTop = 0;
    } else {
      log.scrollTop = log.scrollHeight;
    }
  }, [messages, reverseMessageOrder]);

  // Sync call state ref
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Scroll call panel into view
  useEffect(() => {
    if (callState !== "active") return;
    const panel = callPanelRef.current;
    if (!panel) return;
    try {
      panel.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch {
      panel.scrollIntoView({ block: "start" });
    }
  }, [callState]);

  // Local video
  useEffect(() => {
    const element = localVideoRef.current;
    if (!element) return;
    if (localStream) {
      element.srcObject = localStream;
      const playPromise = element.play();
      if (playPromise) void playPromise.catch(() => {});
    } else {
      element.srcObject = null;
    }
  }, [localStream]);

  // Remote video
  useEffect(() => {
    const element = remoteVideoRef.current;
    if (!element) return;
    if (remoteStream) {
      element.srcObject = remoteStream;
      const playPromise = element.play();
      if (playPromise) void playPromise.catch(() => {});
    } else {
      element.srcObject = null;
    }
  }, [remoteStream]);

  // Transition to active call
  useEffect(() => {
    if (!remoteStream) return;
    setCallState((current) => {
      if (current === "connecting" || current === "incoming" || current === "requesting") {
        return "active";
      }
      return current;
    });
  }, [remoteStream]);

  // Fullscreen overflow fix
  useEffect(() => {
    if (!isCallFullscreen) return;
    if (typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCallFullscreen]);

  // Clear call notice timeout
  useEffect(() => {
    return () => {
      if (callNoticeTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(callNoticeTimeoutRef.current);
        callNoticeTimeoutRef.current = null;
      }
    };
  }, []);

  // Audio context
  const ensureAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AudioContextClass =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
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
    if (!context) return;
    const selectedSoundName = notificationSoundRef.current;
    const selectedSound = NOTIFICATION_SOUNDS[selectedSoundName] ?? NOTIFICATION_SOUNDS.gentleChime;
    selectedSound(context);
  }, [ensureAudioContext]);

  // Resume audio on user gesture
  useEffect(() => {
    if (typeof window === "undefined") return;
    const resumeAudioContext = () => {
      const context = ensureAudioContext();
      if (!context) return;
      if (context.state === "suspended") {
        void context.resume().catch(() => {});
      }
      window.removeEventListener("pointerdown", resumeAudioContext);
      window.removeEventListener("keydown", resumeAudioContext);
    };
    window.addEventListener("pointerdown", resumeAudioContext);
    window.addEventListener("keydown", resumeAudioContext);
    return () => {
      window.removeEventListener("pointerdown", resumeAudioContext);
      window.removeEventListener("keydown", resumeAudioContext);
    };
  }, [ensureAudioContext]);

  // Reset on token change
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
    sessionEndedRef.current = false;
    setSessionEnded(false);
    setSessionEndedFromStorage(false);
  }, [token]);

  // Session active ref
  useEffect(() => {
    sessionActiveRef.current = sessionStatus?.status === "active";
  }, [sessionStatus?.status]);

  // Detect encryption support
  useEffect(() => {
    setSupportsEncryption(resolveCrypto() !== null);
  }, []);

  // Header timer portal
  useEffect(() => {
    if (typeof window === "undefined") return;
    const slot = document.getElementById("site-header-timer");
    setHeaderTimerContainer(slot);
    return () => setHeaderTimerContainer(null);
  }, []);

  // Touch device detection
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updateIsTouch = () => setIsTouchDevice(mediaQuery.matches);
    updateIsTouch();
    const handleChange = () => updateIsTouch();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Cleanup disconnection recovery
  useEffect(() => {
    return () => {
      if (disconnectionRecoveryTimeoutRef.current) {
        clearTimeout(disconnectionRecoveryTimeoutRef.current);
        disconnectionRecoveryTimeoutRef.current = null;
      }
    };
  }, []);

  // Debug mode activation
  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleKeydown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        secretBufferRef.current = "";
        setShowDebugPanel(false);
        return;
      }
      if (sessionStatus?.status !== "active") {
        secretBufferRef.current = "";
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.length !== 1) return;
      const nextBuffer = `${secretBufferRef.current}${event.key}`;
      secretBufferRef.current = nextBuffer.slice(-SECRET_DEBUG_KEYWORD.length);
      if (secretBufferRef.current.toLowerCase().includes(SECRET_DEBUG_KEYWORD)) {
        setShowDebugPanel(true);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [sessionStatus?.status]);

  // Debug panel observer
  useEffect(() => {
    if (!showDebugPanel) {
      setDebugEvents([]);
      setDebugObserver(null);
      return;
    }
    setDebugEvents([]);
    const observer: DebugObserver = (entry) => {
      setDebugEvents((prev) => {
        const next = [...prev, entry];
        return next.length > 25 ? next.slice(-25) : next;
      });
    };
    setDebugObserver(observer);
    return () => setDebugObserver(null);
  }, [showDebugPanel]);

  // Debug panel state
  useEffect(() => {
    if (!showDebugPanel) return;
    let cancelled = false;
    if (clientIdentity === null) {
      void getClientIdentity().then((identity) => {
        if (!cancelled) setClientIdentity(identity);
      });
    }
    const pc = peerConnectionRef.current;
    setConnectionState(pc?.connectionState ?? null);
    setIceConnectionState(pc?.iceConnectionState ?? null);
    setIceGatheringState(pc?.iceGatheringState ?? null);
    setDataChannelState(dataChannelRef.current?.readyState ?? null);
    return () => { cancelled = true; };
  }, [showDebugPanel, clientIdentity]);

  // Debug stats
  useEffect(() => {
    if (!showDebugPanel) return;
    const interval = window.setInterval(() => {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      logEvent("STATS", {
        iceConnectionState: pc.iceConnectionState,
        connectionState: pc.connectionState,
        signalingState: pc.signalingState,
        candidatePairs: pc.getSenders().length,
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [showDebugPanel]);

  // Close AudioContext
  useEffect(() => {
    return () => {
      const context = audioContextRef.current;
      if (context) {
        audioContextRef.current = null;
        context.close().catch(() => {});
      }
    };
  }, []);

  // Encryption key
  const ensureEncryptionKey = useCallback(async () => {
    if (supportsEncryption !== true) throw new Error("Encryption not supported.");
    if (encryptionKeyRef.current) return encryptionKeyRef.current;
    if (!encryptionPromiseRef.current) {
      encryptionPromiseRef.current = deriveKey(token)
        .then((key) => {
          encryptionKeyRef.current = key;
          return key;
        })
        .finally(() => { encryptionPromiseRef.current = null; });
    }
    return encryptionPromiseRef.current;
  }, [supportsEncryption, token]);

  // Play notification on new message
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
    if (newMessages.some((msg) => msg.participantId !== participantId)) {
      playNotificationTone();
    }
  }, [messages, participantId, playNotificationTone]);

  // Copy token
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

  useEffect(() => {
    return () => {
      if (tokenCopyTimeoutRef.current) {
        window.clearTimeout(tokenCopyTimeoutRef.current);
        tokenCopyTimeoutRef.current = null;
      }
    };
  }, []);

  // Stop local media tracks
  const stopRemoteMediaTracks = useCallback(() => {
    const stream = remoteStreamRef.current;
    if (!stream) return;
    remoteStreamRef.current = null;
    setRemoteStream(null);
  }, []);

  const stopLocalMediaTracks = useCallback((pc?: RTCPeerConnection | null) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const senders = pc?.getSenders() ?? [];
    for (const track of stream.getTracks()) {
      try { track.stop(); } catch (cause) { console.warn("Failed to stop track", cause); }
      if (!pc) continue;
      const sender = senders.find(s => s.track?.id === track.id);
      if (sender) {
        try { pc.removeTrack(sender); } catch (cause) { console.warn("Failed to remove sender", cause); }
      }
    }
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  // Reset peer connection
  const resetPeerConnection = useCallback(({ recreate = true, delayMs }: { recreate?: boolean; delayMs?: number } = {}) => {
    if (iceRetryTimeoutRef.current) { clearTimeout(iceRetryTimeoutRef.current); iceRetryTimeoutRef.current = null; }
    if (disconnectionRecoveryTimeoutRef.current) { clearTimeout(disconnectionRecoveryTimeoutRef.current); disconnectionRecoveryTimeoutRef.current = null; }
    const existing = peerConnectionRef.current;
    if (existing) {
      stopLocalMediaTracks(existing);
      stopRemoteMediaTracks();
      try { existing.close(); } catch (cause) { console.warn("Failed to close RTCPeerConnection", cause); }
    }
    peerConnectionRef.current = null;
    dataChannelRef.current = null;
    iceFailureRetriesRef.current = 0;
    setConnectionState(null);
    setIceConnectionState(null);
    setIceGatheringState(null);
    setDataChannelState(null);
    setCallState("idle");
    setIncomingCallFrom(null);
    setCallDialogOpen(false);
    negotiationPendingRef.current = false;
    if (callNoticeTimeoutRef.current) { clearTimeout(callNoticeTimeoutRef.current); callNoticeTimeoutRef.current = null; }
    setCallNotice(null);
    pendingCandidatesRef.current = [];
    pendingSignalsRef.current = [];
    hasSentOfferRef.current = false;
    setConnected(false);
    capabilityAnnouncedRef.current = false;
    peerSupportsEncryptionRef.current = null;
    setPeerSupportsEncryption(null);
    if (!recreate) { setIsReconnecting(false); return; }
    if (delayMs && delayMs > 0) {
      iceRetryTimeoutRef.current = setTimeout(() => {
        iceRetryTimeoutRef.current = null;
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          setPeerResetNonce(v => v + 1);
        }
      }, delayMs);
    } else {
      setPeerResetNonce(v => v + 1);
    }
  }, [stopLocalMediaTracks, stopRemoteMediaTracks]);

  // Finalize session
  const finalizeSession = useCallback((status: "closed" | "expired" | "deleted" = "closed") => {
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    setSessionEnded(true);
    setError(current => current === "WebSocket error" ? null : current);
    setIsReconnecting(false);
    setSocketReady(false);
    sessionActiveRef.current = false;
    if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
    if (disconnectionRecoveryTimeoutRef.current) { clearTimeout(disconnectionRecoveryTimeoutRef.current); disconnectionRecoveryTimeoutRef.current = null; }
    const context = audioContextRef.current;
    if (context) {
      audioContextRef.current = null;
      context.close().catch(() => {});
    }
    resetPeerConnection({ recreate: false });
    stopRemoteMediaTracks();
    const socket = socketRef.current;
    if (socket) {
      socketRef.current = null;
      try { socket.close(); } catch (cause) { console.warn("Failed to close WebSocket", cause); }
    }
    setSessionStatus(prev => {
      if (!prev) return prev;
      const nextStatus = status;
      if (prev.status === nextStatus && prev.remainingSeconds === 0) return prev;
      return { ...prev, status: nextStatus, remainingSeconds: 0 };
    });
    setRemainingSeconds(0);
  }, [resetPeerConnection, stopRemoteMediaTracks]);

  // Schedule recovery
  const schedulePeerConnectionRecovery = useCallback((
    pc: RTCPeerConnection,
    reason: string,
    { delayMs }: { delayMs?: number } = {},
  ) => {
    if (peerConnectionRef.current !== pc) return;
    if (!sessionActiveRef.current) return;
    const explicitDelay = delayMs ?? reconnectBaseDelayMs;
    const effectiveDelay = Math.max(0, explicitDelay);
    if (disconnectionRecoveryTimeoutRef.current) {
      clearTimeout(disconnectionRecoveryTimeoutRef.current);
      disconnectionRecoveryTimeoutRef.current = null;
    }
    setIsReconnecting(true);
    const runReset = () => {
      disconnectionRecoveryTimeoutRef.current = null;
      if (peerConnectionRef.current !== pc || !sessionActiveRef.current) return;
      logEvent("Resetting peer connection after interruption", { reason, delayMs: effectiveDelay });
      resetPeerConnection();
    };
    const shouldAttemptIceRestart = participantRole === "host" && (delayMs === undefined || effectiveDelay > 0);
    if (shouldAttemptIceRestart) {
      let restarted = false;
      if (typeof pc.restartIce === "function") {
        try {
          pc.restartIce();
          restarted = true;
          logEvent("Requested ICE restart", { reason });
        } catch (cause) { console.warn("Failed to restart ICE", cause); }
      }
      if (restarted) {
        renegotiateRef.current?.();
        if (effectiveDelay > 0) {
          logEvent("Waiting for ICE restart", { reason, delayMs: effectiveDelay });
          disconnectionRecoveryTimeoutRef.current = setTimeout(() => {
            disconnectionRecoveryTimeoutRef.current = null;
            if (peerConnectionRef.current !== pc || !sessionActiveRef.current) return;
            logEvent("ICE restart failed; resetting", { reason, delayMs: effectiveDelay });
            resetPeerConnection();
          }, effectiveDelay);
          return;
        }
      }
    }
    if (effectiveDelay === 0) { runReset(); return; }
    logEvent("Scheduling peer reset", { reason, delayMs: effectiveDelay });
    disconnectionRecoveryTimeoutRef.current = setTimeout(runReset, effectiveDelay);
  }, [participantRole, reconnectBaseDelayMs, resetPeerConnection]);

    // Create peer connection
  const createPeerConnection = useCallback(async () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      logEvent("Cannot create peer connection: socket not open");
      return null;
    }
    if (peerConnectionRef.current) {
      logEvent("Peer connection already exists");
      return peerConnectionRef.current;
    }

    const iceServers = await getIceServers();
    const configuration: RTCConfiguration = {
      iceServers,
      iceCandidatePoolSize: 10,
    };

    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    // Data channel
    const dataChannel = pc.createDataChannel("chat", {
      negotiated: false,
      id: 1,
      ordered: true,
    });
    dataChannelRef.current = dataChannel;

    // Event handlers
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const payload: SignalPayload = {
        type: "ice-candidate",
        payload: event.candidate.toJSON(),
      };
      socketRef.current?.send(JSON.stringify(payload));
    };

    pc.onicecandidateerror = (event) => {
      logEvent("ICE candidate error", event);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnectionState(state);
      logEvent("Connection state", state);
      if (state === "failed" || state === "closed") {
        schedulePeerConnectionRecovery(pc, `connectionstatechange:${state}`);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      setIceConnectionState(state);
      logEvent("ICE connection state", state);
      if (state === "failed") {
        iceFailureRetriesRef.current += 1;
        if (iceFailureRetriesRef.current >= MAX_ICE_FAILURE_RETRIES) {
          schedulePeerConnectionRecovery(pc, "ice-failed-max-retries");
        } else {
          schedulePeerConnectionRecovery(pc, "ice-failed-retry", { delayMs: 1000 * iceFailureRetriesRef.current });
        }
      } else if (state === "disconnected") {
        schedulePeerConnectionRecovery(pc, "ice-disconnected", { delayMs: reconnectBaseDelayMs });
      } else if (state === "connected" || state === "completed") {
        iceFailureRetriesRef.current = 0;
      }
    };

    pc.onicegatheringstatechange = () => {
      setIceGatheringState(pc.iceGatheringState);
    };

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      if (channel.label !== "chat") return;
      dataChannelRef.current = channel;
      setupDataChannel(channel);
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      remoteStreamRef.current = remoteStream;
      setRemoteStream(remoteStream);
    };

    pc.onnegotiationneeded = () => {
      if (negotiationPendingRef.current) return;
      negotiationPendingRef.current = true;
      renegotiateRef.current = async () => {
        if (!peerConnectionRef.current || negotiationPendingRef.current === false) return;
        negotiationPendingRef.current = false;
        await createAndSendOffer();
      };
      void renegotiateRef.current();
    };

    return pc;
  }, [reconnectBaseDelayMs, schedulePeerConnectionRecovery]);

  // Setup data channel
  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    channel.onopen = () => {
      setDataChannelState(channel.readyState);
      setConnected(true);
      wasConnectedRef.current = true;
      setIsReconnecting(false);
      iceFailureRetriesRef.current = 0;
      logEvent("Data channel opened");
      if (pendingSignalsRef.current.length > 0) {
        for (const signal of pendingSignalsRef.current) {
          channel.send(JSON.stringify(signal));
        }
        pendingSignalsRef.current = [];
      }
    };

    channel.onclose = () => {
      setDataChannelState(channel.readyState);
      setConnected(false);
      logEvent("Data channel closed");
    };

    channel.onerror = (event) => {
      logEvent("Data channel error", event);
    };

    channel.onmessage = async (event) => {
      if (typeof event.data !== "string") return;
      let payload: SignalPayload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      await handleSignal(payload);
    };
  }, []);

  // Create and send offer
  const createAndSendOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || hasSentOfferRef.current) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const payload: SignalPayload = {
        type: "offer",
        payload: offer,
      };
      if (dataChannelRef.current?.readyState === "open") {
        dataChannelRef.current.send(JSON.stringify(payload));
      } else {
        pendingSignalsRef.current.push(payload);
      }
      hasSentOfferRef.current = true;
    } catch (cause) {
      logEvent("Failed to create offer", cause);
    }
  }, []);

  // Handle signal
  const handleSignal = useCallback(async (signal: SignalPayload) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    if (signal.type === "offer" && signal.payload) {
      const offer = signal.payload as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const payload: SignalPayload = { type: "answer", payload: answer };
      if (dataChannelRef.current?.readyState === "open") {
        dataChannelRef.current.send(JSON.stringify(payload));
      } else {
        pendingSignalsRef.current.push(payload);
      }
    } else if (signal.type === "answer" && signal.payload) {
      const answer = signal.payload as RTCSessionDescriptionInit;
      await pc.setRemoteDescription(answer);
    } else if (signal.type === "ice-candidate" && signal.payload) {
      const candidate = new RTCIceCandidate(signal.payload as RTCIceCandidateInit);
      await pc.addIceCandidate(candidate);
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

  // Start call
  const startCall = useCallback(async (isVideo: boolean) => {
    if (callStateRef.current !== "idle") return;
    setCallState("requesting");
    const pc = await createPeerConnection();
    if (!pc) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: isVideo
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
        : false,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    for (const track of stream.getTracks()) {
      const sender = pc.addTrack(track, stream);
      if (
        track.kind === "video" &&
        typeof sender.getParameters === "function" &&
        typeof sender.setParameters === "function"
      ) {
        try {
          const parameters = sender.getParameters();
          if (parameters.codecs && parameters.codecs.length > 1) {
            const preferredCodec =
              parameters.codecs.find((codec) =>
                codec.mimeType.toLowerCase().includes("vp9")
              ) ?? parameters.codecs.find((codec) => codec.mimeType.toLowerCase().includes("vp8"));
            if (preferredCodec) {
              parameters.codecs = [
                preferredCodec,
                ...parameters.codecs.filter((codec) => codec !== preferredCodec),
              ];
            }
          }
          const encodings = (parameters.encodings && parameters.encodings.length > 0
            ? parameters.encodings
            : [{}]
          ).map((encoding) => ({
            ...encoding,
            maxBitrate: Math.max(1_200_000, encoding.maxBitrate ?? 0),
          }));
          parameters.encodings = encodings;
          await sender.setParameters(parameters);
        } catch (cause) {
          console.warn("Failed to configure video sender", cause);
        }
      }
    }

    const payload: SignalPayload = {
      type: "call-request",
      from: participantId ?? undefined,
    };
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(payload));
    } else {
      pendingSignalsRef.current.push(payload);
    }
  }, [createPeerConnection, participantId]);

  // Accept call
  const acceptCall = useCallback(async () => {
    if (callStateRef.current !== "incoming") return;
    setCallState("connecting");
    setCallDialogOpen(false);
    const pc = await createPeerConnection();
    if (!pc) return;

    const payload: SignalPayload = { type: "call-accepted" };
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(payload));
    } else {
      pendingSignalsRef.current.push(payload);
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }
  }, [createPeerConnection]);

  // End call
  const endCall = useCallback(() => {
    stopLocalMediaTracks();
    stopRemoteMediaTracks();
    setCallState("idle");
    setIncomingCallFrom(null);
    setCallDialogOpen(false);
    const payload: SignalPayload = { type: "call-ended" };
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(payload));
    }
  }, [stopLocalMediaTracks, stopRemoteMediaTracks]);

  // Toggle mute
  const toggleMute = useCallback((kind: "audio" | "video") => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const tracks = kind === "audio" ? stream.getAudioTracks() : stream.getVideoTracks();
    for (const track of tracks) {
      track.enabled = !track.enabled;
    }
    if (kind === "audio") {
      setIsLocalAudioMuted(!isLocalAudioMuted);
    } else {
      setIsLocalVideoMuted(!isLocalVideoMuted);
    }
  }, [isLocalAudioMuted, isLocalVideoMuted]);

  // PiP drag handlers
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
    const state = pipDragStateRef.current;
    if (!state || e.pointerId !== state.pointerId) return;
    const x = e.clientX - state.offsetX;
    const y = e.clientY - state.offsetY;
    setPipPosition({ left: x, top: y });
  });

  const handlePipPointerUp = useEventCallback((e: PointerEvent) => {
    const state = pipDragStateRef.current;
    if (!state || e.pointerId !== state.pointerId) return;
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

  // WebSocket
  useEffect(() => {
    if (!token || participantId === null) return;
    let cancelled = false;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (cancelled) return;
      const url = `${wsUrl}/ws/session/${token}?participantId=${participantId}`;
      socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        setSocketReady(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        setIsReconnecting(false);
        logEvent("WebSocket connected");
      };

      socket.onmessage = async (event) => {
        let data: any;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (data.type === "session-status") {
          const status: SessionStatus = data.payload;
          setSessionStatus(status);
          setRemainingSeconds(status.remainingSeconds ?? null);
          if (status.status === "closed" || status.status === "expired" || status.status === "deleted") {
            finalizeSession(status.status);
          }
        } else if (data.type === "message") {
          const msg: EncryptedMessage = data.payload;
          if (hashedMessagesRef.current.has(msg.messageId)) return;
          hashedMessagesRef.current.set(msg.messageId, msg);
          if (msg.deleted) {
            setMessages(prev => prev.filter(m => m.messageId !== msg.messageId));
            return;
          }
          if (msg.encryptedContent && supportsEncryption) {
            try {
              const key = await ensureEncryptionKey();
              const iv = new Uint8Array(atob(msg.encryptedContent.split(".")[0]).split("").map(c => c.charCodeAt(0)));
              const ct = new Uint8Array(atob(msg.encryptedContent.split(".")[1]).split("").map(c => c.charCodeAt(0)));
              const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
              const content = textDecoder.decode(decrypted);
              setMessages(prev => [...prev, {
                messageId: msg.messageId,
                participantId: msg.participantId,
                role: msg.role,
                content,
                createdAt: msg.createdAt,
              }]);
            } catch (cause) {
              logEvent("Decryption failed", cause);
            }
          } else if (msg.content) {
            setMessages(prev => [...prev, {
              messageId: msg.messageId,
              participantId: msg.participantId,
              role: msg.role,
              content: msg.content,
              createdAt: msg.createdAt,
            }]);
          }
        } else if (data.type === "peer-capabilities") {
          const supports = data.payload.supportsEncryption === true;
          peerSupportsEncryptionRef.current = supports;
          setPeerSupportsEncryption(supports);
        }
      };

      socket.onclose = (event) => {
        setSocketReady(false);
        if (cancelled) return;
        if (sessionEndedRef.current) return;
        const delay = Math.min(
          reconnectBaseDelayMs * 2 ** reconnectAttemptsRef.current,
          RECONNECT_MAX_DELAY_MS
        );
        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current > MAX_TOTAL_RECONNECT_ATTEMPTS) {
          setError("Connection lost. Too many retries.");
          finalizeSession();
          return;
        }
        setIsReconnecting(true);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!cancelled) connect();
        }, delay);
      };

      socket.onerror = () => {
        setError("WebSocket error");
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (socket) socket.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [token, participantId, supportsEncryption, ensureEncryptionKey, finalizeSession, reconnectBaseDelayMs]);

  // Announce capabilities
  useEffect(() => {
    if (!socketReady || capabilityAnnouncedRef.current) return;
    capabilityAnnouncedRef.current = true;
    const payload = {
      type: "announce-capabilities",
      payload: { supportsEncryption: supportsEncryption === true },
    };
    socketRef.current?.send(JSON.stringify(payload));
  }, [socketReady, supportsEncryption]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    if (!participantId) return;

    const messageId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    let encryptedContent: string | undefined;
    if (supportsEncryption && peerSupportsEncryption) {
      try {
        const key = await ensureEncryptionKey();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = textEncoder.encode(content);
        const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
        const ivB64 = uint8ArrayToBase64(iv);
        const ctB64 = uint8ArrayToBase64(new Uint8Array(ct));
        encryptedContent = `${ivB64}.${ctB64}`;
      } catch (cause) {
        logEvent("Encryption failed", cause);
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
  }, [token, participantId, participantRole, supportsEncryption, peerSupportsEncryption, ensureEncryptionKey]);

  // Submit handler
  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    void sendMessage(draft.trim());
    setDraft("");
  }, [draft, sendMessage]);

  // End session
  const handleEndSession = useCallback(async () => {
    setEndSessionLoading(true);
    try {
      await fetch(`${apiUrl}/session/${token}/end`, { method: "POST" });
      finalizeSession("closed");
    } catch (cause) {
      console.error("Failed to end session", cause);
    } finally {
      setEndSessionLoading(false);
      setConfirmEndSessionOpen(false);
    }
  }, [token, finalizeSession]);

  // Report abuse
  const handleReportAbuse = useCallback(async (values: ReportAbuseFormValues) => {
    try {
      await fetch(`${apiUrl}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, sessionToken: token }),
      });
      setReportAbuseOpen(false);
    } catch (cause) {
      console.error("Failed to report", cause);
    }
  }, [token]);

  // Derive encryption key
  const deriveKey = async (token: string): Promise<CryptoKey> => {
    const cryptoObj = resolveCrypto();
    if (!cryptoObj) throw new Error("Crypto not available");
    const material = textEncoder.encode(token);
    const hash = await cryptoObj.subtle.digest("SHA-256", material);
    return cryptoObj.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
  };

  // Header timer
  const HeaderTimer = useMemo(() => {
    if (!headerTimerContainer || remainingSeconds === null) return null;
    return createPortal(
      <div className="flex items-center gap-2 text-sm font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")}</span>
      </div>,
      headerTimerContainer
    );
  }, [headerTimerContainer, remainingSeconds]);

  return (
    <>
      {HeaderTimer}
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className={`sticky top-0 z-10 bg-background border-b transition-all duration-300 ${headerCollapsed ? "py-1" : "py-3"}`}>
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setHeaderCollapsed(!headerCollapsed)}
                className="lg:hidden p-1 rounded hover:bg-muted"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold">Session</h1>
            </div>
            <div className="flex items-center gap-2">
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

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive text-center">
              {error}
            </div>
          )}

          {sessionEnded && (
            <div className="p-8 text-center">
              <p className="text-lg font-medium">This session has ended.</p>
              <Link href="/" className="mt-4 inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md">
                Create New Session
              </Link>
            </div>
          )}

          {!sessionEnded && (
            <div className="h-full flex flex-col">
              {/* Chat log */}
              <div
                ref={chatLogRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
                style={{ scrollBehavior: "smooth" }}
              >
                {messages.map((msg) => (
                  <div
                    key={msg.messageId}
                    className={`flex ${msg.participantId === participantId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.participantId === participantId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Composer */}
              <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex gap-2">
                  <textarea
                    ref={composerRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 resize-none rounded-md border p-2 text-sm"
                    rows={1}
                    maxLength={sessionStatus?.messageCharLimit ?? 1000}
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || !socketReady}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Call UI */}
        {callState !== "idle" && (
          <div
            ref={callPanelRef}
            className={`fixed inset-0 z-50 flex flex-col bg-background ${isCallFullscreen ? "" : "rounded-lg m-4"}`}
          >
            {/* Call header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Video Call</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCallFullscreen(!isCallFullscreen)}
                  className="p-2 hover:bg-muted rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
                  </svg>
                </button>
                <button
                  onClick={endCall}
                  className="p-2 hover:bg-destructive/10 text-destructive rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Video grid */}
            <div className="flex-1 relative overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div
                ref={pipContainerRef}
                className="absolute bottom-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden cursor-move"
                style={pipPosition ? { left: pipPosition.left, top: pipPosition.top } : undefined}
                onPointerDown={handlePipPointerDown}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Call controls */}
            <div className="flex items-center justify-center gap-4 p-4 border-t">
              <button
                onClick={() => toggleMute("audio")}
                className={`p-3 rounded-full ${isLocalAudioMuted ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}
              >
                {isLocalAudioMuted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M5.636 5.636l12.728 12.728M12 8v4m0 4v.01" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => toggleMute("video")}
                className={`p-3 rounded-full ${isLocalVideoMuted ? "bg-destructive text-destructive-foreground" : "bg-muted"}`}
              >
                {isLocalVideoMuted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <button
                onClick={endCall}
                className="p-3 bg-destructive text-destructive-foreground rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Modals */}
        <ConfirmDialog
          open={confirmEndSessionOpen}
          title="End Session"
          description="Are you sure you want to end this session? This cannot be undone."
          confirmLabel="End Session"
          cancelLabel="Cancel"
          confirmDisabled={endSessionLoading}
          onConfirm={() => {
            void handleEndSession();
          }}
          onCancel={() => setConfirmEndSessionOpen(false)}
        />

        <TermsConsentModal
          open={!termsAccepted && lastTermsKeyChecked === termsStorageKey}
          onAccept={() => {
            try {
              window.localStorage.setItem(termsStorageKey, "true");
            } catch {}
            setTermsAccepted(true);
          }}
        />

        <ReportAbuseModal
          open={reportAbuseOpen}
          onOpenChange={setReportAbuseOpen}
          onSubmit={handleReportAbuse}
        />

        {/* Call dialog */}
        {callDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
            <div className="bg-background p-6 rounded-lg shadow-lg max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-2">Incoming Call</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {incomingCallFrom} is calling...
              </p>
              <div className="flex gap-3">
                <button
                  onClick={acceptCall}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md"
                >
                  Accept
                </button>
                <button
                  onClick={() => {
                    setCallDialogOpen(false);
                    setCallState("idle");
                    const payload: SignalPayload = { type: "call-rejected" };
                    dataChannelRef.current?.send(JSON.stringify(payload));
                  }}
                  className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-md"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Debug panel */}
        {showDebugPanel && (
          <div className="fixed inset-0 z-50 bg-background/95 overflow-auto p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Debug Panel</h2>
                <button
                  onClick={() => setShowDebugPanel(false)}
                  className="p-2 hover:bg-muted rounded"
                >
                  Close
                </button>
              </div>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto">
                {JSON.stringify({
                  participantId,
                  clientIdentity,
                  connectionState,
                  iceConnectionState,
                  dataChannelState,
                  messagesCount: messages.length,
                  reconnectAttempts: reconnectAttemptsRef.current,
                }, null, 2)}
              </pre>
              <div className="mt-4 space-y-2">
                {debugEvents.map((e, i) => (
                  <div key={i} className="text-xs font-mono">
                    [{new Date(e.timestamp).toISOString()}] {e.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Helper hook
function useEventCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; }, [fn]);
  return useCallback(((...args: any[]) => ref.current(...args)) as T, []);
}