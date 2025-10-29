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
const SECRET_DEBUG_KEYWORD = "orbitdebug";

function logEvent(message: string, ...details: unknown[]) {
  console.log(`[SessionView] ${message}`, ...details);
  if (debugObserver) {
    debugObserver({ timestamp: Date.now(), message, details });
  }
}

type IceCandidateStats = {
  candidateType: string | null;
  protocol: string | null;
  relayProtocol: string | null;
  address: string | null;
  port: string | null;
};

type IceRouteInfo = {
  display: string;
  label: string;
  localDetail: string | null;
  remoteDetail: string | null;
  localType: string | null;
  remoteType: string | null;
};

function extractIceCandidateStats(candidate: any): IceCandidateStats {
  if (!candidate || typeof candidate !== "object") {
    return {
      candidateType: null,
      protocol: null,
      relayProtocol: null,
      address: null,
      port: null,
    };
  }

  const candidateType = typeof candidate.candidateType === "string" ? candidate.candidateType : null;
  const protocol = typeof candidate.protocol === "string" ? candidate.protocol : null;
  const relayProtocol = typeof candidate.relayProtocol === "string" ? candidate.relayProtocol : null;
  const address =
    typeof candidate.address === "string"
      ? candidate.address
      : typeof candidate.ip === "string"
        ? candidate.ip
        : null;
  const portValue = candidate.port ?? candidate.portNumber;
  const port =
    typeof portValue === "number"
      ? `${portValue}`
      : typeof portValue === "string"
        ? portValue
        : null;

  return { candidateType, protocol, relayProtocol, address, port };
}

function formatCandidateDetail(candidate: IceCandidateStats): string | null {
  if (!candidate.candidateType && !candidate.protocol && !candidate.relayProtocol && !candidate.address) {
    return null;
  }
  const protocol = candidate.relayProtocol ?? candidate.protocol;
  const location = candidate.address ? (candidate.port ? `${candidate.address}:${candidate.port}` : candidate.address) : null;
  return [candidate.candidateType, protocol ? protocol.toUpperCase() : null, location].filter(Boolean).join(" · ");
}

function describeRouteLabel(localType: string | null, remoteType: string | null): string {
  if (localType === "relay" || remoteType === "relay") {
    return "TURN relay";
  }
  if (
    localType === "srflx" ||
    remoteType === "srflx" ||
    localType === "prflx" ||
    remoteType === "prflx"
  ) {
    return "STUN (reflexive)";
  }
  if (localType === "host" && remoteType === "host") {
    return "Direct (host)";
  }
  const parts = [localType ? `local ${localType}` : null, remoteType ? `remote ${remoteType}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "Unknown";
}

function summarizeIceRoute(localCandidate: any, remoteCandidate: any): IceRouteInfo {
  const local = extractIceCandidateStats(localCandidate);
  const remote = extractIceCandidateStats(remoteCandidate);
  const label = describeRouteLabel(local.candidateType, remote.candidateType);
  const localDetail = formatCandidateDetail(local);
  const remoteDetail = formatCandidateDetail(remote);
  const detailParts = [localDetail ? `Local ${localDetail}` : null, remoteDetail ? `Remote ${remoteDetail}` : null].filter(Boolean);
  const display = detailParts.length > 0 ? `${label} – ${detailParts.join(" | ")}` : label;

  return {
    display,
    label,
    localDetail,
    remoteDetail,
    localType: local.candidateType,
    remoteType: remote.candidateType,
  };
}

async function getSelectedIceRoute(peerConnection: RTCPeerConnection): Promise<IceRouteInfo | null> {
  if (typeof peerConnection.getStats !== "function") {
    return null;
  }

  try {
    const stats = await peerConnection.getStats();
    let selectedPair: any = null;

    stats.forEach((report) => {
      if (selectedPair) {
        return;
      }
      if (report.type === "transport") {
        const candidatePairId = (report as any).selectedCandidatePairId;
        if (candidatePairId) {
          const pair = stats.get(candidatePairId as string);
          if (pair) {
            selectedPair = pair;
          }
        }
      }
    });

    if (!selectedPair) {
      stats.forEach((report) => {
        if (selectedPair) {
          return;
        }
        if (report.type === "candidate-pair" && ((report as any).selected || (report as any).nominated)) {
          selectedPair = report;
        }
      });
    }

    if (!selectedPair) {
      return null;
    }

    const localCandidateId = (selectedPair as any).localCandidateId;
    const remoteCandidateId = (selectedPair as any).remoteCandidateId;

    if (!localCandidateId && !remoteCandidateId) {
      return null;
    }

    const localCandidate = localCandidateId ? stats.get(localCandidateId as string) : undefined;
    const remoteCandidate = remoteCandidateId ? stats.get(remoteCandidateId as string) : undefined;

    return summarizeIceRoute(localCandidate, remoteCandidate);
  } catch (error) {
    logEvent("Failed to inspect ICE route", { error: error instanceof Error ? error.message : error });
    return null;
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
  const [selectedIceRoute, setSelectedIceRoute] = useState<string | null>(null);
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
  const shouldRestoreFullscreenOnPortraitRef = useRef(false);
  const isCallFullscreenRef = useRef(isCallFullscreen);
  const focusComposer = useCallback(() => {
    const composer = composerRef.current;
    if (!composer) {
      return;
    }
    composer.focus();
    if (typeof composer.setSelectionRange === "function") {
      const length = composer.value.length;
      composer.setSelectionRange(length, length);
    }
  }, []);
  const focusCallPanel = useCallback(() => {
    const panel = callPanelRef.current;
    if (!panel) {
      return;
    }
    try {
      panel.focus({ preventScroll: true });
    } catch {
      panel.focus();
    }
  }, []);
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
  const headerRevealTimeoutRef = useRef<TimeoutHandle | null>(null);
  const wasConnectedRef = useRef(false);
  const previousMediaPanelVisibleRef = useRef(false);
  const reconnectTimeoutRef = useRef<TimeoutHandle | null>(null);
  const iceFailureRetriesRef = useRef(0);
  const iceRetryTimeoutRef = useRef<TimeoutHandle | null>(null);
  const lastIceRouteLabelRef = useRef<string | null>(null);
  const lastIceRouteTypesRef = useRef<{ localType: string | null; remoteType: string | null } | null>(null);
  const forcedRelayRef = useRef(false);
  const iceRestartAttemptsRef = useRef(0);
  const iceRestartInProgressRef = useRef(false);
  const disconnectionRecoveryTimeoutRef = useRef<TimeoutHandle | null>(null);
  const sessionActiveRef = useRef(false);
  const sessionEndedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const initialMessagesHandledRef = useRef(false);
  const notificationSoundRef = useRef<NotificationSoundName>(DEFAULT_NOTIFICATION_SOUND);
  const secretBufferRef = useRef<string>("");
  const negotiationPendingRef = useRef(false);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let storedAccepted = false;
    try {
      storedAccepted = window.localStorage.getItem(termsStorageKey) === "true";
    } catch (cause) {
      console.warn("Unable to read stored terms acknowledgment", cause);
    }

    setTermsAccepted(storedAccepted);
    setLastTermsKeyChecked(termsStorageKey);
  }, [termsStorageKey]);

  useEffect(() => {
    if (!initialReportAbuseOpen || initialReportHandledRef.current) {
      return;
    }
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

  useEffect(() => {
    const log = chatLogRef.current;
    if (!log) {
      return;
    }

    if (reverseMessageOrder) {
      log.scrollTop = 0;
    } else {
      log.scrollTop = log.scrollHeight;
    }
  }, [messages, reverseMessageOrder]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    isCallFullscreenRef.current = isCallFullscreen;
  }, [isCallFullscreen]);

  useEffect(() => {
    if (typeof window === "undefined" || !isTouchDevice || callState !== "active") {
      return;
    }
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const portraitQuery = window.matchMedia("(orientation: portrait)");

    const handleOrientationChange = () => {
      const isPortrait = portraitQuery.matches;
      if (!isPortrait) {
        if (isCallFullscreenRef.current) {
          shouldRestoreFullscreenOnPortraitRef.current = true;
          setIsCallFullscreen(false);
          setPipPosition(null);
          pipDragStateRef.current = null;
          focusCallPanel();
        } else {
          shouldRestoreFullscreenOnPortraitRef.current = false;
        }
      } else if (shouldRestoreFullscreenOnPortraitRef.current && !isCallFullscreenRef.current) {
        setIsCallFullscreen(true);
        shouldRestoreFullscreenOnPortraitRef.current = false;
      }
    };

    handleOrientationChange();

    const listener = () => {
      handleOrientationChange();
    };

    if (typeof portraitQuery.addEventListener === "function") {
      portraitQuery.addEventListener("change", listener);
      return () => {
        portraitQuery.removeEventListener("change", listener);
      };
    }

    portraitQuery.addListener(listener);
    return () => {
      portraitQuery.removeListener(listener);
    };
  }, [callState, focusCallPanel, isTouchDevice, setIsCallFullscreen, setPipPosition]);

  useEffect(() => {
    if (callState !== "active") {
      shouldRestoreFullscreenOnPortraitRef.current = false;
    }
  }, [callState]);

  useEffect(() => {
    if (callState !== "active") {
      return;
    }
    const panel = callPanelRef.current;
    if (!panel) {
      return;
    }
    try {
      panel.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch {
      panel.scrollIntoView({ block: "start" });
    }
  }, [callState]);

  useEffect(() => {
    const element = localVideoRef.current;
    if (!element) {
      return;
    }
    if (localStream) {
      element.srcObject = localStream;
      const playPromise = element.play();
      if (playPromise) {
        void playPromise.catch(() => {});
      }
    } else {
      element.srcObject = null;
    }
  }, [localStream]);

  useEffect(() => {
    const element = remoteVideoRef.current;
    if (!element) {
      return;
    }
    if (remoteStream) {
      element.srcObject = remoteStream;
      const playPromise = element.play();
      if (playPromise) {
        void playPromise.catch(() => {});
      }
    } else {
      element.srcObject = null;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!remoteStream) {
      return;
    }
    setCallState((current) => {
      if (current === "connecting" || current === "incoming" || current === "requesting") {
        return "active";
      }
      return current;
    });
  }, [remoteStream]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const resumeVideoPlayback = () => {
      if (document.hidden) {
        return;
      }

      const localElement = localVideoRef.current;
      const localStream = localStreamRef.current;
      if (localElement && localStream) {
        if (localElement.srcObject !== localStream) {
          localElement.srcObject = localStream;
        }
        const playPromise = localElement.play();
        if (playPromise) {
          void playPromise.catch(() => {});
        }
      }

      const remoteElement = remoteVideoRef.current;
      const remoteStream = remoteStreamRef.current;
      if (remoteElement && remoteStream) {
        if (remoteElement.srcObject !== remoteStream) {
          remoteElement.srcObject = remoteStream;
        }
        const playPromise = remoteElement.play();
        if (playPromise) {
          void playPromise.catch(() => {});
        }
      }
    };

    window.addEventListener("focus", resumeVideoPlayback);
    window.addEventListener("pageshow", resumeVideoPlayback);
    document.addEventListener("visibilitychange", resumeVideoPlayback);

    return () => {
      window.removeEventListener("focus", resumeVideoPlayback);
      window.removeEventListener("pageshow", resumeVideoPlayback);
      document.removeEventListener("visibilitychange", resumeVideoPlayback);
    };
  }, []);

  useEffect(() => {
    if (!isCallFullscreen) {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCallFullscreen]);

  useEffect(() => {
    return () => {
      if (callNoticeTimeoutRef.current && typeof window !== "undefined") {
        window.clearTimeout(callNoticeTimeoutRef.current);
        callNoticeTimeoutRef.current = null;
      }
    };
  }, []);

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

    const selectedSoundName = notificationSoundRef.current;
    const selectedSound =
      NOTIFICATION_SOUNDS[selectedSoundName] ?? NOTIFICATION_SOUNDS.gentleChime;
    selectedSound(context);
  }, [ensureAudioContext]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const resumeAudioContext = () => {
      const context = ensureAudioContext();
      if (!context) {
        return;
      }

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

  useEffect(() => {
    sessionActiveRef.current = sessionStatus?.status === "active";
  }, [sessionStatus?.status]);

  useEffect(() => {
    setSupportsEncryption(resolveCrypto() !== null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const slot = document.getElementById("site-header-timer");
    setHeaderTimerContainer(slot);

    return () => {
      setHeaderTimerContainer(null);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updateIsTouch = () => {
      setIsTouchDevice(mediaQuery.matches);
    };

    updateIsTouch();

    const handleChange = () => {
      updateIsTouch();
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (disconnectionRecoveryTimeoutRef.current) {
        clearTimeout(disconnectionRecoveryTimeoutRef.current);
        disconnectionRecoveryTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === "Escape") {
        secretBufferRef.current = "";
        setShowDebugPanel(false);
        return;
      }
      if (sessionStatus?.status !== "active") {
        secretBufferRef.current = "";
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key.length !== 1) {
        return;
      }
      const nextBuffer = `${secretBufferRef.current}${event.key}`;
      secretBufferRef.current = nextBuffer.slice(-SECRET_DEBUG_KEYWORD.length);
      if (secretBufferRef.current.toLowerCase().includes(SECRET_DEBUG_KEYWORD)) {
        setShowDebugPanel(true);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [sessionStatus?.status]);

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
        if (next.length > 25) {
          return next.slice(next.length - 25);
        }
        return next;
      });
    };
    setDebugObserver(observer);

    return () => {
      setDebugObserver(null);
    };
  }, [showDebugPanel]);

  useEffect(() => {
    if (!showDebugPanel) {
      return;
    }

    let cancelled = false;
    if (clientIdentity === null) {
      void getClientIdentity().then((identity) => {
        if (!cancelled) {
          setClientIdentity(identity);
        }
      });
    }

    const pc = peerConnectionRef.current;
    setConnectionState(pc?.connectionState ?? null);
    setIceConnectionState(pc?.iceConnectionState ?? null);
    setIceGatheringState(pc?.iceGatheringState ?? null);
    setDataChannelState(dataChannelRef.current?.readyState ?? null);

    return () => {
      cancelled = true;
    };
  }, [showDebugPanel, clientIdentity]);

  useEffect(() => {
    if (!showDebugPanel) {
      setSelectedIceRoute(null);
      lastIceRouteLabelRef.current = null;
      lastIceRouteTypesRef.current = null;
      return;
    }

    let cancelled = false;

    const updateSelectedRoute = async () => {
      const pc = peerConnectionRef.current;
      if (!pc) {
        if (!cancelled) {
          setSelectedIceRoute(null);
          lastIceRouteLabelRef.current = null;
        }
        return;
      }

      const route = await getSelectedIceRoute(pc);
      if (cancelled) {
        return;
      }

      if (route) {
        setSelectedIceRoute(route.display);
        lastIceRouteTypesRef.current = {
          localType: route.localType ?? null,
          remoteType: route.remoteType ?? null,
        };
        if (lastIceRouteLabelRef.current !== route.label) {
          lastIceRouteLabelRef.current = route.label;
          logEvent("Selected ICE route", {
            label: route.label,
            localDetail: route.localDetail,
            remoteDetail: route.remoteDetail,
            localType: route.localType,
            remoteType: route.remoteType,
          });
        }
      } else {
        setSelectedIceRoute(null);
        lastIceRouteLabelRef.current = null;
        lastIceRouteTypesRef.current = null;
      }
    };

    void updateSelectedRoute();

    const interval = window.setInterval(() => {
      const pc = peerConnectionRef.current;
      if (pc) {
        logEvent("STATS", {
          iceConnectionState: pc.iceConnectionState,
          connectionState: pc.connectionState,
          signalingState: pc.signalingState,
          candidatePairs: pc.getSenders().length,
        });
      }
      void updateSelectedRoute();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [showDebugPanel]);

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

  const stopLocalMediaTracks = useCallback(
    (pc?: RTCPeerConnection | null) => {
      const stream = localStreamRef.current;
      if (!stream) {
        return;
      }
      const senders = pc?.getSenders() ?? [];
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch (cause) {
          console.warn("Failed to stop local media track", cause);
        }
        if (!pc) {
          continue;
        }
        const sender = senders.find((candidate) => candidate.track && candidate.track.id === track.id);
        if (sender) {
          try {
            pc.removeTrack(sender);
          } catch (cause) {
            console.warn("Failed to remove RTCRtpSender", cause);
          }
        }
      }
      localStreamRef.current = null;
      setLocalStream(null);
    },
    [setLocalStream],
  );

  const resetPeerConnection = useCallback(
    ({ recreate = true, delayMs }: { recreate?: boolean; delayMs?: number } = {}) => {
      if (iceRetryTimeoutRef.current) {
        clearTimeout(iceRetryTimeoutRef.current);
        iceRetryTimeoutRef.current = null;
      }
      if (disconnectionRecoveryTimeoutRef.current) {
        clearTimeout(disconnectionRecoveryTimeoutRef.current);
        disconnectionRecoveryTimeoutRef.current = null;
      }
      lastIceRouteLabelRef.current = null;
      lastIceRouteTypesRef.current = null;
      forcedRelayRef.current = false;
      iceRestartAttemptsRef.current = 0;
      iceRestartInProgressRef.current = false;
      const existing = peerConnectionRef.current;
      if (existing) {
        stopLocalMediaTracks(existing);
        remoteStreamRef.current = null;
        setRemoteStream(null);
        try {
          existing.close();
        } catch (cause) {
          console.warn("Failed to close RTCPeerConnection", cause);
        }
      }
      peerConnectionRef.current = null;
      dataChannelRef.current = null;
      setConnectionState(null);
      setIceConnectionState(null);
      setIceGatheringState(null);
      setDataChannelState(null);
      setSelectedIceRoute(null);
      setCallState("idle");
      setIncomingCallFrom(null);
      setCallDialogOpen(false);
      negotiationPendingRef.current = false;
      if (callNoticeTimeoutRef.current) {
        clearTimeout(callNoticeTimeoutRef.current);
        callNoticeTimeoutRef.current = null;
      }
      setCallNotice(null);
      pendingCandidatesRef.current = [];
      pendingSignalsRef.current = [];
      hasSentOfferRef.current = false;
      setConnected(false);
      capabilityAnnouncedRef.current = false;
      peerSupportsEncryptionRef.current = null;
      setPeerSupportsEncryption(null);
      if (!recreate) {
        setIsReconnecting(false);
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
    [
      setConnected,
      setIsReconnecting,
      setPeerResetNonce,
      setConnectionState,
      setIceConnectionState,
      setIceGatheringState,
      setDataChannelState,
      setCallState,
      setIncomingCallFrom,
      setCallDialogOpen,
      setCallNotice,
      setRemoteStream,
      setSelectedIceRoute,
      stopLocalMediaTracks,
    ],
  );

  const finalizeSession = useCallback(
    (status: "closed" | "expired" | "deleted" = "closed") => {
      if (sessionEndedRef.current) {
        return;
      }
      sessionEndedRef.current = true;
      setSessionEnded(true);
      setError((current) => (current === "WebSocket error" ? null : current));
      setIsReconnecting(false);
      setSocketReady(false);
      sessionActiveRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (disconnectionRecoveryTimeoutRef.current) {
        clearTimeout(disconnectionRecoveryTimeoutRef.current);
        disconnectionRecoveryTimeoutRef.current = null;
      }
      resetPeerConnection({ recreate: false });
      const socket = socketRef.current;
      if (socket) {
        socketRef.current = null;
        try {
          socket.close();
        } catch (cause) {
          console.warn("Failed to close WebSocket during finalization", cause);
        }
      }
      setSessionStatus((prev) => {
        if (!prev) {
          return prev;
        }
        const nextStatus = status;
        if (prev.status === nextStatus && prev.remainingSeconds === 0) {
          return prev;
        }
        return { ...prev, status: nextStatus, remainingSeconds: 0 };
      });
      setRemainingSeconds(0);
    },
    [
      resetPeerConnection,
      setError,
      setIsReconnecting,
      setSessionEnded,
      setSessionStatus,
      setSocketReady,
      setRemainingSeconds,
    ],
  );

  const hasRelayIceServers = useMemo(() => {
    const servers = getIceServers();
    return servers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return urls.some((url) =>
        typeof url === "string" ? url.trim().toLowerCase().startsWith("turn") : false,
      );
    });
  }, []);

  const schedulePeerConnectionRecovery = useCallback(
    (
      pc: RTCPeerConnection,
      reason: string,
      { delayMs }: { delayMs?: number } = {},
    ) => {
      if (participantRole === "host") {
        return;
      }
      if (disconnectionRecoveryTimeoutRef.current) {
        return;
      }
      const effectiveDelay = delayMs ?? reconnectBaseDelayMs;
      setIsReconnecting(true);
      disconnectionRecoveryTimeoutRef.current = setTimeout(() => {
        disconnectionRecoveryTimeoutRef.current = null;
        if (peerConnectionRef.current !== pc) {
          return;
        }
        if (!sessionActiveRef.current) {
          return;
        }
        logEvent("Resetting peer connection after interruption", { reason, delayMs: effectiveDelay });
        resetPeerConnection();
      }, effectiveDelay);
    },
    [participantRole, reconnectBaseDelayMs, resetPeerConnection, setIsReconnecting],
  );

  const forceRelayRouting = useCallback(
    (reason: string) => {
      if (!hasRelayIceServers) {
        logEvent("Skipping relay-only enforcement because no TURN servers are configured", { reason });
        return false;
      }
      const pc = peerConnectionRef.current;
      if (!pc) {
        return false;
      }
      if (forcedRelayRef.current) {
        return true;
      }
      if (typeof pc.getConfiguration !== "function" || typeof pc.setConfiguration !== "function") {
        return false;
      }

      try {
        const currentConfig = pc.getConfiguration();
        if (currentConfig.iceTransportPolicy === "relay") {
          forcedRelayRef.current = true;
          return true;
        }

        const nextConfig: RTCConfiguration = {
          ...currentConfig,
          iceServers: currentConfig.iceServers ? [...currentConfig.iceServers] : currentConfig.iceServers,
          iceTransportPolicy: "relay",
        };
        pc.setConfiguration(nextConfig);
        forcedRelayRef.current = true;
        logEvent("Forced ICE transport policy to relay", { reason });
        return true;
      } catch (error) {
        logEvent("Failed to enforce relay transport policy", {
          reason,
          error: error instanceof Error ? error.message : error,
        });
        return false;
      }
    },
    [hasRelayIceServers],
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

  const updateLastIceRouteTypes = useCallback(
    async (pc?: RTCPeerConnection | null) => {
      const connection = pc ?? peerConnectionRef.current;
      if (!connection) {
        return;
      }
      const route = await getSelectedIceRoute(connection);
      if (!route) {
        lastIceRouteTypesRef.current = null;
        return;
      }
      lastIceRouteTypesRef.current = {
        localType: route.localType ?? null,
        remoteType: route.remoteType ?? null,
      };
    },
    [],
  );

  const requestIceRestart = useCallback(
    async (reason: string, { preferRelay = false }: { preferRelay?: boolean } = {}) => {
      if (!sessionActiveRef.current) {
        return false;
      }
      const pc = peerConnectionRef.current;
      if (!pc) {
        return false;
      }
      if (iceRestartInProgressRef.current) {
        logEvent("ICE restart already in progress", { reason });
        return true;
      }
      if (pc.signalingState !== "stable") {
        logEvent("Skipping ICE restart while signaling is unstable", {
          reason,
          signalingState: pc.signalingState,
        });
        return false;
      }
      if (iceRestartAttemptsRef.current >= MAX_ICE_FAILURE_RETRIES) {
        logEvent("Skipping ICE restart because maximum attempts were reached", {
          reason,
          attempts: iceRestartAttemptsRef.current,
        });
        return false;
      }

      if (preferRelay) {
        forceRelayRouting(reason);
      }

      iceRestartInProgressRef.current = true;
      setIsReconnecting(true);

      try {
        logEvent("Attempting ICE restart", { reason });
        if (typeof pc.restartIce === "function") {
          try {
            pc.restartIce();
          } catch (error) {
            logEvent("restartIce() threw", { reason, error: error instanceof Error ? error.message : error });
          }
        }
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        if (participantRole === "host") {
          hasSentOfferRef.current = true;
        }
        sendSignal("offer", offer);
        iceRestartAttemptsRef.current += 1;
        return true;
      } catch (error) {
        logEvent("Failed to restart ICE", { reason, error: error instanceof Error ? error.message : error });
        return false;
      } finally {
        iceRestartInProgressRef.current = false;
      }
    },
    [forceRelayRouting, participantRole, sendSignal, setIsReconnecting],
  );

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    type NetworkInformationLike = {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
      removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
    };

    const extendedNavigator = navigator as Navigator & {
      connection?: NetworkInformationLike;
      mozConnection?: NetworkInformationLike;
      webkitConnection?: NetworkInformationLike;
    };

    const connection =
      extendedNavigator.connection ?? extendedNavigator.mozConnection ?? extendedNavigator.webkitConnection;

    if (!connection || typeof connection.addEventListener !== "function") {
      return;
    }

    const deriveDelay = () => {
      const effectiveType = connection.effectiveType;
      if (effectiveType === "4g") {
        return FAST_NETWORK_RECONNECT_DELAY_MS;
      }
      if (effectiveType === "3g") {
        return MODERATE_NETWORK_RECONNECT_DELAY_MS;
      }
      return DEFAULT_RECONNECT_BASE_DELAY_MS;
    };

    const updateDelay = () => {
      const nextDelay = deriveDelay();
      setReconnectBaseDelayMs((current) => (current === nextDelay ? current : nextDelay));
    };

    updateDelay();

    const handleChange = () => {
      updateDelay();
      logEvent("Network change detected", {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
      });
      if (!sessionActiveRef.current) {
        return;
      }
      const pc = peerConnectionRef.current;
      if (!pc) {
        return;
      }
      setIsReconnecting(true);
      if (participantRole === "host") {
        resetPeerConnection();
      } else {
        schedulePeerConnectionRecovery(pc, "network change", { delayMs: 0 });
      }
    };

    connection.addEventListener("change", handleChange);

    return () => {
      connection.removeEventListener("change", handleChange);
    };
  }, [participantRole, resetPeerConnection, schedulePeerConnectionRecovery, setIsReconnecting]);

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

  const sendCallMessage = useCallback(
    (action: string, detail: Record<string, unknown> = {}) => {
      if (!participantId) {
        return;
      }
      const channel = dataChannelRef.current;
      if (!channel || channel.readyState !== "open") {
        return;
      }
      const payload = { type: "call", action, from: participantId, ...detail };
      try {
        channel.send(JSON.stringify(payload));
        logEvent("Sent call control message", payload);
      } catch (cause) {
        console.warn("Failed to send call control message", cause);
      }
    },
    [participantId],
  );

  const showCallNotice = useCallback(
    (message: string | null) => {
      if (typeof window !== "undefined" && callNoticeTimeoutRef.current) {
        window.clearTimeout(callNoticeTimeoutRef.current);
        callNoticeTimeoutRef.current = null;
      }
      setCallNotice(message);
      if (message && typeof window !== "undefined") {
        callNoticeTimeoutRef.current = window.setTimeout(() => {
          setCallNotice(null);
          callNoticeTimeoutRef.current = null;
        }, 4000);
      }
    },
    [setCallNotice],
  );

  const renegotiate = useCallback(async () => {
    if (participantRole !== "host") {
      return;
    }
    const pc = peerConnectionRef.current;
    if (!pc) {
      return;
    }
    if (pc.signalingState !== "stable") {
      logEvent("Deferring renegotiation until signaling state stabilizes", {
        signalingState: pc.signalingState,
      });
      negotiationPendingRef.current = true;
      return;
    }
    negotiationPendingRef.current = false;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal("offer", offer);
      logEvent("Sent renegotiation offer for media tracks");
    } catch (cause) {
      console.error("Failed to renegotiate media", cause);
    }
  }, [participantRole, sendSignal]);

  const requestRenegotiation = useCallback(() => {
    if (participantRole === "host") {
      void renegotiate();
    } else {
      sendCallMessage("renegotiate");
    }
  }, [participantRole, renegotiate, sendCallMessage]);

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Media devices are not available.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    for (const track of stream.getVideoTracks()) {
      track.enabled = !isLocalVideoMuted;
    }
    for (const track of stream.getAudioTracks()) {
      track.enabled = !isLocalAudioMuted;
    }
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, [isLocalAudioMuted, isLocalVideoMuted]);

  const attachLocalMedia = useCallback(async () => {
    const stream = await ensureLocalStream();
    const pc = peerConnectionRef.current;
    if (!pc) {
      throw new Error("Peer connection is not ready.");
    }
    const senders = pc.getSenders();
    for (const track of stream.getTracks()) {
      const sender = senders.find((candidate) => candidate.track?.kind === track.kind);
      if (sender) {
        try {
          await sender.replaceTrack(track);
        } catch (cause) {
          console.warn("Failed to replace track on sender", cause);
        }
      } else {
        pc.addTrack(track, stream);
      }
    }
    return stream;
  }, [ensureLocalStream]);

  const teardownCall = useCallback(
    (
      {
        notifyPeer = false,
        renegotiate: shouldRenegotiate = true,
      }: { notifyPeer?: boolean; renegotiate?: boolean } = {},
    ) => {
      const pc = peerConnectionRef.current;
      stopLocalMediaTracks(pc ?? undefined);
      remoteStreamRef.current = null;
      setRemoteStream(null);
      setCallState("idle");
      setIncomingCallFrom(null);
      setCallDialogOpen(false);
      negotiationPendingRef.current = false;
      if (notifyPeer) {
        sendCallMessage("end");
      }
      if (shouldRenegotiate) {
        requestRenegotiation();
      }
    },
    [
      requestRenegotiation,
      sendCallMessage,
      setCallDialogOpen,
      setCallState,
      setIncomingCallFrom,
      setRemoteStream,
      stopLocalMediaTracks,
    ],
  );

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
        if (payload.type === "call") {
          const action = typeof payload.action === "string" ? payload.action : null;
          const fromParticipant = typeof payload.from === "string" ? payload.from : null;
          if (!action) {
            return;
          }
          if (action === "request") {
            if (callState === "active" || callState === "connecting") {
              sendCallMessage("busy");
              showCallNotice("Peer requested a video chat, but you're already in a call.");
              return;
            }
            if (callState === "requesting") {
              setCallDialogOpen(false);
              setCallState("connecting");
              try {
                await attachLocalMedia();
                if (callStateRef.current !== "connecting") {
                  stopLocalMediaTracks(peerConnectionRef.current ?? undefined);
                  return;
                }
                sendCallMessage("accept");
                requestRenegotiation();
                showCallNotice("Video chat request accepted.");
              } catch (cause) {
                console.error("Failed to auto-accept video chat", cause);
                showCallNotice("Unable to start video chat.");
                setCallState("idle");
                sendCallMessage("reject");
                stopLocalMediaTracks(peerConnectionRef.current ?? undefined);
              }
              return;
            }
            setIncomingCallFrom(fromParticipant);
            setCallDialogOpen(true);
            setCallState("incoming");
            showCallNotice("Video chat request received.");
            return;
          }
          if (action === "cancel") {
            if (callState !== "idle") {
              const shouldRenegotiate = localStreamRef.current !== null;
              teardownCall({ notifyPeer: false, renegotiate: shouldRenegotiate });
              showCallNotice("Video chat request cancelled.");
            }
            return;
          }
          if (action === "accept") {
            setCallDialogOpen(false);
            setIncomingCallFrom(null);
            setCallState("connecting");
            try {
              await attachLocalMedia();
              if (callStateRef.current !== "connecting") {
                stopLocalMediaTracks(peerConnectionRef.current ?? undefined);
                return;
              }
              requestRenegotiation();
              showCallNotice("Starting video chat…");
            } catch (cause) {
              console.error("Failed to attach local media after acceptance", cause);
              showCallNotice("Unable to start video chat.");
              setCallState("idle");
              sendCallMessage("reject");
              stopLocalMediaTracks(peerConnectionRef.current ?? undefined);
            }
            return;
          }
          if (action === "reject") {
            if (callState === "requesting" || callState === "connecting") {
              const shouldRenegotiate = localStreamRef.current !== null;
              teardownCall({ notifyPeer: false, renegotiate: shouldRenegotiate });
              showCallNotice("Video chat request declined.");
            }
            return;
          }
          if (action === "end") {
            if (callState !== "idle") {
              teardownCall({ notifyPeer: false });
              showCallNotice("Video chat ended.");
            }
            return;
          }
          if (action === "renegotiate") {
            if (participantRole === "host") {
              void renegotiate();
            }
            return;
          }
          if (action === "busy") {
            if (callState === "requesting") {
              const shouldRenegotiate = localStreamRef.current !== null;
              teardownCall({ notifyPeer: false, renegotiate: shouldRenegotiate });
              showCallNotice("Peer is already in a video chat.");
            }
            return;
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
    (channel: RTCDataChannel, owner: RTCPeerConnection | null) => {
      dataChannelRef.current = channel;
      setDataChannelState(channel.readyState);
      logEvent("Attached data channel", { label: channel.label, readyState: channel.readyState });
      channel.onopen = () => {
        setConnected(true);
        setError(null);
        iceFailureRetriesRef.current = 0;
        setIsReconnecting(false);
        if (disconnectionRecoveryTimeoutRef.current) {
          clearTimeout(disconnectionRecoveryTimeoutRef.current);
          disconnectionRecoveryTimeoutRef.current = null;
        }
        logEvent("Data channel opened", { label: channel.label });
        capabilityAnnouncedRef.current = false;
        sendCapabilities();
        setDataChannelState(channel.readyState);
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
        setDataChannelState(channel.readyState);
        if (sessionActiveRef.current) {
          setIsReconnecting(true);
        }
        if (owner && peerConnectionRef.current === owner && sessionActiveRef.current) {
          schedulePeerConnectionRecovery(owner, "data channel closed");
        }
      };
      channel.onerror = () => {
        setConnected(false);
        peerSupportsEncryptionRef.current = null;
        setPeerSupportsEncryption(null);
        logEvent("Data channel encountered an error", { label: channel.label });
        setDataChannelState(channel.readyState);
        if (sessionActiveRef.current) {
          setIsReconnecting(true);
        }
        if (owner && peerConnectionRef.current === owner && sessionActiveRef.current) {
          schedulePeerConnectionRecovery(owner, "data channel error");
        }
      };
      channel.onmessage = (event) => {
        logEvent("Data channel message received", { label: channel.label, length: event.data?.length });
        void handlePeerMessage(event.data);
      };
    },
    [
      handlePeerMessage,
      participantRole,
      schedulePeerConnectionRecovery,
      sendCapabilities,
      setIsReconnecting,
      setDataChannelState,
    ],
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
    if (!termsAccepted) {
      return;
    }
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
    setConnectionState(peerConnection.connectionState);
    setIceConnectionState(peerConnection.iceConnectionState);
    setIceGatheringState(peerConnection.iceGatheringState);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && event.candidate.candidate) {
        const candidate = typeof event.candidate.toJSON === "function" ? event.candidate.toJSON() : event.candidate;
        sendSignal("iceCandidate", candidate);
        logEvent("Discovered ICE candidate", candidate);
      } else {
        sendSignal("iceCandidate", null);
        logEvent("ICE candidate gathering complete");
      }
    };

    peerConnection.onicegatheringstatechange = () => {
      setIceGatheringState(peerConnection.iceGatheringState);
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      logEvent("Connection state", state);
      setConnectionState(state);

      if (state === "connected") {
        void updateLastIceRouteTypes(peerConnection);
        iceFailureRetriesRef.current = 0;
        reconnectAttemptsRef.current = 0;
        setIsReconnecting(false);
        if (disconnectionRecoveryTimeoutRef.current) {
          clearTimeout(disconnectionRecoveryTimeoutRef.current);
          disconnectionRecoveryTimeoutRef.current = null;
        }
        if (dataChannelRef.current?.readyState === "open") {
          setConnected(true);
          setError(null);
        } else {
          logEvent("Peer connection connected but data channel not yet open", {
            dataChannelState: dataChannelRef.current?.readyState ?? "missing",
          });
        }
      } else if (state === "disconnected") {
        setConnected(false);
        if (sessionActiveRef.current) {
          if (!disconnectionRecoveryTimeoutRef.current) {
            setIsReconnecting(true);
            disconnectionRecoveryTimeoutRef.current = setTimeout(() => {
              if (peerConnectionRef.current?.connectionState === "disconnected") {
                logEvent("Connection disconnected >10s - resetting");
                disconnectionRecoveryTimeoutRef.current = null;
                resetPeerConnection();
              } else {
                disconnectionRecoveryTimeoutRef.current = null;
              }
            }, 10000);
          }
          if (participantRole === "host") {
            hasSentOfferRef.current = false;
          }
        }
      } else if (state === "failed") {
        setConnected(false);
        if (sessionActiveRef.current) {
          setIsReconnecting(true);
          if (disconnectionRecoveryTimeoutRef.current) {
            clearTimeout(disconnectionRecoveryTimeoutRef.current);
            disconnectionRecoveryTimeoutRef.current = null;
          }
          logEvent("Connection FAILED - awaiting ICE restart");
        }
      } else if (state === "closed") {
        setConnected(false);
        if (participantRole === "host") {
          hasSentOfferRef.current = false;
        }
      }

      if (
        state === "disconnected" &&
        participantRole !== "host" &&
        peerConnectionRef.current === peerConnection &&
        sessionActiveRef.current &&
        !iceRestartInProgressRef.current
      ) {
        schedulePeerConnectionRecovery(peerConnection, "peer connection disconnected");
      } else if (
        state === "failed" &&
        participantRole !== "host" &&
        peerConnectionRef.current === peerConnection &&
        sessionActiveRef.current &&
        !iceRestartInProgressRef.current
      ) {
        schedulePeerConnectionRecovery(peerConnection, "peer connection failed", { delayMs: 0 });
      }
    };

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      logEvent("ICE connection state", state);
      setIceConnectionState(state);

      if (state === "connected" || state === "completed") {
        void updateLastIceRouteTypes(peerConnection);
      }

      if (state === "connected") {
        iceFailureRetriesRef.current = 0;
        iceRestartAttemptsRef.current = 0;
        return;
      }

      if (peerConnectionRef.current !== peerConnection) {
        return;
      }

      if (state !== "failed" && state !== "disconnected") {
        return;
      }

      const preferRelay =
        hasRelayIceServers &&
        lastIceRouteTypesRef.current !== null &&
        lastIceRouteTypesRef.current.localType !== "relay" &&
        lastIceRouteTypesRef.current.remoteType !== "relay";
      const reason = `ice connection ${state}`;

      if (participantRole === "host") {
        void (async () => {
          const restarted = await requestIceRestart(reason, { preferRelay });
          if (!restarted && state === "failed") {
            if (iceFailureRetriesRef.current < MAX_ICE_FAILURE_RETRIES) {
              const attempt = iceFailureRetriesRef.current + 1;
              iceFailureRetriesRef.current = attempt;
              setIsReconnecting(true);
              resetPeerConnection({ delayMs: 1000 * attempt });
              logEvent("ICE connection failed; scheduling retry", { attempt });
            } else {
              setError("Connection failed. Please refresh to retry.");
              logEvent("ICE connection failed and maximum retries reached");
              setIsReconnecting(false);
            }
          }
        })();
        return;
      }

      if (!sessionActiveRef.current) {
        return;
      }

      void (async () => {
        const restarted = await requestIceRestart(reason, { preferRelay });
        if (!restarted) {
          const delayMs = state === "failed" ? 0 : reconnectBaseDelayMs;
          schedulePeerConnectionRecovery(peerConnection, reason, { delayMs });
        }
      })();
    };

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) {
        return;
      }
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      setCallState((current) => {
        if (current === "connecting" || current === "incoming" || current === "requesting") {
          return "active";
        }
        return current;
      });
      const handleTrackUpdate = () => {
        const currentStream = remoteStreamRef.current;
        if (!currentStream) {
          return;
        }
        const hasLiveTrack = currentStream.getTracks().some((track) => track.readyState !== "ended");
        if (!hasLiveTrack) {
          const hadStream = remoteStreamRef.current !== null;
          remoteStreamRef.current = null;
          setRemoteStream(null);
          if (hadStream) {
            teardownCall({ notifyPeer: false });
            showCallNotice("Video chat ended.");
          }
        }
      };
      stream.addEventListener("removetrack", handleTrackUpdate);
      for (const track of stream.getTracks()) {
        track.addEventListener("ended", handleTrackUpdate);
      }
    };

    peerConnection.onsignalingstatechange = () => {
      if (
        peerConnection.signalingState === "stable" &&
        negotiationPendingRef.current &&
        participantRole === "host"
      ) {
        negotiationPendingRef.current = false;
        void renegotiate();
      }
    };

    peerConnection.addEventListener("icecandidateerror", (event: RTCPeerConnectionIceErrorEvent) => {
      const { hostCandidate } = event as RTCPeerConnectionIceErrorEvent & { hostCandidate?: string };
      const { errorCode, errorText, url } = event;
      logEvent("ICE candidate error", { errorCode, errorText, url, hostCandidate });

      if (errorCode === 438 && iceFailureRetriesRef.current < MAX_ICE_FAILURE_RETRIES) {
        const attempt = iceFailureRetriesRef.current + 1;
        iceFailureRetriesRef.current = attempt;

        const delay = Math.min(1000 * 2 ** attempt, 10000);
        logEvent("Stale nonce detected, retrying", { attempt, delay });

        if (sessionActiveRef.current) {
          setIsReconnecting(true);
        }

        setTimeout(() => {
          if (sessionActiveRef.current) {
            if (participantRole === "host") {
              resetPeerConnection();
            } else {
              const connection = peerConnectionRef.current;
              if (connection) {
                schedulePeerConnectionRecovery(connection, "stale nonce", { delayMs: 0 });
              }
            }
          }
        }, delay);
      }
    });

    if (participantRole === "host") {
      logEvent("Creating data channel as host");
      const channel = peerConnection.createDataChannel("chat");
      attachDataChannel(channel, peerConnection);
    } else {
      peerConnection.ondatachannel = (event) => {
        logEvent("Received data channel", { label: event.channel.label });
        attachDataChannel(event.channel, peerConnection);
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
    renegotiate,
    resetPeerConnection,
    reconnectBaseDelayMs,
    schedulePeerConnectionRecovery,
    requestIceRestart,
    updateLastIceRouteTypes,
    sendSignal,
    setCallState,
    setRemoteStream,
    showCallNotice,
    teardownCall,
    termsAccepted,
    hasRelayIceServers,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = sessionStorage.getItem(`chatOrbit.session.${token}`);
    if (!stored) {
      return;
    }
    try {
      const payload = JSON.parse(stored);
      if (!participantId && payload.participantId) {
        setParticipantId(payload.participantId);
      }
      if (payload.role !== undefined) {
        setParticipantRole(payload.role ?? null);
      }
      const candidateStatus = typeof payload.status === "string" ? payload.status : null;
      const allowedStatuses: SessionStatus["status"][] = [
        "issued",
        "active",
        "closed",
        "expired",
        "deleted",
      ];
      const storedStatus: SessionStatus["status"] = candidateStatus &&
        allowedStatuses.includes(candidateStatus as SessionStatus["status"])
        ? (candidateStatus as SessionStatus["status"])
        : payload.sessionActive
          ? "active"
          : "issued";
      const storedRemaining: number | null =
        typeof payload.remainingSeconds === "number" ? payload.remainingSeconds : null;
      const ended =
        Boolean(payload.sessionEnded) ||
        storedStatus === "closed" ||
        storedStatus === "expired" ||
        storedStatus === "deleted";
      setSessionEndedFromStorage(ended);
      setSessionStatus((prev) =>
        prev ?? {
          token,
          status: ended
            ? storedStatus === "expired"
              ? "expired"
              : storedStatus === "deleted"
                ? "deleted"
                : "closed"
            : storedStatus,
          validityExpiresAt: payload.sessionExpiresAt ?? payload.sessionStartedAt ?? new Date().toISOString(),
          sessionStartedAt: payload.sessionStartedAt,
          sessionExpiresAt: payload.sessionExpiresAt,
          messageCharLimit: payload.messageCharLimit,
          participants: [],
          remainingSeconds: ended ? 0 : storedRemaining,
        },
      );
      if (storedRemaining !== null) {
        setRemainingSeconds(storedRemaining);
      } else if (ended) {
        setRemainingSeconds(0);
      }
      if (ended) {
        sessionEndedRef.current = true;
        setSessionEnded(true);
        setSocketReady(false);
        setIsReconnecting(false);
      }
    } catch (cause) {
      console.warn("Failed to parse stored session payload", cause);
    }
  }, [
    participantId,
    setIsReconnecting,
    setSessionEnded,
    setSessionEndedFromStorage,
    setSocketReady,
    token,
  ]);

  useEffect(() => {
    if (!termsAccepted) {
      return;
    }
    if (!participantId || sessionEnded) {
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
  }, [participantId, sessionEnded, token]);

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
    if (typeof window === "undefined") {
      return;
    }
    if (!participantId || !sessionStatus) {
      return;
    }
    try {
      sessionStorage.setItem(
        `chatOrbit.session.${token}`,
        JSON.stringify({
          token,
          participantId,
          role: participantRole,
          status: sessionStatus.status,
          sessionActive: sessionStatus.status === "active",
          sessionStartedAt: sessionStatus.sessionStartedAt,
          sessionExpiresAt: sessionStatus.sessionExpiresAt,
          messageCharLimit: sessionStatus.messageCharLimit,
          remainingSeconds,
          sessionEnded,
        }),
      );
    } catch (cause) {
      console.warn("Failed to persist session state", cause);
    }
  }, [participantId, participantRole, remainingSeconds, sessionEnded, sessionStatus, token]);

  useEffect(() => {
    if (!termsAccepted) {
      return;
    }
    if (!participantId || sessionEnded) {
      return;
    }

    let active = true;
    let socket: WebSocket | null = null;
    let startTimeout: number | null = null;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const startConnection = () => {
      if (!active) {
        return;
      }

      const url = wsUrl(`/ws/sessions/${token}?participantId=${participantId}`);
      logEvent("Opening WebSocket", { url });
      const nextSocket = new WebSocket(url);
      socket = nextSocket;
      socketRef.current = nextSocket;

      nextSocket.onopen = () => {
        if (!active || sessionEndedRef.current) {
          nextSocket.close();
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
        setIsReconnecting(false);
        logEvent("WebSocket connection established");
        resetPeerConnection();
      };

      nextSocket.onclose = () => {
        if (!active) {
          return;
        }
        setSocketReady(false);
        if (socketRef.current === nextSocket) {
          socketRef.current = null;
        }
        if (sessionEndedRef.current) {
          logEvent("WebSocket connection closed after session end");
          return;
        }
        setConnected(false);
        resetPeerConnection({ recreate: false });
        logEvent("WebSocket connection closed");
        if (participantId) {
          const attempt = reconnectAttemptsRef.current + 1;
          reconnectAttemptsRef.current = attempt;
          const backoffAttempt = Math.min(attempt, 6);
          const delay = Math.min(
            reconnectBaseDelayMs * 2 ** (backoffAttempt - 1),
            RECONNECT_MAX_DELAY_MS,
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            setSocketReconnectNonce((value) => value + 1);
          }, delay);
          setIsReconnecting(true);
          logEvent("Scheduling WebSocket reconnect", { attempt, delay });
        }
      };

      nextSocket.onerror = (event) => {
        if (!active || sessionEndedRef.current) {
          return;
        }
        logEvent("WebSocket error", event);
        setError("WebSocket error");
      };

      nextSocket.onmessage = (event) => {
        if (!active || sessionEndedRef.current) {
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
            finalizeSession("closed");
          } else if (payload.type === "session_expired") {
            finalizeSession("expired");
          } else if (payload.type === "session_deleted") {
            finalizeSession("deleted");
          } else if (payload.type === "abuse_reported") {
            finalizeSession("deleted");
          } else if (payload.type === "signal") {
            void handleSignal(payload);
          }
        } catch (cause) {
          console.error("Failed to parse WebSocket payload", cause);
        }
      };
    };

    const scheduleConnection = () => {
      if (!active) {
        return;
      }
      if (typeof window === "undefined") {
        startConnection();
        return;
      }
      startTimeout = window.setTimeout(startConnection, 0);
    };

    scheduleConnection();

    return () => {
      active = false;
      if (startTimeout !== null && typeof window !== "undefined") {
        window.clearTimeout(startTimeout);
        startTimeout = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      } else if (socket && socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [
    handleSignal,
    finalizeSession,
    participantId,
    reconnectBaseDelayMs,
    resetPeerConnection,
    setIsReconnecting,
    sessionEnded,
    socketReconnectNonce,
    termsAccepted,
    token,
  ]);

  useEffect(() => {
    if (!sessionStatus) {
      return;
    }
    if (sessionStatus.status === "closed") {
      finalizeSession("closed");
    } else if (sessionStatus.status === "expired") {
      finalizeSession("expired");
    } else if (sessionStatus.status === "deleted") {
      finalizeSession("deleted");
    }
  }, [finalizeSession, sessionStatus]);

  useEffect(() => {
    if (sessionStatus?.status !== "active") {
      return;
    }
    if (remainingSeconds === null) {
      return;
    }
    if (remainingSeconds === 0) {
      finalizeSession("closed");
    }
  }, [finalizeSession, remainingSeconds, sessionStatus?.status]);

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

  const sessionIsActive = sessionStatus?.status === "active";
  const canInitiateCall = connected && dataChannelState === "open" && sessionIsActive === true;
  const shouldShowCallButton = canInitiateCall || callState !== "idle";
  const callButtonVariant =
    callState === "active"
      ? "active"
      : callState === "incoming" || callState === "requesting" || callState === "connecting"
        ? "pending"
        : "idle";
  const callButtonTitle =
    callState === "idle"
      ? "Request a video chat"
      : callState === "requesting"
        ? "Cancel video chat request"
        : callState === "incoming"
          ? "Respond to video chat request"
          : callState === "connecting"
            ? "Cancel video chat connection"
            : "Leave video chat";
  const callButtonDisabled = callState === "idle" && !canInitiateCall;
  const shouldShowMediaPanel =
    callState === "connecting" ||
    callState === "active" ||
    callState === "requesting" ||
    Boolean(localStream) ||
    Boolean(remoteStream);

  const canShowFullscreenToggle = callState === "active";
  const canShowMediaMuteButtons = Boolean(localStream);
  const canShowCallButtonInHeader = shouldShowCallButton && (!isCallFullscreen || callState !== "active");
  const shouldShowHeaderActions =
    canShowFullscreenToggle || canShowMediaMuteButtons || canShowCallButtonInHeader;

  useEffect(() => {
    if (!shouldShowMediaPanel || callState !== "active") {
      setIsCallFullscreen(false);
    }
  }, [callState, shouldShowMediaPanel]);

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }
    for (const track of stream.getVideoTracks()) {
      track.enabled = !isLocalVideoMuted;
    }
  }, [isLocalVideoMuted]);

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }
    for (const track of stream.getAudioTracks()) {
      track.enabled = !isLocalAudioMuted;
    }
  }, [isLocalAudioMuted]);

  const callPanelStatusVariant =
    callState === "active"
      ? "active"
      : callState === "connecting"
        ? "connecting"
        : callState === "incoming"
          ? "incoming"
          : callState === "requesting"
            ? "pending"
            : "idle";
  const callPanelStatusLabel =
    callState === "active"
      ? "Video chat active"
      : callState === "connecting"
        ? "Connecting video chat"
        : callState === "incoming"
          ? "Incoming video chat"
          : callState === "requesting"
            ? "Awaiting peer response"
            : "Video chat ready";
  const hasSessionEnded =
    sessionEnded ||
    sessionStatus?.status === "closed" ||
    sessionStatus?.status === "expired" ||
    sessionStatus?.status === "deleted";
  const sessionStatusLabel = hasSessionEnded ? "Ended" : connected ? "Connected" : "Waiting";
  const sessionStatusIndicatorClass = hasSessionEnded
    ? " status-indicator--ended"
    : connected
      ? " status-indicator--active"
      : "";

  const clearHeaderRevealTimeout = useCallback(() => {
    if (typeof window !== "undefined" && headerRevealTimeoutRef.current) {
      window.clearTimeout(headerRevealTimeoutRef.current);
      headerRevealTimeoutRef.current = null;
    }
  }, []);

  const handleHeaderReveal = useCallback(() => {
    setHeaderCollapsed(false);
    if (typeof window === "undefined") {
      return;
    }
    clearHeaderRevealTimeout();
    headerRevealTimeoutRef.current = window.setTimeout(() => {
      headerRevealTimeoutRef.current = null;
      if (previousMediaPanelVisibleRef.current || wasConnectedRef.current) {
        setHeaderCollapsed(true);
      }
    }, 5000);
  }, [clearHeaderRevealTimeout]);

  const handleHeaderCollapse = useCallback(() => {
    clearHeaderRevealTimeout();
    setHeaderCollapsed(true);
  }, [clearHeaderRevealTimeout]);

  const shouldForceExpandedHeader = !connected && !hasSessionEnded;
  const showFullStatusHeader = !connected || hasSessionEnded;

  useEffect(() => {
    const wasVisible = previousMediaPanelVisibleRef.current;
    if (shouldForceExpandedHeader) {
      if (headerCollapsed) {
        setHeaderCollapsed(false);
      }
      clearHeaderRevealTimeout();
      previousMediaPanelVisibleRef.current = shouldShowMediaPanel;
      return;
    }
    if (shouldShowMediaPanel && !wasVisible) {
      setHeaderCollapsed(true);
    }
    if (!shouldShowMediaPanel && wasVisible && !connected) {
      setHeaderCollapsed(false);
      clearHeaderRevealTimeout();
    }
    previousMediaPanelVisibleRef.current = shouldShowMediaPanel;
  }, [
    clearHeaderRevealTimeout,
    connected,
    headerCollapsed,
    shouldForceExpandedHeader,
    shouldShowMediaPanel,
  ]);

  useEffect(() => {
    const wasConnected = wasConnectedRef.current;
    if (!shouldForceExpandedHeader && connected && !wasConnected) {
      setHeaderCollapsed(true);
    }
    if ((!connected || shouldForceExpandedHeader) && wasConnected) {
      setHeaderCollapsed(false);
      clearHeaderRevealTimeout();
    }
    wasConnectedRef.current = connected;
  }, [clearHeaderRevealTimeout, connected, shouldForceExpandedHeader]);

  const handleCallButtonClick = useCallback(() => {
    if (callState === "idle") {
      if (!canInitiateCall) {
        return;
      }
      setCallState("requesting");
      showCallNotice("Requesting camera access…");
      void (async () => {
        try {
          await attachLocalMedia();
        } catch (cause) {
          console.error("Failed to access local media for video chat request", cause);
          if (callStateRef.current === "requesting") {
            stopLocalMediaTracks(peerConnectionRef.current ?? undefined);
            setCallState("idle");
            showCallNotice("Unable to access camera or microphone.");
          }
          return;
        }
        if (callStateRef.current !== "requesting") {
          return;
        }
        sendCallMessage("request");
        showCallNotice("Video chat request sent.");
      })();
      return;
    }
    if (callState === "requesting") {
      sendCallMessage("cancel");
      setCallState("idle");
      setIncomingCallFrom(null);
      setCallDialogOpen(false);
      stopLocalMediaTracks(peerConnectionRef.current ?? undefined);
      showCallNotice("Video chat request cancelled.");
      return;
    }
    if (callState === "incoming") {
      setCallDialogOpen(true);
      return;
    }
    if (callState === "connecting" || callState === "active") {
      teardownCall({ notifyPeer: true });
      showCallNotice("Video chat ended.");
    }
  }, [
    callState,
    canInitiateCall,
    attachLocalMedia,
    sendCallMessage,
    setCallDialogOpen,
    setCallState,
    setIncomingCallFrom,
    showCallNotice,
    stopLocalMediaTracks,
    teardownCall,
  ]);

  const handleToggleLocalVideo = useCallback(() => {
    setIsLocalVideoMuted((previous) => {
      const nextMuted = !previous;
      const stream = localStreamRef.current;
      if (stream) {
        for (const track of stream.getVideoTracks()) {
          track.enabled = !nextMuted;
        }
      }
      return nextMuted;
    });
  }, []);

  const handleToggleLocalAudio = useCallback(() => {
    setIsLocalAudioMuted((previous) => {
      const nextMuted = !previous;
      const stream = localStreamRef.current;
      if (stream) {
        for (const track of stream.getAudioTracks()) {
          track.enabled = !nextMuted;
        }
      }
      return nextMuted;
    });
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (callState !== "active") {
      return;
    }
    shouldRestoreFullscreenOnPortraitRef.current = false;
    setIsCallFullscreen((current) => !current);
    setPipPosition(null);
    pipDragStateRef.current = null;
  }, [callState]);

  const handleExitFullscreenOnly = useCallback(() => {
    shouldRestoreFullscreenOnPortraitRef.current = false;
    setIsCallFullscreen(false);
    setPipPosition(null);
    pipDragStateRef.current = null;
  }, []);

  const handleFullscreenEndCall = useCallback(() => {
    shouldRestoreFullscreenOnPortraitRef.current = false;
    setIsCallFullscreen(false);
    setPipPosition(null);
    pipDragStateRef.current = null;
    handleCallButtonClick();
  }, [handleCallButtonClick]);

  const handleCallAccept = useCallback(async () => {
    setCallDialogOpen(false);
    setIncomingCallFrom(null);
    setCallState("connecting");
    try {
      await attachLocalMedia();
      if (callStateRef.current !== "connecting") {
        stopLocalMediaTracks(peerConnectionRef.current ?? undefined);
        return;
      }
      sendCallMessage("accept");
      requestRenegotiation();
      showCallNotice("Starting video chat…");
    } catch (cause) {
      console.error("Failed to accept video chat", cause);
      showCallNotice("Unable to access camera or microphone.");
      setCallState("idle");
      sendCallMessage("reject");
      stopLocalMediaTracks(peerConnectionRef.current ?? undefined);
    }
  }, [
    attachLocalMedia,
    requestRenegotiation,
    sendCallMessage,
    setCallDialogOpen,
    setCallState,
    setIncomingCallFrom,
    showCallNotice,
    stopLocalMediaTracks,
  ]);

  const handleCallDecline = useCallback(() => {
    setCallDialogOpen(false);
    setIncomingCallFrom(null);
    if (callState !== "idle") {
      setCallState("idle");
    }
    sendCallMessage("reject");
    showCallNotice("Declined video chat request.");
  }, [callState, sendCallMessage, setCallDialogOpen, setCallState, setIncomingCallFrom, showCallNotice]);

  const handlePipPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isCallFullscreen) {
        return;
      }
      const pipContainer = pipContainerRef.current;
      const panel = callPanelRef.current;
      if (!pipContainer || !panel) {
        return;
      }
      event.preventDefault();
      const pipRect = pipContainer.getBoundingClientRect();
      pipDragStateRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - pipRect.left,
        offsetY: event.clientY - pipRect.top,
        pipWidth: pipRect.width,
        pipHeight: pipRect.height,
      };
      pipContainer.setPointerCapture(event.pointerId);
    },
    [isCallFullscreen],
  );

  const handlePipPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = pipDragStateRef.current;
      if (!isCallFullscreen || !drag || drag.pointerId !== event.pointerId) {
        return;
      }
      const panel = callPanelRef.current;
      if (!panel) {
        return;
      }
      const panelRect = panel.getBoundingClientRect();
      const maxLeft = Math.max(panelRect.width - drag.pipWidth, 0);
      const maxTop = Math.max(panelRect.height - drag.pipHeight, 0);
      const proposedLeft = event.clientX - panelRect.left - drag.offsetX;
      const proposedTop = event.clientY - panelRect.top - drag.offsetY;
      const nextLeft = Math.min(Math.max(proposedLeft, 0), maxLeft);
      const nextTop = Math.min(Math.max(proposedTop, 0), maxTop);
      setPipPosition({ left: nextLeft, top: nextTop });
    },
    [isCallFullscreen],
  );

  const handlePipPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = pipDragStateRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      const pipContainer = pipContainerRef.current;
      if (pipContainer && pipContainer.hasPointerCapture(event.pointerId)) {
        pipContainer.releasePointerCapture(event.pointerId);
      }
      pipDragStateRef.current = null;
    },
    [],
  );

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

  const endSessionButtonLabel = hasSessionEnded
    ? "Session ended"
    : endSessionLoading
      ? "Ending…"
      : "End session";

  const performEndSession = useCallback(async () => {
    if (endSessionLoading || hasSessionEnded) {
      return;
    }
    setEndSessionLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/sessions/${token}`), { method: "DELETE" });
      let payload: any = null;
      try {
        payload = await response.json();
      } catch (parseError) {
        if (response.ok) {
          throw new Error("Server returned an unexpected response.");
        }
      }
      if (!response.ok) {
        const detail =
          payload && typeof payload.detail === "string"
            ? payload.detail
            : "Unable to end the session. Please try again.";
        throw new Error(detail);
      }
      if (!payload) {
        throw new Error("Server returned an unexpected response.");
      }
      const mapped = mapStatus(payload);
      setSessionStatus(mapped);
      if (mapped.status === "deleted") {
        finalizeSession("deleted");
      } else if (mapped.status === "expired") {
        finalizeSession("expired");
      } else {
        finalizeSession("closed");
      }
      setError(null);
    } catch (cause) {
      console.error("Failed to end session", cause);
      const message =
        cause instanceof Error && cause.message
          ? cause.message
          : "Unable to end the session. Please try again.";
      setError(message);
    } finally {
      setEndSessionLoading(false);
    }
  }, [endSessionLoading, finalizeSession, hasSessionEnded, setError, setSessionStatus, token]);

  const handleEndSessionRequest = useCallback(() => {
    if (endSessionLoading || hasSessionEnded) {
      return;
    }
    setConfirmEndSessionOpen(true);
  }, [endSessionLoading, hasSessionEnded]);

  const handleCancelEndSession = useCallback(() => {
    setConfirmEndSessionOpen(false);
  }, []);

  const handleReportAbuseSubmit = useCallback(
    async (formValues: ReportAbuseFormValues) => {
      try {
        const payload = {
          participant_id: participantId,
          reporter_email: formValues.reporterEmail,
          summary: formValues.summary,
          questionnaire: {
            immediate_threat: formValues.immediateThreat,
            involves_criminal_activity: formValues.involvesCriminalActivity,
            requires_follow_up: formValues.requiresFollowUp,
            additional_details: formValues.additionalDetails || null,
          },
        };
        const response = await fetch(apiUrl(`/api/sessions/${token}/report-abuse`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          let message = "Unable to submit abuse report. Please try again.";
          try {
            const data = await response.json();
            if (data && typeof data.detail === "string") {
              message = data.detail;
            }
          } catch (cause) {
            console.warn("Failed to parse abuse report error response", cause);
          }
          throw new Error(message);
        }
        try {
          const result = await response.json();
          if (result?.session_status === "deleted") {
            finalizeSession("deleted");
          }
        } catch (cause) {
          console.warn("Unable to parse abuse report response", cause);
          finalizeSession("deleted");
        }
        setError(null);
      } catch (cause) {
        if (cause instanceof Error) {
          throw cause;
        }
        throw new Error("Unable to submit abuse report. Please try again.");
      }
    },
    [finalizeSession, participantId, setError, token],
  );

  const handleAgreeToTerms = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(termsStorageKey, "true");
      } catch (cause) {
        console.warn("Unable to persist terms acknowledgment", cause);
      }
    }

    setTermsAccepted(true);
    setLastTermsKeyChecked(termsStorageKey);
  }, [termsStorageKey]);

  const handleDeclineTerms = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(termsStorageKey);
      } catch (cause) {
        console.warn("Unable to clear stored terms acknowledgment", cause);
      }
    }

    router.replace("/");
  }, [router, termsStorageKey]);

  const handleConfirmEndSession = useCallback(() => {
    if (endSessionLoading) {
      return;
    }
    setConfirmEndSessionOpen(false);
    void performEndSession();
  }, [endSessionLoading, performEndSession]);

  useEffect(() => {
    if (hasSessionEnded) {
      setConfirmEndSessionOpen(false);
    }
  }, [hasSessionEnded]);

  const countdownLabel = useMemo(() => {
    if (hasSessionEnded) {
      return "00:00";
    }
    if (remainingSeconds === null) {
      return sessionStatus?.status === "issued" ? "Waiting…" : "Starting…";
    }
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [hasSessionEnded, remainingSeconds, sessionStatus?.status]);

  const headerTimerLabel = useMemo(() => {
    if (!hasSessionEnded && remainingSeconds === null && sessionStatus?.status === "issued") {
      return "--:--";
    }
    return countdownLabel;
  }, [countdownLabel, hasSessionEnded, remainingSeconds, sessionStatus?.status]);

  const shouldShowTermsModal = lastTermsKeyChecked !== termsStorageKey || !termsAccepted;

  const showChatPanel =
    sessionStatus?.status === "active" || (hasSessionEnded && !sessionEndedFromStorage);

  useEffect(() => {
    if (!showChatPanel || hasSessionEnded) {
      return;
    }
    if (sessionStatus?.status !== "active") {
      return;
    }
    if (!connected || !termsAccepted) {
      return;
    }
    focusComposer();
  }, [
    connected,
    focusComposer,
    hasSessionEnded,
    reverseMessageOrder,
    sessionStatus?.status,
    showChatPanel,
    termsAccepted,
  ]);

  useEffect(() => {
    if (!isCallFullscreen) {
      setPipPosition(null);
      pipDragStateRef.current = null;
    }
  }, [isCallFullscreen]);

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

  const recentDebugEvents = useMemo(() => {
    const limit = 5;
    return debugEvents.slice(-limit).reverse();
  }, [debugEvents]);

  const orderedMessages = useMemo(
    () => (reverseMessageOrder ? [...messages].reverse() : messages),
    [messages, reverseMessageOrder],
  );

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!termsAccepted) {
      setError("You must agree to the Terms of Service before sending messages.");
      focusComposer();
      return;
    }
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== "open") {
      setError("Connection is not ready yet.");
      focusComposer();
      return;
    }
    if (!participantId || !participantRole) {
      focusComposer();
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) {
      focusComposer();
      return;
    }
    if (sessionStatus?.messageCharLimit && trimmed.length > sessionStatus.messageCharLimit) {
      setError(`Messages are limited to ${sessionStatus.messageCharLimit} characters.`);
      focusComposer();
      return;
    }

    if (peerSupportsEncryption === null) {
      setError("Connection is still negotiating. Please wait a moment before sending a message.");
      focusComposer();
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
    } finally {
      focusComposer();
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

  const composer = (
    <form onSubmit={handleSend} className="composer" key="composer">
      <textarea
        ref={composerRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="textarea"
        placeholder="Type your message…"
        disabled={!termsAccepted || sessionStatus?.status !== "active"}
      />
      <div className="composer__footer">
        <span>
          {draft.length}/{sessionStatus?.messageCharLimit ?? 0}
        </span>
        <button
          type="submit"
          disabled={
            !termsAccepted ||
            !connected ||
            sessionStatus?.status !== "active" ||
            peerSupportsEncryption === null
          }
          className="button button--cyan"
        >
          Send
        </button>
      </div>
    </form>
  );

  useEffect(() => {
    return () => {
      if (tokenCopyTimeoutRef.current) {
        window.clearTimeout(tokenCopyTimeoutRef.current);
        tokenCopyTimeoutRef.current = null;
      }
      clearHeaderRevealTimeout();
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
  }, [clearHeaderRevealTimeout, resetPeerConnection]);

  if (!participantId) {
    return (
      <div className="back-card">
        <h2>No participant record found</h2>
        <p>Join the session again from the landing page so we can link this device to the token.</p>
        <Link href="/">Go back</Link>
      </div>
    );
  }

  const showCompactHeader = headerCollapsed && !shouldForceExpandedHeader;

  const headerExpanded = !headerCollapsed || shouldForceExpandedHeader;

  const headerTimerPortal =
    headerTimerContainer && headerTimerLabel
      ? createPortal(
          <button
            type="button"
            className={`site-header-timer${showFullStatusHeader ? " site-header-timer--waiting" : ""}`}
            onClick={handleHeaderReveal}
            aria-expanded={headerExpanded}
            aria-controls={sessionHeaderId}
            aria-label={headerExpanded ? "Session details visible" : "Show session details"}
            title={headerExpanded ? "Session details visible" : "Show session details"}
            aria-live="polite"
          >
            <span className="site-header-timer__status">
              <span className={`status-indicator${sessionStatusIndicatorClass}`} aria-hidden />
              <span>{sessionStatusLabel}</span>
            </span>
            <span className="site-header-timer__time">{headerTimerLabel}</span>
          </button>,
          headerTimerContainer
        )
      : null;

  return (
    <>
      {headerTimerPortal}
      <div className={`session-shell${showCompactHeader ? " session-shell--compact" : ""}`}>
        <div
          className={`session-header-wrapper${
            headerExpanded ? " session-header-wrapper--visible" : " session-header-wrapper--hidden"
          }`}
          aria-hidden={!headerExpanded}
        >
          <div
            id={sessionHeaderId}
            className={`session-header${headerExpanded ? " session-header--revealed" : ""}`}
            role="region"
            aria-label="Session details"
          >
            <div className="session-header__content">
              <div className="session-header__top">
                <div className="session-token-header">
                  <p className="session-token">Token</p>
                  {sessionIsActive ? (
                    <button
                      type="button"
                      className="session-header__collapse-button"
                      onClick={handleHeaderCollapse}
                    >
                      Hide details
                    </button>
                  ) : null}
                </div>
                <div className="session-token-body">
                  <p className="session-token-value">{token}</p>
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
              </div>
              {showDebugPanel ? (
                <div className="session-debug" data-test="session-debug-panel">
                  <div className="session-debug__header">
                    <p className="session-debug__title">Client debug</p>
                    {isTouchDevice ? (
                      <button
                        type="button"
                        className="session-debug__hide-button"
                        onClick={() => {
                          setShowDebugPanel(false);
                        }}
                        aria-label="Hide debug panel"
                      >
                        Hide
                      </button>
                    ) : (
                      <p className="session-debug__hint">Press Esc to hide</p>
                    )}
                  </div>
                  <dl className="session-debug__list">
                    <div className="session-debug__item">
                      <dt>Identity</dt>
                      <dd>{clientIdentity ?? "Gathering…"}</dd>
                    </div>
                    <div className="session-debug__item">
                      <dt>Peer state</dt>
                      <dd>{connectionState ?? "—"}</dd>
                    </div>
                    <div className="session-debug__item">
                      <dt>ICE connection</dt>
                      <dd>{iceConnectionState ?? "—"}</dd>
                    </div>
                    <div className="session-debug__item">
                      <dt>ICE gathering</dt>
                      <dd>{iceGatheringState ?? "—"}</dd>
                    </div>
                    <div className="session-debug__item">
                      <dt>ICE route</dt>
                      <dd>{selectedIceRoute ?? "—"}</dd>
                    </div>
                    <div className="session-debug__item">
                      <dt>Data channel</dt>
                      <dd>{dataChannelState ?? "—"}</dd>
                    </div>
                  </dl>
                  <div className="session-debug__events">
                    <p className="session-debug__subtitle">Recent events</p>
                    {recentDebugEvents.length === 0 ? (
                      <p className="session-debug__empty">Watching for new logs…</p>
                    ) : (
                      <ul className="session-debug__event-list">
                        {recentDebugEvents.map((entry, index) => {
                          const detail = entry.details[0];
                          let detailSnippet: string | null = null;
                          if (detail !== undefined) {
                            try {
                              detailSnippet = JSON.stringify(detail);
                            } catch (error) {
                              detailSnippet = String(detail);
                            }
                            if (detailSnippet && detailSnippet.length > 160) {
                              detailSnippet = `${detailSnippet.slice(0, 157)}…`;
                            }
                          }
                          const timestamp = new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          });
                          return (
                            <li key={`${entry.timestamp}-${index}`} className="session-debug__event">
                              <span className="session-debug__event-time">{timestamp}</span>
                              <span className="session-debug__event-message">{entry.message}</span>
                              {detailSnippet ? (
                                <code className="session-debug__event-detail">{detailSnippet}</code>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="countdown">
              <div className="status-pill">
                <span className={`status-indicator${sessionStatusIndicatorClass}`} aria-hidden />
                <span>{sessionStatusLabel}</span>
              </div>
              <p className="countdown-label">Session timer</p>
              <p className="countdown-time">{countdownLabel}</p>
              <div className="session-role-row">
                <p className="session-role">
                  You are signed in as
                  <span>
                    {" "}
                    {sessionStatus?.participants.find((p) => p.participantId === participantId)?.role ?? "guest"}
                  </span>
                  .
                </p>
                <button
                  type="button"
                  className="session-end-button"
                  onClick={handleEndSessionRequest}
                  disabled={endSessionLoading || hasSessionEnded}
                  aria-haspopup="dialog"
                  aria-expanded={confirmEndSessionOpen}
                >
                  {endSessionButtonLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
        {hasSessionEnded ? (
          <div className="session-alert session-alert--ended">
          <p>Session ended. Request a new token to start over.</p>
          <Link href="/" className="session-alert__home-link">
            Leave room
          </Link>
        </div>
      ) : null}

      {!hasSessionEnded && error ? <div className="alert alert--error">{error}</div> : null}

      {isReconnecting && !connected && sessionStatus?.status === "active" ? (
        <div className="alert alert--info" role="status" aria-live="polite">
          Reconnecting…
        </div>
      ) : null}

      {shouldShowMediaPanel ? (
        <div
          className={`call-panel${isCallFullscreen ? " call-panel--fullscreen" : ""}`}
          ref={callPanelRef}
          tabIndex={-1}
        >
            <div className="call-panel__header">
              <div
                className={`call-panel__status call-panel__status--${callPanelStatusVariant}`}
                role="status"
                aria-live="polite"
              >
                <span
                  className={`call-panel__status-indicator call-panel__status-indicator--${callPanelStatusVariant}`}
                  aria-hidden
                />
                <span className="call-panel__status-text">{callPanelStatusLabel}</span>
                {isCallFullscreen && callState === "active" ? (
                  <span className="call-panel__status-timer" aria-label="Session timer">
                    {headerTimerLabel}
                  </span>
                ) : null}
              </div>
            {shouldShowHeaderActions ? (
              <div className="call-panel__actions">
                {canShowFullscreenToggle ? (
                  <button
                    type="button"
                    className={`call-panel__icon-button${
                      isCallFullscreen ? " call-panel__icon-button--active" : ""
                    }`}
                    onClick={handleToggleFullscreen}
                    aria-label={isCallFullscreen ? "Exit full screen" : "Enter full screen"}
                    title={isCallFullscreen ? "Exit full screen" : "Enter full screen"}
                  >
                    {isCallFullscreen ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path
                          fill="currentColor"
                          d="M9 5H5v4h2V7h2V5zm10 0h-4v2h2v2h2V5zm0 10h-2v2h-2v2h4v-4zM7 17H5v4h4v-2H7v-2z"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path
                          fill="currentColor"
                          d="M4 4h6v2H6v4H4V4zm14 0v6h-2V6h-4V4h6zm-6 14v2h6v-6h-2v4h-4zm-8-4H4v6h6v-2H6v-4z"
                        />
                      </svg>
                    )}
                  </button>
                ) : null}
                {canShowMediaMuteButtons ? (
                  <>
                    <button
                      type="button"
                      className={`call-panel__icon-button${
                        isLocalVideoMuted ? " call-panel__icon-button--muted" : ""
                      }`}
                      onClick={handleToggleLocalVideo}
                      aria-label={isLocalVideoMuted ? "Turn camera on" : "Turn camera off"}
                      title={isLocalVideoMuted ? "Turn camera on" : "Turn camera off"}
                      aria-pressed={isLocalVideoMuted}
                      disabled={!localStream}
                    >
                      {isLocalVideoMuted ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path
                            fill="currentColor"
                            d="M.97 3.97a.75.75 0 0 1 1.06 0l15 15a.75.75 0 1 1-1.06 1.06l-15-15a.75.75 0 0 1 0-1.06ZM17.25 16.06l2.69 2.69c.944.945 2.56.276 2.56-1.06V6.31c0-1.336-1.616-2.005-2.56-1.06l-2.69 2.69v8.12ZM15.75 7.5v8.068L4.682 4.5h8.068a3 3 0 0 1 3 3ZM1.5 16.5V7.682l11.773 11.773c-.17.03-.345.045-.523.045H4.5a3 3 0 0 1-3-3Z"
                          />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path
                            fill="currentColor"
                            d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z"
                          />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      className={`call-panel__icon-button${
                        isLocalAudioMuted ? " call-panel__icon-button--muted" : ""
                      }`}
                      onClick={handleToggleLocalAudio}
                      aria-label={isLocalAudioMuted ? "Unmute microphone" : "Mute microphone"}
                      title={isLocalAudioMuted ? "Unmute microphone" : "Mute microphone"}
                      aria-pressed={isLocalAudioMuted}
                      disabled={!localStream}
                    >
                      {isLocalAudioMuted ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path
                            fill="currentColor"
                            d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z"
                          />
                          <path
                            fill="currentColor"
                            d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 0 0 7.469 4.77l1.062 1.062A6.751 6.751 0 0 1 12 21.459V23.25h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-1.791a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z"
                          />
                          <path
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeWidth="1.8"
                            d="M6 18 18 6"
                          />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path
                            fill="currentColor"
                            d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z"
                          />
                          <path
                            fill="currentColor"
                            d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.291h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.291a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z"
                          />
                        </svg>
                      )}
                    </button>
                  </>
                ) : null}
                {canShowCallButtonInHeader ? (
                  <button
                    type="button"
                    className={`chat-panel__call-button call-panel__call-button chat-panel__call-button--${callButtonVariant}`}
                    onClick={handleCallButtonClick}
                    aria-label={callButtonTitle}
                    title={callButtonTitle}
                    disabled={callButtonDisabled}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        fill="currentColor"
                        d="M15 10.5V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3.5l5 3.5V7l-5 3.5z"
                      />
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {callNotice ? (
            <div className="alert alert--info call-panel__notice" role="status" aria-live="polite">
              {callNotice}
            </div>
          ) : null}
          <div className="call-panel__media" aria-live="polite">
            <div
              className={`call-panel__media-item${
                isCallFullscreen ? " call-panel__media-item--remote" : ""
              }`}
            >
              {remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="call-panel__media-video" />
              ) : (
                <div className="call-panel__media-placeholder">
                  {callState === "active"
                    ? "Waiting for peer video…"
                    : callState === "incoming"
                      ? "Incoming video chat request"
                      : callState === "requesting"
                        ? "Awaiting peer response…"
                        : callState === "connecting"
                          ? "Connecting to peer…"
                          : "Remote video unavailable"}
                </div>
              )}
              <span className="call-panel__media-label">Partner</span>
            </div>
            <div
              className={`call-panel__media-item${
                isCallFullscreen ? " call-panel__media-item--local" : ""
              }`}
              ref={pipContainerRef}
              style={
                isCallFullscreen && pipPosition
                  ? {
                      top: `${pipPosition.top}px`,
                      left: `${pipPosition.left}px`,
                      bottom: "auto",
                      right: "auto",
                    }
                  : undefined
              }
              onPointerDown={isCallFullscreen ? handlePipPointerDown : undefined}
              onPointerMove={isCallFullscreen ? handlePipPointerMove : undefined}
              onPointerUp={isCallFullscreen ? handlePipPointerUp : undefined}
              onPointerCancel={isCallFullscreen ? handlePipPointerUp : undefined}
            >
              {localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="call-panel__media-video"
                />
              ) : (
                <div className="call-panel__media-placeholder">
                  {callState === "incoming"
                    ? "Accept to share your camera."
                    : callState === "requesting"
                      ? "Waiting for peer to accept…"
                      : callState === "connecting"
                        ? "Connecting camera…"
                        : "Camera preview unavailable"}
                </div>
              )}
              <span className="call-panel__media-label">You</span>
            </div>
          </div>
          {isCallFullscreen ? (
            <div className="call-panel__fullscreen-controls">
              <button
                type="button"
                className="call-panel__fullscreen-control call-panel__fullscreen-control--end"
                onClick={handleFullscreenEndCall}
              >
                End video
              </button>
              <button
                type="button"
                className="call-panel__fullscreen-control call-panel__fullscreen-control--dismiss"
                onClick={handleExitFullscreenOnly}
              >
                Exit full screen
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showChatPanel ? (
        <div className="chat-panel">
          <div className="chat-panel__header">
            <div className="chat-panel__stats" role="status" aria-live="polite">
              <span>Connected participants: {connectedParticipantCount}/2</span>
              <span>
                Limit: {sessionStatus ? sessionStatus.messageCharLimit.toLocaleString() : "—"} chars/message
              </span>
            </div>
            <div className="chat-panel__controls">
              {shouldShowCallButton && !shouldShowMediaPanel ? (
                <button
                  type="button"
                  className={`chat-panel__call-button chat-panel__call-button--${callButtonVariant}`}
                  onClick={handleCallButtonClick}
                  aria-label={callButtonTitle}
                  title={callButtonTitle}
                  disabled={callButtonDisabled}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      fill="currentColor"
                      d="M15 10.5V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3.5l5 3.5V7l-5 3.5z"
                    />
                  </svg>
                </button>
              ) : null}
              <button
                type="button"
                className="chat-panel__order-toggle"
                onClick={() => setReverseMessageOrder((previous) => !previous)}
                aria-pressed={reverseMessageOrder}
                aria-label={reverseMessageOrder ? "Show newest messages at bottom" : "Show newest messages at top"}
                title={reverseMessageOrder ? "Newest on top" : "Newest on bottom"}
              >
                {reverseMessageOrder ? "↓" : "↑"}
              </button>
            </div>
          </div>

          {!shouldShowMediaPanel && callNotice ? (
            <div className="alert alert--info call-panel__notice" role="status" aria-live="polite">
              {callNotice}
            </div>
          ) : null}

          {encryptionAlertMessage ? (
            <div className="alert alert--info">{encryptionAlertMessage}</div>
          ) : null}

          <div
            className={`chat-log${reverseMessageOrder ? " chat-log--reverse" : ""}`}
            ref={chatLogRef}
          >
            {reverseMessageOrder ? composer : null}
            {orderedMessages.length === 0 ? (
              <p className="chat-log__empty">No messages yet. Start the conversation!</p>
            ) : (
              orderedMessages.map((message) => {
                const mine = message.participantId === participantId;
                return (
                  <div key={message.messageId} className={`message${mine ? " message--own" : ""}`}>
                    <div className="message-meta">
                      <span>{mine ? "You" : message.role}</span>
                      <span className="message__time">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
            {!reverseMessageOrder ? composer : null}
          </div>
        </div>
      ) : null}

      {!hasSessionEnded ? (
        <div className="session-report">
          <button type="button" className="session-report__button" onClick={() => setReportAbuseOpen(true)}>
            Report abuse
          </button>
          <p className="session-report__helper">End the session and notify ChatOrbit about unlawful behavior.</p>
        </div>
      ) : null}

      <ReportAbuseModal open={reportAbuseOpen} onClose={() => setReportAbuseOpen(false)} onSubmit={handleReportAbuseSubmit} />

      <ConfirmDialog
        open={callDialogOpen}
        title="Incoming video chat"
        description={
          incomingCallFrom
            ? `${incomingCallFrom} wants to start a video chat.`
            : "Your peer wants to start a video chat."
        }
        confirmLabel="Accept"
        cancelLabel="Decline"
        onConfirm={() => {
          void handleCallAccept();
        }}
        onCancel={handleCallDecline}
        confirmDisabled={callState === "connecting"}
      />

      <ConfirmDialog
        open={confirmEndSessionOpen}
        title="End session"
        description="Ending the session will immediately disconnect all participants."
        confirmLabel="End session"
        cancelLabel="Cancel"
        onConfirm={handleConfirmEndSession}
        onCancel={handleCancelEndSession}
        confirmDisabled={endSessionLoading}
      />
      <TermsConsentModal
        open={shouldShowTermsModal}
        onAgree={handleAgreeToTerms}
        onCancel={handleDeclineTerms}
      />
      </div>
    </>
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
