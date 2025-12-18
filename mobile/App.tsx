import React, { ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeModules,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFonts } from 'expo-font';
import type {
  RTCPeerConnection as NativeRTCPeerConnection,
  RTCIceCandidate as NativeRTCIceCandidate,
  RTCSessionDescription as NativeRTCSessionDescription,
  MediaStream as NativeMediaStream,
  MediaStreamTrack as NativeMediaStreamTrack,
  RTCTrackEvent as NativeRTCTrackEvent
} from 'react-native-webrtc';
type RTCPeerConnection = NativeRTCPeerConnection;
type RTCIceCandidate = NativeRTCIceCandidate;
type RTCSessionDescription = NativeRTCSessionDescription;
type MediaStream = NativeMediaStream;
type MediaStreamTrack = NativeMediaStreamTrack;
type RTCTrackEvent = NativeRTCTrackEvent;
type RTCViewComponent = ComponentType<{ streamURL: string; objectFit?: string; mirror?: boolean }>;
import { getIceServers, hasRelayIceServers } from './src/utils/webrtc';
import { applyNativeConsoleFilters } from './src/native/consoleFilters';
import { API_BASE_URL, MOBILE_CLIENT_IDENTITY, WS_BASE_URL } from './src/session/config';
import { COLORS, SESSION_CONFIG, TIMINGS, WEBRTC_CONFIG } from './src/constants';
import { styles } from './src/constants/styles';
import { durationOptions, tokenTierOptions, validityOptions } from './src/constants/options';
import { AcceptScreen, BigActionButton } from './src/components';
import { NeedTokenForm, JoinTokenForm, JoinTokenFormResult } from './src/components/forms';
import { TokenResultCard } from './src/components/session';
import { fetchSessionStatus, joinSession } from './src/utils/session';
import {
  computeMessageHash,
  decryptText,
  deriveKey,
  encryptText,
  generateMessageId,
  resolveCrypto,
} from './src/utils/crypto';
import { upsertMessage } from './src/utils/errorHandling';
import { formatJoinedAt, formatRemainingTime, mapStatusDescription, mapStatusLabel, statusVariant } from './src/utils/formatting';
import {
  DataChannelState,
  DurationOption,
  EncryptedMessage,
  EncryptionMode,
  JoinResponse,
  Message,
  SessionParticipant,
  SessionStatus,
  SessionStatusSocketPayload,
  TokenResponse,
  TokenTierOption,
  ValidityOption
} from './src/types';

applyNativeConsoleFilters();
const EXPO_DEV_BUILD_DOCS_URL = WEBRTC_CONFIG.EXPO_DEV_BUILD_DOCS_URL;

type WebRtcBindings = {
  RTCPeerConnection: new (...args: any[]) => NativeRTCPeerConnection;
  RTCIceCandidate: new (...args: any[]) => NativeRTCIceCandidate;
  RTCSessionDescription: new (...args: any[]) => NativeRTCSessionDescription;
  RTCView?: RTCViewComponent;
  mediaDevices?: {
    getUserMedia: (constraints: Record<string, unknown>) => Promise<MediaStream>;
  };
};

let cachedWebRtcBindings: WebRtcBindings | null | undefined;

const getWebRtcBindings = (): WebRtcBindings | null => {
  if (cachedWebRtcBindings !== undefined) {
    return cachedWebRtcBindings;
  }

  try {
    const bindings = require('react-native-webrtc') as WebRtcBindings;
    if (
      bindings?.RTCPeerConnection &&
      bindings?.RTCIceCandidate &&
      bindings?.RTCSessionDescription
    ) {
      cachedWebRtcBindings = bindings;
      return cachedWebRtcBindings;
    }
  } catch (error) {
    console.warn(
      'Unable to load react-native-webrtc. Build a development client to enable native session connectivity.',
      error
    );
    cachedWebRtcBindings = null;
    return null;
  }

  const nativeModules = NativeModules as Record<string, unknown> | null;
  const hasNativeModule = WEBRTC_CONFIG.NATIVE_MODULE_CANDIDATES.some((name) => Boolean(nativeModules?.[name]));

  if (!hasNativeModule) {
    console.warn(
      'react-native-webrtc native module not detected. Install the Expo dev build to enable in-app sessions.',
      nativeModules
    );
  }

  cachedWebRtcBindings = null;
  return null;
};

const isWebRtcSupported = (): boolean => getWebRtcBindings() !== null;

const SESSION_POLL_INTERVAL_MS = TIMINGS.SESSION_POLL_INTERVAL;

type PeerDataChannel = ReturnType<RTCPeerConnection['createDataChannel']> & {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
};

type TimeoutHandle = ReturnType<typeof setTimeout> | number;

type InAppSessionScreenProps = {
  token: TokenResponse;
  participantId: string;
  participantRole: string;
  onExit: () => void;
};

const InAppSessionScreen: React.FC<InAppSessionScreenProps> = ({
  token,
  participantId,
  participantRole,
  onExit
}: InAppSessionScreenProps) => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [connectedParticipantIds, setConnectedParticipantIds] = useState<string[]>([]);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(true);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [statusCollapsed, setStatusCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const [dataChannelState, setDataChannelState] = useState<DataChannelState | null>(null);
  const [supportsEncryption, setSupportsEncryption] = useState<boolean | null>(null);
  const [peerSupportsEncryption, setPeerSupportsEncryption] = useState<boolean | null>(null);
  const [callState, setCallState] = useState<'idle' | 'requesting' | 'incoming' | 'connecting' | 'active'>(
    'idle'
  );
  const [isLocalAudioMuted, setIsLocalAudioMuted] = useState(false);
  const [isLocalVideoMuted, setIsLocalVideoMuted] = useState(false);
  const [isCallFullscreen, setIsCallFullscreen] = useState(false);
  const [preferredCameraFacing, setPreferredCameraFacing] = useState<'user' | 'environment'>('user');
  const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [socketReconnectNonce, setSocketReconnectNonce] = useState(0);
  const [peerResetNonce, setPeerResetNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);

  const connectionRefs = useRef({
    socket: null as WebSocket | null,
    peerConnection: null as RTCPeerConnection | null,
    dataChannel: null as PeerDataChannel | null,
    localAudioStream: null as MediaStream | null,
    localVideoStream: null as MediaStream | null,
    remoteVideoStream: null as MediaStream | null
  });
  const peerLogCounterRef = useRef(0);
  const connectedParticipantIdsRef = useRef<string[]>([]);
  const remoteParticipantJoinedRef = useRef(false);
  const hashedMessagesRef = useRef<Map<string, EncryptedMessage>>(new Map());
  const pendingSignalsRef = useRef<any[]>([]);
  const pendingCallMessagesRef = useRef<Array<{ action: string; detail: Record<string, unknown> }>>([]);
  const pendingOutgoingSignalsRef = useRef<{ type: string; signalType: string; payload: unknown }[]>([]);
  const pendingCandidatesRef = useRef<any[]>([]);
  const capabilityAnnouncedRef = useRef(false);
  const peerSupportsEncryptionRef = useRef<boolean | null>(null);
  const callStateRef = useRef<'idle' | 'requesting' | 'incoming' | 'connecting' | 'active'>('idle');
  const sessionActiveRef = useRef(false);
  const sessionEndedRef = useRef(false);
  const lastSessionStatusRef = useRef<string | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const socketReconnectTimeoutRef = useRef<TimeoutHandle | null>(null);
  const iceRetryTimeoutRef = useRef<TimeoutHandle | null>(null);
  const fallbackOfferTimeoutRef = useRef<TimeoutHandle | null>(null);
  const pendingHostOfferRef = useRef(false);
  const hasSentOfferRef = useRef(false);

  const webRtcBindings = useMemo(() => getWebRtcBindings(), []);

  if (!webRtcBindings) {
    return (
      <LinearGradient
        colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sessionFallbackCard}
      >
        <Text style={styles.sessionFallbackTitle}>Development build required</Text>
        <Text style={styles.sessionFallbackBody}>
          Expo Go doesn’t include the WebRTC native module. Run “npx expo run:ios” or “npx expo run:android” to install the Expo
          dev build with WebRTC support, then reopen this session.
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={onExit}>
          <Text style={styles.resetButtonLabel}>Back to token</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sessionFallbackLink} onPress={() => void Linking.openURL(EXPO_DEV_BUILD_DOCS_URL)}>
          <Text style={styles.sessionFallbackLinkLabel}>View setup guide</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const { RTCPeerConnection: RTCPeerConnectionCtor, RTCIceCandidate: RTCIceCandidateCtor, RTCSessionDescription: RTCSessionDescriptionCtor } =
    webRtcBindings;
  const RTCViewComponent = webRtcBindings.RTCView;

  const iceServers = useMemo(() => getIceServers(), []);
  const hasRelaySupport = useMemo(() => hasRelayIceServers(iceServers), [iceServers]);
  const connectivityVariant = hasRelaySupport ? 'relay' : iceServers.length > 0 ? 'stun' : 'none';
  const connectivityLabel =
    connectivityVariant === 'relay'
      ? 'TURN ready'
      : connectivityVariant === 'stun'
        ? 'STUN only'
        : 'No ICE servers';
  const connectivityMessage =
    connectivityVariant === 'relay'
      ? 'Relay routing enabled for restrictive networks.'
      : connectivityVariant === 'stun'
        ? 'Basic STUN available; relay fallback is not configured yet.'
        : 'Configure STUN or TURN servers to complete the WebRTC flow.';
  const connectivityBadgeStyle =
    connectivityVariant === 'relay'
      ? styles.connectivityBadgeReady
      : connectivityVariant === 'stun'
        ? styles.connectivityBadgeLimited
        : styles.connectivityBadgeWarning;
  const connectivityIcon =
    connectivityVariant === 'relay'
      ? 'radio-outline'
      : connectivityVariant === 'stun'
        ? 'alert-circle-outline'
        : 'close-circle-outline';

  const connectionBadgeLabel = connected ? 'Connected' : isReconnecting ? 'Reconnecting…' : socketReady ? 'Waiting for peer' : 'Offline';
  const connectionBadgeStyle =
    connected ? styles.connectionBadgeOnline : isReconnecting ? styles.connectionBadgeReconnecting : styles.connectionBadgeIdle;
  const videoReady = connected && dataChannelState === 'open';
  const videoStatusLabel =
    callState === 'active'
      ? 'Video live'
      : callState === 'connecting'
        ? 'Connecting…'
      : callState === 'incoming'
        ? 'Incoming request'
        : callState === 'requesting'
          ? 'Requested…'
          : 'Idle';
  const videoStatusStyle =
    callState === 'active'
      ? styles.videoBadgeActive
      : callState === 'incoming'
        ? styles.videoBadgeIncoming
        : callState === 'requesting'
          ? styles.videoBadgePending
          : styles.videoBadgeIdle;
  const showVideoSection =
    callState !== 'idle' || incomingCallFrom !== null || localVideoStream !== null || remoteVideoStream !== null;
  const localVideoUrl = useMemo(() => (localVideoStream as any)?.toURL?.() ?? null, [localVideoStream]);
  const remoteVideoUrl = useMemo(() => (remoteVideoStream as any)?.toURL?.() ?? null, [remoteVideoStream]);
  const videoPreviewRowStyle = useMemo(
    () => [styles.videoPreviewRow, isCallFullscreen && styles.videoPreviewRowFullscreen],
    [isCallFullscreen]
  );
  const videoPaneStyle = useMemo(
    () => [styles.videoPane, isCallFullscreen && styles.videoPaneFullscreen],
    [isCallFullscreen]
  );
  const videoSurfaceStyle = useMemo(
    () => [styles.videoSurface, isCallFullscreen && styles.videoSurfaceFullscreen],
    [isCallFullscreen]
  );

  useEffect(() => {
    setSupportsEncryption(resolveCrypto() !== null);
  }, []);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    if (callState === 'idle') {
      setIsCallFullscreen(false);
    }
  }, [callState]);

  useEffect(() => {
    const stream = connectionRefs.current.localAudioStream;
    if (!stream) {
      return;
    }
    stream
      .getTracks()
      .filter((track) => track.kind === 'audio')
      .forEach((track) => {
        track.enabled = !isLocalAudioMuted;
      });
  }, [isLocalAudioMuted]);

  useEffect(() => {
    const stream = connectionRefs.current.localVideoStream;
    if (!stream) {
      return;
    }
    stream
      .getTracks()
      .filter((track) => track.kind === 'video')
      .forEach((track) => {
        track.enabled = !isLocalVideoMuted;
      });
  }, [isLocalVideoMuted]);

  useEffect(() => {
    pendingOutgoingSignalsRef.current = [];
  }, [token.token]);

  useEffect(() => {
    hashedMessagesRef.current.clear();
    setMessages([]);
    setDraft('');
    capabilityAnnouncedRef.current = false;
    peerSupportsEncryptionRef.current = null;
    setPeerSupportsEncryption(null);
    connectedParticipantIdsRef.current = [];
    setConnectedParticipantIds([]);
    remoteParticipantJoinedRef.current = false;
    setSessionEnded(false);
    sessionEndedRef.current = false;
  }, [token.token]);

  useEffect(() => {
    sessionActiveRef.current = sessionStatus?.status === 'active';
  }, [sessionStatus?.status]);

  useEffect(() => {
    const currentStatus = sessionStatus?.status;
    if (currentStatus !== 'active') {
      setStatusCollapsed(false);
    } else if (lastSessionStatusRef.current !== 'active') {
      setStatusCollapsed(true);
    }
    lastSessionStatusRef.current = currentStatus;
  }, [sessionStatus?.status]);

  useEffect(() => {
    return () => {
      const stream = connectionRefs.current.localAudioStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      connectionRefs.current.localAudioStream = null;
      const videoStream = connectionRefs.current.localVideoStream;
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
      connectionRefs.current.localVideoStream = null;
      connectionRefs.current.remoteVideoStream = null;
    };
  }, []);

  const getPeerLogId = useCallback(
    (pc: RTCPeerConnection | null | undefined) => {
      if (!pc) {
        return 'none';
      }
      const key = '__chatorbitPeerId';
      const anyPeer = pc as RTCPeerConnection & { [key]?: number };
      if (anyPeer[key] != null) {
        return anyPeer[key];
      }
      const nextId = peerLogCounterRef.current++;
      anyPeer[key] = nextId;
      return nextId;
    },
    [clearRemoteVideo, stopLocalVideoTracks]
  );

  const logPeer = useCallback(
    (pc: RTCPeerConnection | null | undefined, message: string, ...detail: unknown[]) => {
      const id = getPeerLogId(pc);
      console.debug(`rn-webrtc:pc:${id} ${message}`, ...detail);
    },
    [getPeerLogId]
  );

  const logSocket = useCallback((message: string, ...detail: unknown[]) => {
    console.debug('rn-webrtc:ws', message, ...detail);
  }, []);

  const hasRemoteParticipant = useCallback(() => {
    return remoteParticipantJoinedRef.current;
  }, []);

  const updateRemoteParticipantPresence = useCallback(
    (participants?: SessionParticipant[]) => {
      if (!participants) {
        return;
      }
      const hasRemote = Boolean(participants.some((participant) => participant.participant_id !== participantId));
      remoteParticipantJoinedRef.current = hasRemote;
    },
    [participantId]
  );

  const summarizeSignalPayload = useCallback((signalType: string, payload: unknown) => {
    if (!payload) {
      return 'no-payload';
    }
    if (signalType === 'iceCandidate' && typeof payload === 'object' && payload !== null) {
      const candidate = payload as { candidate?: string; sdpMid?: string; sdpMLineIndex?: number };
      return {
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
        hasCandidate: Boolean(candidate.candidate)
      };
    }
    if ((signalType === 'offer' || signalType === 'answer') && typeof payload === 'object' && payload !== null) {
      const desc = payload as { type?: string; sdp?: string };
      return {
        type: desc.type,
        sdpLength: desc.sdp?.length ?? 0
      };
    }
    return payload;
  }, []);

  const sendSignal = useCallback(
    (signalType: string, payload: unknown) => {
      if (!participantId) {
        logSocket('signal skip: missing participant', signalType);
        return;
      }
      const socket = connectionRefs.current.socket;
      const message = { type: 'signal', signalType, payload };
      if (socket?.readyState !== WebSocket.OPEN) {
        logSocket('signal queued: socket not open', signalType, socket?.readyState);
        pendingOutgoingSignalsRef.current.push(message);
        return;
      }
      console.debug('rn-webrtc:signal:out', signalType, summarizeSignalPayload(signalType, payload));
      socket.send(JSON.stringify(message));
    },
    [logSocket, participantId, summarizeSignalPayload]
  );

  const flushQueuedSignals = useCallback((socket?: WebSocket | null) => {
    const targetSocket = socket ?? connectionRefs.current.socket;
    if (!targetSocket || targetSocket.readyState !== WebSocket.OPEN) {
      return;
    }
    const backlog = pendingOutgoingSignalsRef.current.splice(0);
    if (backlog.length === 0) {
      return;
    }
    logSocket('flushing queued signals', backlog.length);
    backlog.forEach((message) => {
      console.debug('rn-webrtc:signal:out', message.signalType, summarizeSignalPayload(message.signalType, message.payload));
      targetSocket.send(JSON.stringify(message));
    });
  }, [logSocket, summarizeSignalPayload]);

  const sendCapabilities = useCallback(() => {
    const channel = connectionRefs.current.dataChannel;
    if (!channel || channel.readyState !== 'open') {
      return;
    }
    if (supportsEncryption === null) {
      return;
    }
    channel.send(
      JSON.stringify({
        type: 'capabilities',
        supportsEncryption: supportsEncryption === true
      })
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
    if (connectionRefs.current.dataChannel?.readyState === 'open') {
      sendCapabilities();
    }
  }, [sendCapabilities, supportsEncryption]);

  const flushPendingCallMessages = useCallback(
    (channel?: PeerDataChannel | null) => {
      const target = channel ?? connectionRefs.current.dataChannel;
      if (!target || target.readyState !== 'open' || !participantId) {
        return;
      }
      const queue = pendingCallMessagesRef.current.splice(0);
      for (const { action, detail } of queue) {
        try {
          target.send(JSON.stringify({ type: 'call', action, from: participantId, ...detail }));
          logPeer(connectionRefs.current.peerConnection, 'sent call control (queued)', action);
        } catch (err) {
          console.warn('Failed to flush call control message', err);
          pendingCallMessagesRef.current.unshift({ action, detail });
          break;
        }
      }
    },
    [logPeer, participantId]
  );

  const sendCallMessage = useCallback(
    (action: string, detail: Record<string, unknown> = {}) => {
      if (!participantId) {
        return;
      }
      const channel = connectionRefs.current.dataChannel;
      const payload = { type: 'call', action, from: participantId, ...detail };
      if (!channel || channel.readyState !== 'open') {
        pendingCallMessagesRef.current.push({ action, detail });
        return;
      }
      try {
        channel.send(JSON.stringify(payload));
        logPeer(connectionRefs.current.peerConnection, 'sent call control', action);
      } catch (err) {
        console.warn('Failed to send call control message', err);
        pendingCallMessagesRef.current.push({ action, detail });
      }
    },
    [logPeer, participantId]
  );

  const handlePeerMessage = useCallback(
    async (rawMessage: string) => {
      try {
        const payload = JSON.parse(rawMessage);
        if (payload.type === 'capabilities') {
          const remoteSupports = Boolean(payload.supportsEncryption);
          peerSupportsEncryptionRef.current = remoteSupports;
          setPeerSupportsEncryption(remoteSupports);
          return;
        }
        if (payload.type === 'call') {
          const action = payload.action as string;
          const from = payload.from as string | undefined;
          if (!from || from === participantId) {
            return;
          }
            if (action === 'request') {
              if (callState === 'active' || callState === 'connecting') {
                sendCallMessage('busy');
              return;
            }
            if (callState === 'requesting') {
              setCallState('connecting');
              try {
                await ensureCallMedia();
                if (callStateRef.current === 'connecting') {
                  sendCallMessage('accept');
                  requestMediaRenegotiation();
                }
              } catch (err) {
                console.warn('Failed to auto-accept call request', err);
                setCallState('idle');
                sendCallMessage('reject');
                stopLocalVideoTracks();
                stopLocalAudioTracks();
                clearRemoteVideo();
                resetCallControls();
              }
              return;
            }
            setIncomingCallFrom(from);
            setCallState('incoming');
            return;
          }
          if (action === 'accept') {
            setIncomingCallFrom(null);
            setCallState((prev) => (prev === 'requesting' ? 'connecting' : prev));
            try {
              await ensureCallMedia();
              requestMediaRenegotiation();
            } catch (err) {
              console.warn('Unable to attach media after acceptance', err);
              setCallState('idle');
              stopLocalVideoTracks();
              stopLocalAudioTracks();
              clearRemoteVideo();
              resetCallControls();
            }
            return;
          }
          if (action === 'reject') {
            setIncomingCallFrom(null);
            setCallState('idle');
            stopLocalVideoTracks();
            stopLocalAudioTracks();
            clearRemoteVideo();
            resetCallControls();
            return;
          }
          if (action === 'end') {
            setIncomingCallFrom(null);
            setCallState('idle');
            stopLocalVideoTracks();
            stopLocalAudioTracks();
            clearRemoteVideo();
            resetCallControls();
            return;
          }
          if (action === 'cancel') {
            if (callState !== 'idle') {
              setCallState('idle');
              stopLocalVideoTracks();
              stopLocalAudioTracks();
              clearRemoteVideo();
              resetCallControls();
            }
            return;
          }
          if (action === 'busy') {
            if (callState === 'requesting') {
              setCallState('idle');
              stopLocalVideoTracks();
              stopLocalAudioTracks();
              clearRemoteVideo();
              resetCallControls();
              setError('Peer is busy with another video chat.');
            }
            return;
          }
          if (action === 'renegotiate') {
            void negotiateMediaUpdate(connectionRefs.current.peerConnection, 'peer requested media update');
          }
          return;
        }
        if (payload.type === 'message') {
          const incoming = payload.message as EncryptedMessage;
          if (!incoming?.messageId || incoming.sessionId !== token.token) {
            return;
          }
          const encryptionMode: EncryptionMode = incoming.encryption ?? 'aes-gcm';
          if (peerSupportsEncryptionRef.current === null) {
            peerSupportsEncryptionRef.current = encryptionMode !== 'none';
            setPeerSupportsEncryption(encryptionMode !== 'none');
          }
          try {
            let content: string;
            if (encryptionMode === 'none') {
              content = incoming.content ?? '';
            } else {
              if (supportsEncryption !== true) {
                setError('Received encrypted message but encryption is not supported.');
                return;
              }
              if (!incoming.encryptedContent) {
                setError('Missing encrypted payload.');
                return;
              }
              const key = await deriveKey(token.token);
              try {
                content = await decryptText(key, incoming.encryptedContent);
              } catch (err) {
                setError('Failed to decrypt message.');
                return;
              }
            }
            if (incoming.hash) {
              const expectedHash = await computeMessageHash(
                incoming.sessionId,
                incoming.participantId,
                incoming.messageId,
                content
              );
              if (expectedHash !== incoming.hash) {
                console.warn('Hash mismatch for message', incoming.messageId);
                setError('Ignored a message with mismatched hash.');
                return;
              }
            }
            hashedMessagesRef.current.set(incoming.messageId, {
              ...incoming,
              content,
              encryption: encryptionMode,
              deleted: false
            });
            setMessages((prev: Message[]) =>
              upsertMessage(prev, {
                messageId: incoming.messageId,
                participantId: incoming.participantId,
                role: incoming.role,
                content,
                createdAt: incoming.createdAt
              })
            );
            setError(null);
            return;
          } catch (err) {
            console.warn('Unable to process incoming message', err);
            setError('Unable to process an incoming message.');
            return;
          }
        }
        if (payload.type === 'delete') {
          const messageId = payload.messageId as string | undefined;
          if (!messageId) {
            return;
          }
          hashedMessagesRef.current.delete(messageId);
          setMessages((prev: Message[]) => prev.filter((item: Message) => item.messageId !== messageId));
        }
      } catch (err) {
        console.warn('Unable to process data channel message', err);
      }
    },
    [
      callState,
      clearRemoteVideo,
      ensureCallMedia,
      negotiateMediaUpdate,
      participantId,
      requestMediaRenegotiation,
      sendCallMessage,
      stopLocalAudioTracks,
      stopLocalVideoTracks,
      token.token
    ]
  );

  const flushPendingCandidates = useCallback(
    async (pc: RTCPeerConnection) => {
      if (!pc.remoteDescription) {
        return;
      }
      const backlog = pendingCandidatesRef.current.splice(0);
      if (backlog.length > 0) {
        logPeer(pc, 'flushing buffered ice candidates', backlog.length);
      }
      for (const candidate of backlog) {
        try {
          await pc.addIceCandidate(new RTCIceCandidateCtor(candidate));
        } catch (err) {
          console.warn('Failed to apply buffered ICE candidate', err);
        }
      }
    },
    [RTCIceCandidateCtor, logPeer]
  );

  const processSignalPayload = useCallback(
    async (pc: RTCPeerConnection, payload: any) => {
      const signalType = payload.signalType as string;
      const detail = payload.payload;
      if (signalType === 'offer' && detail) {
        if (fallbackOfferTimeoutRef.current) {
          clearTimeout(fallbackOfferTimeoutRef.current as TimeoutHandle);
          fallbackOfferTimeoutRef.current = null;
        }
        logPeer(pc, 'received offer');
        await pc.setRemoteDescription(new RTCSessionDescriptionCtor(detail));
        logPeer(pc, 'applied remote offer');
        await flushPendingCandidates(pc);
        const answer = await pc.createAnswer();
        logPeer(pc, 'created answer');
        await pc.setLocalDescription(answer);
        logPeer(pc, 'set local answer');
        sendSignal('answer', answer);
      } else if (signalType === 'answer' && detail) {
        logPeer(pc, 'received answer');
        await pc.setRemoteDescription(new RTCSessionDescriptionCtor(detail));
        logPeer(pc, 'applied remote answer');
        await flushPendingCandidates(pc);
      } else if (signalType === 'iceCandidate') {
        if (!detail) {
          try {
            logPeer(pc, 'received end-of-candidates');
            await pc.addIceCandidate(null);
          } catch (err) {
            console.warn('Failed to process end-of-candidates signal', err);
          }
          return;
        }
        if (!pc.remoteDescription) {
          logPeer(pc, 'buffering ice candidate (no remote description yet)');
          pendingCandidatesRef.current.push(detail);
          return;
        }
        try {
          logPeer(pc, 'adding ice candidate');
          await pc.addIceCandidate(new RTCIceCandidateCtor(detail));
        } catch (err) {
          console.warn('Failed to process ICE candidate', err);
        }
      }
    },
    [RTCIceCandidateCtor, RTCSessionDescriptionCtor, flushPendingCandidates, logPeer, sendSignal]
  );

  const handleSignal = useCallback(
    (payload: any) => {
      remoteParticipantJoinedRef.current = true;
      const pc = connectionRefs.current.peerConnection;
      if (!pc) {
        console.debug('rn-webrtc:signal:buffered', payload.signalType);
        pendingSignalsRef.current.push(payload);
        setPeerResetNonce((value: number) => value + 1);
        return;
      }
      console.debug('rn-webrtc:signal:in', payload.signalType);
      void processSignalPayload(pc, payload);
    },
    [processSignalPayload]
  );

  const resetPeerConnection = useCallback(
    ({ recreate = true, delayMs }: { recreate?: boolean; delayMs?: number } = {}) => {
      if (iceRetryTimeoutRef.current) {
        clearTimeout(iceRetryTimeoutRef.current as TimeoutHandle);
        iceRetryTimeoutRef.current = null;
      }
      if (fallbackOfferTimeoutRef.current) {
        clearTimeout(fallbackOfferTimeoutRef.current as TimeoutHandle);
        fallbackOfferTimeoutRef.current = null;
      }
      const existing = connectionRefs.current.peerConnection;
      if (existing) {
        try {
          existing.close();
        } catch (err) {
          console.warn('Failed to close RTCPeerConnection', err);
        }
      }
      connectionRefs.current.peerConnection = null;
      if (connectionRefs.current.dataChannel) {
        try {
          connectionRefs.current.dataChannel.close();
        } catch (err) {
          console.warn('Failed to close data channel', err);
        }
      }
      connectionRefs.current.dataChannel = null;
      capabilityAnnouncedRef.current = false;
      peerSupportsEncryptionRef.current = null;
      setPeerSupportsEncryption(null);
      pendingSignalsRef.current = [];
      pendingCandidatesRef.current = [];
      hasSentOfferRef.current = false;
      setConnected(false);
      setDataChannelState(null);
      stopLocalVideoTracks();
      stopLocalAudioTracks();
      clearRemoteVideo();
      setCallState('idle');
      setIncomingCallFrom(null);
      if (!recreate) {
        return;
      }
      if (delayMs && delayMs > 0) {
        iceRetryTimeoutRef.current = setTimeout(() => {
          iceRetryTimeoutRef.current = null;
          setPeerResetNonce((value: number) => value + 1);
        }, delayMs);
      } else {
        setPeerResetNonce((value: number) => value + 1);
      }
    },
    []
  );

  const schedulePeerConnectionRecovery = useCallback(
    (reason: string, { delayMs = 1000 }: { delayMs?: number } = {}) => {
      console.warn('Scheduling peer connection recovery', reason);
      logSocket('peer recovery', reason, 'delayMs', delayMs);
      if (!sessionActiveRef.current) {
        return;
      }
      setIsReconnecting(true);
      resetPeerConnection({ delayMs });
    },
    [logSocket, resetPeerConnection]
  );

  const markSessionEnded = useCallback(
    (message: string) => {
      if (sessionEndedRef.current) {
        return;
      }
      sessionEndedRef.current = true;
      sessionActiveRef.current = false;
      remoteParticipantJoinedRef.current = false;
      setSessionEnded(true);
      setIsReconnecting(false);
      setConnected(false);
      setDataChannelState(null);
      setCallState('idle');
      setIncomingCallFrom(null);
      setStatusError(message);
      setSessionStatus((prev) => (prev ? { ...prev, status: 'expired', remaining_seconds: 0 } : prev));
      if (socketReconnectTimeoutRef.current) {
        clearTimeout(socketReconnectTimeoutRef.current as TimeoutHandle);
        socketReconnectTimeoutRef.current = null;
      }
      if (iceRetryTimeoutRef.current) {
        clearTimeout(iceRetryTimeoutRef.current as TimeoutHandle);
        iceRetryTimeoutRef.current = null;
      }
      if (fallbackOfferTimeoutRef.current) {
        clearTimeout(fallbackOfferTimeoutRef.current as TimeoutHandle);
        fallbackOfferTimeoutRef.current = null;
      }
      resetPeerConnection({ recreate: false });
      if (connectionRefs.current.socket) {
        try {
          connectionRefs.current.socket.close();
        } catch (err) {
          console.warn('Failed to close session socket', err);
        }
      }
      connectionRefs.current.socket = null;
    },
    [resetPeerConnection]
  );

  const isTerminalSessionStatus = useCallback((status?: string | null) => {
    if (!status) {
      return false;
    }
    return status === 'closed' || status === 'expired' || status === 'deleted';
  }, []);

  useEffect(() => {
    if (sessionEnded) {
      return;
    }
    let isMounted = true;
    const controller = new AbortController();
    const loadStatus = async (showSpinner: boolean) => {
      if (showSpinner) {
        setStatusLoading(true);
        setStatusError(null);
      }
      try {
        const status = await fetchSessionStatus(token.token, controller.signal);
        if (isMounted) {
          updateRemoteParticipantPresence(status.participants);
          setSessionStatus(status);
          setRemainingSeconds(status.remaining_seconds ?? null);
          if (status.connected_participants !== undefined) {
            const connectedIds = Array.isArray(status.connected_participants)
              ? status.connected_participants
              : [];
            setConnectedParticipantIds(connectedIds);
            connectedParticipantIdsRef.current = connectedIds;
            logSocket('http status', status.status, 'connected', connectedIds);
          } else {
            logSocket('http status missing connected_participants, keeping previous value');
          }
          setStatusError(null);
          if (isTerminalSessionStatus(status.status)) {
            markSessionEnded('This session is no longer active.');
          }
        }
      } catch (err: any) {
        if (isMounted && !controller.signal.aborted) {
          const statusCode = err?.status ?? err?.statusCode;
          if (statusCode === 404) {
            markSessionEnded('This session is no longer active.');
            return;
          }
          setStatusError(err?.message ?? 'Unable to load the session status.');
        }
      } finally {
        if (isMounted && showSpinner) {
          setStatusLoading(false);
        }
      }
    };
    loadStatus(true);

    const interval = setInterval(() => {
      loadStatus(false);
    }, SESSION_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [
    isTerminalSessionStatus,
    logSocket,
    markSessionEnded,
    sessionEnded,
    token.token,
    updateRemoteParticipantPresence
  ]);

  useEffect(() => {
    if (sessionStatus) {
      setRemainingSeconds(sessionStatus.remaining_seconds ?? null);
    }
  }, [sessionStatus?.remaining_seconds]);

  useEffect(() => {
    if (sessionEnded) {
      return;
    }
    if (remainingSeconds == null) {
      return;
    }
    if (remainingSeconds <= 0) {
      markSessionEnded('Session timer elapsed.');
      return;
    }
    const timeout = setTimeout(() => {
      setRemainingSeconds((prev: number | null) => (prev == null || prev <= 0 ? prev : prev - 1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [markSessionEnded, remainingSeconds, sessionEnded]);

  useEffect(() => {
    if (!participantId || sessionEnded) {
      return;
    }
    const url = `${WS_BASE_URL}/ws/sessions/${encodeURIComponent(token.token)}?participantId=${encodeURIComponent(participantId)}`;
    let cancelled = false;

    try {
      logSocket('connecting', url, { participantId });
      const socket = new WebSocket(url);
      connectionRefs.current.socket = socket;

      socket.onopen = () => {
        logSocket('open');
        setSocketReady(true);
        setStatusError(null);
        reconnectAttemptsRef.current = 0;
        flushQueuedSignals(socket);
      };

      socket.onerror = (event: Event) => {
        logSocket('error', event);
        if (!sessionEndedRef.current) {
          setStatusError('Realtime connection interrupted. Attempting to reconnect…');
        }
      };

      socket.onclose = (event: CloseEvent) => {
        logSocket('close', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        connectionRefs.current.socket = null;
        setSocketReady(false);
        if (cancelled || sessionEndedRef.current) {
          return;
        }
        setStatusError((prev: string | null) => prev ?? 'Realtime connection closed.');
        if (!socketReconnectTimeoutRef.current) {
          const attempt = reconnectAttemptsRef.current + 1;
          reconnectAttemptsRef.current = attempt;
          const delay = Math.min(TIMINGS.RECONNECT_MAX_DELAY, attempt * TIMINGS.RECONNECT_BASE_DELAY);
          logSocket('reconnect scheduled', { attempt, delay });
          socketReconnectTimeoutRef.current = setTimeout(() => {
            socketReconnectTimeoutRef.current = null;
            if (!cancelled && !sessionEndedRef.current) {
              logSocket('reconnect firing', { attempt });
              setSocketReconnectNonce((value: number) => value + 1);
            }
          }, delay);
        }
      };

      socket.onmessage = (event: MessageEvent) => {
        logSocket('message', event.data);
        try {
          const payload = JSON.parse(event.data) as SessionStatusSocketPayload | { type: string; signalType?: string };
          if (payload.type === 'status') {
            const { connected_participants, type: _ignored, ...rest } = payload as SessionStatusSocketPayload;
            if (connected_participants !== undefined) {
              const connectedIds = Array.isArray(connected_participants) ? connected_participants : [];
              logSocket('status payload', rest.status, 'participants', connectedIds);
              setConnectedParticipantIds(connectedIds);
              connectedParticipantIdsRef.current = connectedIds;
            } else {
              logSocket('status payload missing connected_participants, keeping previous value');
            }
            updateRemoteParticipantPresence(rest.participants);
            setSessionStatus(rest);
            setRemainingSeconds(rest.remaining_seconds ?? null);
            setStatusLoading(false);
            if (isTerminalSessionStatus(rest.status)) {
              markSessionEnded('This session is no longer active.');
            }
          } else if (payload.type === 'signal') {
            const signalType = payload.signalType ?? 'unknown';
            logSocket('signal payload', signalType, summarizeSignalPayload(signalType, (payload as any).payload));
            handleSignal(payload);
          } else if (payload.type === 'session_closed') {
            markSessionEnded('The session has been closed.');
          } else if (payload.type === 'session_expired') {
            markSessionEnded('The session has expired.');
          } else if (payload.type === 'session_deleted') {
            markSessionEnded('The session is no longer available.');
          }
        } catch (err) {
          console.warn('Unable to process websocket payload', err);
        }
      };
    } catch (err) {
      console.warn('Unable to open realtime session socket', err);
      if (!sessionEndedRef.current) {
        setStatusError('Unable to open realtime connection. Some updates may be delayed.');
        if (!socketReconnectTimeoutRef.current) {
          socketReconnectTimeoutRef.current = setTimeout(() => {
            socketReconnectTimeoutRef.current = null;
            setSocketReconnectNonce((value: number) => value + 1);
          }, TIMINGS.SOCKET_RECONNECT_BASE);
        }
      }
      return;
    }

    return () => {
      cancelled = true;
      if (socketReconnectTimeoutRef.current) {
        clearTimeout(socketReconnectTimeoutRef.current as TimeoutHandle);
        socketReconnectTimeoutRef.current = null;
      }
      if (connectionRefs.current.socket) {
        try {
          connectionRefs.current.socket.close();
        } catch (err) {
          console.warn('Failed to close session socket', err);
        }
      }
      connectionRefs.current.socket = null;
    };
  }, [
    flushQueuedSignals,
    handleSignal,
    isTerminalSessionStatus,
    logSocket,
    markSessionEnded,
    participantId,
    sessionEnded,
    summarizeSignalPayload,
    token.token,
    updateRemoteParticipantPresence
  ]);

  const attachDataChannel = useCallback(
    (channel: PeerDataChannel, owner: RTCPeerConnection | null) => {
      logPeer(owner, 'attach data channel', channel.label, channel.readyState);
      connectionRefs.current.dataChannel = channel;
      setDataChannelState(channel.readyState as DataChannelState);
      const markOpen = () => {
        logPeer(owner, 'data channel open', channel.label);
        setConnected(true);
        setError(null);
        setIsReconnecting(false);
        capabilityAnnouncedRef.current = false;
        sendCapabilities();
        flushPendingCallMessages(channel);
        setDataChannelState('open');
      };
      if (channel.readyState === 'open') {
        markOpen();
      }
      channel.onopen = () => {
        markOpen();
      };
      channel.onclose = () => {
        logPeer(owner, 'data channel closed', channel.label);
        setConnected(false);
        setDataChannelState(channel.readyState as DataChannelState);
        capabilityAnnouncedRef.current = false;
        peerSupportsEncryptionRef.current = null;
        setPeerSupportsEncryption(null);
        if (owner && connectionRefs.current.peerConnection === owner && sessionActiveRef.current) {
          schedulePeerConnectionRecovery('data channel closed');
        }
      };
      channel.onerror = () => {
        logPeer(owner, 'data channel error', channel.label);
        setConnected(false);
        setDataChannelState(channel.readyState as DataChannelState);
        if (owner && connectionRefs.current.peerConnection === owner && sessionActiveRef.current) {
          schedulePeerConnectionRecovery('data channel error');
        }
      };
      channel.onmessage = (event: MessageEvent) => {
        void handlePeerMessage(event.data);
      };
    },
    [flushPendingCallMessages, handlePeerMessage, schedulePeerConnectionRecovery, sendCapabilities]
  );

  const ensureLocalAudioStream = useCallback(async () => {
    if (!webRtcBindings?.mediaDevices?.getUserMedia) {
      logSocket('mediaDevices missing; audio unavailable');
      return null;
    }
    if (connectionRefs.current.localAudioStream) {
      return connectionRefs.current.localAudioStream;
    }
    try {
      const stream = await webRtcBindings.mediaDevices.getUserMedia({ audio: true });
      connectionRefs.current.localAudioStream = stream;
      return stream;
    } catch (err) {
      console.warn('Unable to start local audio stream', err);
      return null;
    }
  }, [logSocket, webRtcBindings]);

  const stopLocalAudioTracks = useCallback(() => {
    const stream = connectionRefs.current.localAudioStream;
    const audioTrackIds = stream?.getAudioTracks?.().map((track) => track.id) ?? [];
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    connectionRefs.current.localAudioStream = null;
    const pc = connectionRefs.current.peerConnection;
    if (pc && typeof pc.getSenders === 'function') {
      pc.getSenders().forEach((sender) => {
        const shouldRemove =
          sender.track?.kind === 'audio' &&
          (audioTrackIds.length === 0 || audioTrackIds.includes(sender.track.id));
        if (shouldRemove) {
          try {
            pc.removeTrack(sender);
          } catch (err) {
            console.warn('Failed to remove audio sender', err);
          }
        }
      });
    }
  }, []);

  const stopLocalVideoTracks = useCallback(() => {
    const stream = connectionRefs.current.localVideoStream;
    const videoTrackIds = stream?.getVideoTracks?.().map((track) => track.id) ?? [];
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    connectionRefs.current.localVideoStream = null;
    setLocalVideoStream(null);
    const pc = connectionRefs.current.peerConnection;
    if (pc && typeof pc.getSenders === 'function') {
      pc.getSenders().forEach((sender) => {
        const shouldRemove =
          sender.track?.kind === 'video' &&
          (videoTrackIds.length === 0 || videoTrackIds.includes(sender.track.id));
        if (shouldRemove) {
          try {
            pc.removeTrack(sender);
          } catch (err) {
            console.warn('Failed to remove video sender', err);
          }
        }
      });
    }
  }, []);

  const clearRemoteVideo = useCallback(() => {
    connectionRefs.current.remoteVideoStream = null;
    setRemoteVideoStream(null);
  }, []);

  const resetCallControls = useCallback(() => {
    setIsLocalAudioMuted(false);
    setIsLocalVideoMuted(false);
    setIsCallFullscreen(false);
  }, []);

  const negotiateMediaUpdate = useCallback(
    async (pc: RTCPeerConnection | null, reason: string) => {
      if (!pc) {
        return;
      }
      if (pc.signalingState === 'closed') {
        return;
      }
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal('offer', offer);
        logPeer(pc, 'sent renegotiation offer', reason);
      } catch (err) {
        console.warn('Failed to renegotiate media', err);
      }
    },
    [logPeer, sendSignal]
  );

  const requestMediaRenegotiation = useCallback(() => {
    if (participantRole === 'host') {
      void negotiateMediaUpdate(connectionRefs.current.peerConnection, 'requested media update');
    } else {
      sendCallMessage('renegotiate');
    }
  }, [negotiateMediaUpdate, participantRole, sendCallMessage]);

  const ensureCallMedia = useCallback(
    async (options: { attach?: boolean } = {}) => {
      const { attach = true } = options;
      const pc = connectionRefs.current.peerConnection;
      if (!pc || !webRtcBindings?.mediaDevices?.getUserMedia) {
        return null;
      }

      const attachSenders = async (kind: 'audio' | 'video', stream: MediaStream) => {
        const tracks = stream.getTracks().filter((track) => track.kind === kind);
        const senders = pc.getSenders?.() ?? [];

        for (const track of tracks) {
          const existingSender = senders.find((sender) => sender.track?.kind === kind);
          if (existingSender?.track) {
            try {
              await existingSender.replaceTrack(track);
              logPeer(pc, `replaced ${kind} track`, track.id);
              continue;
            } catch (err) {
              console.warn(`Failed to replace ${kind} track`, err);
            }
          }

          if (existingSender) {
            try {
              pc.removeTrack(existingSender);
            } catch (err) {
              console.warn(`Failed to remove existing ${kind} sender`, err);
            }
          }

          try {
            pc.addTrack(track, stream);
            logPeer(pc, `added local ${kind} track`, track.id);
          } catch (err) {
            console.warn(`Failed to attach local ${kind} track`, err);
          }
        }
      };

      let videoStream = connectionRefs.current.localVideoStream;
      if (!videoStream) {
        try {
          videoStream = await webRtcBindings.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: preferredCameraFacing } }
          });
          connectionRefs.current.localVideoStream = videoStream;
          setLocalVideoStream(videoStream);
        } catch (err) {
          console.warn('Unable to start local video stream', err);
          return null;
        }
      }

      videoStream
        .getTracks()
        .filter((track) => track.kind === 'video')
        .forEach((track) => {
          track.enabled = !isLocalVideoMuted;
        });

      if (videoStream && attach) {
        await attachSenders('video', videoStream);
      }

      if (attach) {
        const audioStream = await ensureLocalAudioStream();
        if (audioStream) {
          audioStream
            .getTracks()
            .filter((track) => track.kind === 'audio')
            .forEach((track) => {
              track.enabled = !isLocalAudioMuted;
            });
          await attachSenders('audio', audioStream);
        }
      }

      return videoStream;
    },
    [ensureLocalAudioStream, isLocalAudioMuted, isLocalVideoMuted, logPeer, preferredCameraFacing, webRtcBindings]
  );

  const createAndSendOffer = useCallback(
    async (pc: RTCPeerConnection, reason: string, ensureDataChannel?: boolean) => {
      try {
        if (!sessionActiveRef.current) {
          logPeer(pc, 'skipping offer (session inactive)', reason);
          return;
        }
        if (!hasRemoteParticipant()) {
          if (participantRole === 'host') {
            pendingHostOfferRef.current = true;
          }
          logPeer(pc, 'skipping offer (no remote participant yet)', reason);
          return;
        }
        if (ensureDataChannel && !connectionRefs.current.dataChannel) {
          const channel = pc.createDataChannel('chat') as unknown as PeerDataChannel;
          logPeer(pc, 'created data channel (fallback)', channel.label);
          attachDataChannel(channel, pc);
        }
        const offer = await pc.createOffer();
        if (connectionRefs.current.peerConnection !== pc || pc.signalingState === 'closed') {
          logPeer(pc, 'offer abandoned (stale peer)');
          return;
        }
        await pc.setLocalDescription(offer);
        if (connectionRefs.current.peerConnection !== pc || pc.signalingState === 'closed') {
          logPeer(pc, 'offer abandoned after setLocalDescription (stale peer)');
          return;
        }
        logPeer(pc, 'sending offer', reason);
        sendSignal('offer', offer);
        hasSentOfferRef.current = true;
        pendingHostOfferRef.current = false;
      } catch (err) {
        console.warn('Failed to create offer', err);
      }
    },
    [attachDataChannel, hasRemoteParticipant, logPeer, participantRole, sendSignal]
  );

  const toggleLocalAudio = useCallback(() => {
    setIsLocalAudioMuted((prev) => {
      const next = !prev;
      const stream = connectionRefs.current.localAudioStream;
      if (stream) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  const toggleLocalVideo = useCallback(() => {
    setIsLocalVideoMuted((prev) => {
      const next = !prev;
      const stream = connectionRefs.current.localVideoStream;
      if (stream) {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  const flipCamera = useCallback(() => {
    const stream = connectionRefs.current.localVideoStream;
    const track = stream?.getVideoTracks?.()[0];
    const switchable = track as unknown as { _switchCamera?: () => void } | undefined;
    if (switchable?._switchCamera) {
      switchable._switchCamera();
      setPreferredCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'));
    }
  }, []);

  const toggleCallFullscreen = useCallback(() => {
    setIsCallFullscreen((prev) => !prev);
  }, []);

  const requestVideoChat = useCallback(async () => {
    if (callState !== 'idle') {
      return;
    }
    const stream = await ensureCallMedia({ attach: false });
    if (!stream) {
      setError('Unable to access the camera for video chat.');
      return;
    }
    setCallState('requesting');
    setIncomingCallFrom(null);
    sendCallMessage('request');
  }, [callState, ensureCallMedia, sendCallMessage]);

  const acceptVideoChat = useCallback(async () => {
    if (!incomingCallFrom) {
      return;
    }
    const stream = await ensureCallMedia();
    if (!stream) {
      setError('Unable to access the camera for video chat.');
      sendCallMessage('reject');
      return;
    }
    setCallState('connecting');
    setIncomingCallFrom(null);
    sendCallMessage('accept');
    requestMediaRenegotiation();
  }, [ensureCallMedia, incomingCallFrom, requestMediaRenegotiation, sendCallMessage]);

  const declineVideoChat = useCallback(() => {
    sendCallMessage('reject');
    setIncomingCallFrom(null);
    setCallState('idle');
    stopLocalVideoTracks();
    stopLocalAudioTracks();
    clearRemoteVideo();
    resetCallControls();
  }, [clearRemoteVideo, resetCallControls, sendCallMessage, stopLocalAudioTracks, stopLocalVideoTracks]);

  const endVideoChat = useCallback(() => {
    if (callState === 'requesting') {
      sendCallMessage('cancel');
    } else {
      sendCallMessage('end');
    }
    setCallState('idle');
    setIncomingCallFrom(null);
    stopLocalVideoTracks();
    stopLocalAudioTracks();
    clearRemoteVideo();
    resetCallControls();
  }, [callState, clearRemoteVideo, resetCallControls, sendCallMessage, stopLocalAudioTracks, stopLocalVideoTracks]);

  useEffect(() => {
    if (remoteVideoStream && (callState === 'connecting' || callState === 'requesting')) {
      setCallState('active');
    }
  }, [callState, remoteVideoStream]);

  useEffect(() => {
    if (!participantId) {
      return;
    }
    let cancelled = false;
    let peerConnection: RTCPeerConnection | null = null;

    const setupPeerConnection = async () => {
      const pc = new RTCPeerConnectionCtor({ iceServers });
      peerConnection = pc;
      logPeer(pc, 'ctor', iceServers.length ? 'with-ice' : 'no-ice');
      connectionRefs.current.peerConnection = pc;

      const handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate && event.candidate.candidate) {
          const candidate = typeof event.candidate.toJSON === 'function' ? event.candidate.toJSON() : event.candidate;
          logPeer(pc, 'emit ice candidate');
          sendSignal('iceCandidate', candidate);
        } else {
          logPeer(pc, 'emit end-of-candidates');
          sendSignal('iceCandidate', null);
        }
      };

      const handleConnectionStateChange = () => {
        logPeer(pc, 'connection state change', pc.connectionState, pc.iceConnectionState);
        const state = pc.connectionState;
        if (state === 'connected') {
          setIsReconnecting(false);
          if (connectionRefs.current.dataChannel?.readyState === 'open') {
            setConnected(true);
          }
        } else if (state === 'failed' || state === 'disconnected') {
          setConnected(false);
          if (sessionActiveRef.current) {
            schedulePeerConnectionRecovery(`connection ${state}`, {
              delayMs: state === 'failed' ? TIMINGS.PEER_RECOVERY_FAILED_DELAY : TIMINGS.ICE_RETRY_DELAY
            });
          }
        } else if (state === 'closed') {
          setConnected(false);
        }
      };

      const handleDataChannel = (event: RTCDataChannelEvent) => {
        logPeer(pc, 'incoming data channel', event.channel?.label);
        attachDataChannel(event.channel as unknown as PeerDataChannel, pc);
      };

      const handleTrack = (event: RTCTrackEvent) => {
        logPeer(pc, 'remote track', event.track?.kind, event.streams?.length ?? 0);
        const track = event.track as unknown as MediaStreamTrack | undefined;
        if (!track) {
          return;
        }

        if (track.kind === 'audio') {
          track.enabled = true;
          return;
        }

        if (track.kind === 'video') {
          const existingStream =
            event.streams?.[0] ?? connectionRefs.current.remoteVideoStream ?? new MediaStream();
          const hasTrack = existingStream.getTrackById(track.id);

          if (!hasTrack) {
            existingStream.addTrack(track);
          }

          connectionRefs.current.remoteVideoStream = existingStream as unknown as MediaStream;
          setRemoteVideoStream(existingStream as unknown as MediaStream);

          const handleTrackEnded = () => {
            const currentStream = connectionRefs.current.remoteVideoStream;
            if (!currentStream) {
              return;
            }

            currentStream.getTracks().forEach((candidate) => {
              if (candidate.readyState === 'ended' && typeof currentStream.removeTrack === 'function') {
                currentStream.removeTrack(candidate);
              }
            });

            const hasLiveTracks = currentStream.getTracks().some((candidate) => candidate.readyState !== 'ended');
            if (!hasLiveTracks) {
              connectionRefs.current.remoteVideoStream = null;
              setRemoteVideoStream(null);
            }
          };

          track.addEventListener('ended', handleTrackEnded, { once: true });
          return;
        }
      };

      const handleNegotiationNeeded = () => {
        void negotiateMediaUpdate(pc, 'onnegotiationneeded');
      };

      const peerConnectionAny = pc as RTCPeerConnection & {
        onicecandidate?: ((event: RTCPeerConnectionIceEvent) => void) | null;
        onconnectionstatechange?: (() => void) | null;
        ondatachannel?: ((event: RTCDataChannelEvent) => void) | null;
        ontrack?: ((event: RTCTrackEvent) => void) | null;
        onnegotiationneeded?: (() => void) | null;
      };

      peerConnectionAny.onicecandidate = handleIceCandidate;
      peerConnectionAny.onconnectionstatechange = handleConnectionStateChange;
      peerConnectionAny.ondatachannel = handleDataChannel;
      peerConnectionAny.ontrack = handleTrack;
      peerConnectionAny.onnegotiationneeded = handleNegotiationNeeded;

      if (participantRole === 'host') {
        const channel = pc.createDataChannel('chat') as unknown as PeerDataChannel;
        logPeer(pc, 'created data channel', channel.label);
        attachDataChannel(channel, pc);
      }

      if (callStateRef.current !== 'idle') {
        try {
          await ensureCallMedia();
        } catch (err) {
          console.warn('Failed to restore call media on reconnect', err);
        }
      }

      const backlog = pendingSignalsRef.current.splice(0);
      if (backlog.length > 0) {
        logPeer(pc, 'replaying buffered signals', backlog.length);
        backlog.forEach((item) => {
          void processSignalPayload(pc, item);
        });
      }

      const readyForOffer = sessionActiveRef.current && hasRemoteParticipant();
      if (participantRole === 'host' && !readyForOffer) {
        logPeer(pc, 'deferring offer until remote participant joins');
        pendingHostOfferRef.current = true;
      }
      const canScheduleOffer =
        participantRole === 'host' &&
        !fallbackOfferTimeoutRef.current &&
        !hasSentOfferRef.current &&
        readyForOffer;

      if (canScheduleOffer) {
        fallbackOfferTimeoutRef.current = setTimeout(() => {
          fallbackOfferTimeoutRef.current = null;
          if (!connectionRefs.current.peerConnection || connectionRefs.current.peerConnection !== pc) {
            return;
          }
          if (pc.signalingState !== 'stable' || pc.remoteDescription) {
            return;
          }
          void createAndSendOffer(
            pc,
            participantRole === 'host' ? 'host-init' : 'guest-fallback',
            participantRole === 'guest'
          );
        }, participantRole === 'host' ? TIMINGS.HOST_OFFER_DELAY : TIMINGS.GUEST_OFFER_FALLBACK);
      }
    };

    const sessionIsActive = sessionActiveRef.current;
    const hasBufferedSignals = pendingSignalsRef.current.length > 0;
    const shouldCreatePeer =
      sessionIsActive &&
      (participantRole === 'host' || hasRemoteParticipant() || hasBufferedSignals || pendingHostOfferRef.current);

    if (!shouldCreatePeer) {
      logPeer(null, 'skipping peer setup (waiting for active session with remote)');
      return;
    }

    void setupPeerConnection();

    return () => {
      cancelled = true;
      if (!peerConnection) {
        return;
      }
      if (fallbackOfferTimeoutRef.current) {
        clearTimeout(fallbackOfferTimeoutRef.current as TimeoutHandle);
        fallbackOfferTimeoutRef.current = null;
      }
      const peerConnectionAny = peerConnection as RTCPeerConnection & {
        onicecandidate?: ((event: RTCPeerConnectionIceEvent) => void) | null;
        onconnectionstatechange?: (() => void) | null;
        ondatachannel?: ((event: RTCDataChannelEvent) => void) | null;
        ontrack?: ((event: RTCTrackEvent) => void) | null;
      };
      peerConnectionAny.onicecandidate = null;
      peerConnectionAny.onconnectionstatechange = null;
      peerConnectionAny.ondatachannel = null;
      peerConnectionAny.ontrack = null;
      try {
        peerConnection.close();
      } catch (err) {
        console.warn('Failed to close peer connection', err);
      }
      if (connectionRefs.current.dataChannel) {
        try {
          connectionRefs.current.dataChannel.close();
        } catch (err) {
          console.warn('Failed to close data channel', err);
        }
      }
    };
  }, [
    RTCPeerConnectionCtor,
    attachDataChannel,
    iceServers,
    participantId,
    participantRole,
    peerResetNonce,
    ensureCallMedia,
    createAndSendOffer,
    hasRemoteParticipant,
    processSignalPayload,
    sendSignal,
    schedulePeerConnectionRecovery,
    sessionStatus?.status,
    connectedParticipantIds
  ]);

  useEffect(() => {
    const pc = connectionRefs.current.peerConnection;
    if (!pc || pc.signalingState === 'closed') {
      return;
    }
    if (!sessionActiveRef.current || !hasRemoteParticipant()) {
      return;
    }
    if (participantRole !== 'host' || fallbackOfferTimeoutRef.current || hasSentOfferRef.current) {
      return;
    }

    if (pendingHostOfferRef.current) {
      pendingHostOfferRef.current = false;
      fallbackOfferTimeoutRef.current = setTimeout(() => {
        fallbackOfferTimeoutRef.current = null;
        if (!connectionRefs.current.peerConnection || connectionRefs.current.peerConnection !== pc) {
          return;
        }
        if (pc.signalingState !== 'stable' || pc.remoteDescription) {
          return;
        }
        void createAndSendOffer(pc, 'host-resume');
      }, TIMINGS.HOST_OFFER_DELAY);
      return;
    }
  }, [
    connectedParticipantIds,
    createAndSendOffer,
    hasRemoteParticipant,
    participantRole,
    sessionStatus?.status
  ]);

  const sessionStatusLabel = mapStatusLabel(sessionStatus?.status);
  const sessionStatusDescription = mapStatusDescription(sessionStatus?.status);
  const statusIndicatorVariant = statusVariant(sessionStatus?.status);
  const sessionMessageLimit = sessionStatus?.message_char_limit ?? token.message_char_limit ?? DEFAULT_MESSAGE_CHAR_LIMIT;
  const connectedCount = connectedParticipantIds.length;
  const participants: SessionParticipant[] = sessionStatus?.participants ?? [];
  const canSend = connected && draft.trim().length > 0 && !isReconnecting;

  const scrollMessagesToEnd = useCallback(() => {
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 0);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollMessagesToEnd();
    }
  }, [messages.length, scrollMessagesToEnd]);

  const handleSendMessage = useCallback(async () => {
    if (!connected) {
      setError('Connection is not ready yet.');
      return;
    }
    const channel = connectionRefs.current.dataChannel;
    if (!channel || channel.readyState !== 'open') {
      setError('Connection is not ready yet.');
      return;
    }
    if (!participantId) {
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    if (sessionStatus?.message_char_limit && trimmed.length > sessionStatus.message_char_limit) {
      setError(`Messages are limited to ${sessionStatus.message_char_limit} characters.`);
      return;
    }
    if (peerSupportsEncryption === null) {
      setError('Connection is still negotiating. Please wait a moment.');
      return;
    }
    const useEncryption = supportsEncryption === true && peerSupportsEncryption === true;
    const encryptionMode: EncryptionMode = useEncryption ? 'aes-gcm' : 'none';
    const messageId = generateMessageId();
    const createdAt = new Date().toISOString();
    try {
      const hash = await computeMessageHash(token.token, participantId, messageId, trimmed);
      let record: EncryptedMessage;
      if (useEncryption) {
        const key = await deriveKey(token.token);
        const encryptedContent = await encryptText(key, trimmed);
        record = {
          sessionId: token.token,
          messageId,
          participantId,
          role: participantRole,
          createdAt,
          encryptedContent,
          hash,
          encryption: encryptionMode,
          deleted: false
        };
      } else {
        record = {
          sessionId: token.token,
          messageId,
          participantId,
          role: participantRole,
          createdAt,
          content: trimmed,
          hash,
          encryption: encryptionMode,
          deleted: false
        };
      }
      hashedMessagesRef.current.set(messageId, record);
      channel.send(
        JSON.stringify({
          type: 'message',
          message: record
        })
      );
      setMessages((prev: Message[]) =>
        upsertMessage(prev, {
          messageId,
          participantId,
          role: participantRole,
          content: trimmed,
          createdAt
        })
      );
      setDraft('');
      setError(null);
    } catch (err) {
      console.warn('Failed to send message', err);
      setError('Unable to send your message.');
    }
  }, [connected, draft, participantId, participantRole, peerSupportsEncryption, sessionStatus?.message_char_limit, supportsEncryption, token.token]);

    const renderMessage = (item: Message) => {
      const isSelf = item.participantId === participantId;
      return (
        <View
          key={item.messageId}
          style={[styles.chatBubble, isSelf ? styles.chatBubbleSelf : styles.chatBubblePeer]}
        >
          <Text style={styles.chatBubbleMeta}>
            {item.role === 'host' ? 'Host' : 'Guest'} ·{' '}
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.chatBubbleText}>{item.content}</Text>
        </View>
      );
    };

  return (
    <LinearGradient colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.inAppSessionContainer}>
      <SafeAreaView style={styles.inAppSessionSafeArea}>
        <View style={styles.inAppHeaderRow}>
          <TouchableOpacity accessibilityRole="button" style={styles.inAppBackButton} onPress={onExit}>
            <Ionicons name="arrow-back" size={20} color={COLORS.ice} />
            <Text style={styles.inAppBackLabel}>Back</Text>
          </TouchableOpacity>
          <View style={styles.inAppHeaderTextGroup}>
            <Text style={styles.inAppTitle}>Live session cockpit</Text>
            <Text style={styles.inAppSubtitle}>Keep this screen open while participants join.</Text>
          </View>
        </View>
        <ScrollView
          style={styles.sessionScroll}
          contentContainerStyle={styles.sessionContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={[styles.sessionStatusCard, statusCollapsed && styles.sessionStatusCardCollapsed]}>
            <View style={styles.sessionCardHeader}>
              <Text style={styles.sessionCardTitle}>Session status</Text>
              <View style={styles.statusHeaderActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.statusToggleButton}
                  onPress={() => setStatusCollapsed((prev) => !prev)}
                >
                  <Ionicons
                    name={statusCollapsed ? ('chevron-down' as any) : ('chevron-up' as any)}
                    size={16}
                    color={COLORS.ice}
                  />
                  <Text style={styles.statusToggleLabel}>{statusCollapsed ? 'Show' : 'Hide'}</Text>
                </TouchableOpacity>
                <View
                  style={[
                    styles.statusPill,
                    statusIndicatorVariant === 'success'
                      ? styles.statusPillSuccess
                      : statusIndicatorVariant === 'waiting'
                        ? styles.statusPillWaiting
                        : styles.statusPillInactive
                  ]}
                >
                  <View style={styles.statusPillIndicator} />
                  <Text style={styles.statusPillLabel}>{sessionStatusLabel}</Text>
                </View>
              </View>
            </View>
            {!statusCollapsed && (
              <>
                <Text style={styles.sessionCardDescription}>{sessionStatusDescription}</Text>
                <View style={[styles.connectivityBanner, connectivityBadgeStyle]}>
                  <Ionicons name={connectivityIcon as any} size={18} color={COLORS.ice} />
                  <View style={styles.connectivityBannerText}>
                    <Text style={styles.connectivityBannerLabel}>{connectivityLabel}</Text>
                    <Text style={styles.connectivityBannerMessage}>{connectivityMessage}</Text>
                  </View>
                </View>
                {statusLoading ? (
                  <View style={styles.statusLoadingRow}>
                    <ActivityIndicator color={COLORS.aurora} />
                    <Text style={styles.statusLoadingLabel}>Loading session details…</Text>
                  </View>
                ) : statusError ? (
                  <View style={styles.statusErrorBanner}>
                    <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                    <Text style={styles.statusErrorLabel}>{statusError}</Text>
                  </View>
                ) : (
                  <View style={styles.statusMetricsContainer}>
                    <View style={styles.statusMetricRow}>
                      <Text style={styles.statusMetricLabel}>Timer</Text>
                      <Text style={styles.statusMetricValue}>{formatRemainingTime(remainingSeconds)}</Text>
                    </View>
                    <View style={styles.statusMetricRow}>
                      <Text style={styles.statusMetricLabel}>Message limit</Text>
                      <Text style={styles.statusMetricValue}>{sessionMessageLimit.toLocaleString()} characters</Text>
                    </View>
                    <View style={styles.statusMetricRow}>
                      <Text style={styles.statusMetricLabel}>Connected</Text>
                      <Text style={styles.statusMetricValue}>
                        {connectedCount}/{Math.max(participants.length, 2)} participants
                      </Text>
                    </View>
                    <View style={styles.participantList}>
                      {participants.length === 0 ? (
                        <Text style={styles.participantEmpty}>Waiting for participants to join…</Text>
                      ) : (
                        participants.map((participant: SessionParticipant) => {
                          const isConnected = connectedParticipantIds.includes(participant.participant_id);
                          return (
                            <View key={participant.participant_id} style={styles.participantRow}>
                              <View style={styles.participantDetails}>
                                <Text style={styles.participantRoleLabel}>{participant.role === 'host' ? 'Host' : 'Guest'}</Text>
                                <Text style={styles.participantMeta}>{formatJoinedAt(participant.joined_at)}</Text>
                              </View>
                              <View
                                style={[
                                  styles.participantBadge,
                                  isConnected ? styles.participantBadgeOnline : styles.participantBadgeOffline
                                ]}
                              >
                                <Text style={styles.participantBadgeLabel}>
                                  {isConnected ? 'Connected' : 'Awaiting connection'}
                                </Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {showVideoSection && (
            <View style={styles.videoCard}>
            <View style={styles.sessionCardHeader}>
              <Text style={styles.sessionCardTitle}>Video chat</Text>
              <View style={[styles.connectionBadge, videoStatusStyle]}>
                <Text style={styles.connectionBadgeLabel}>{videoStatusLabel}</Text>
              </View>
            </View>
            <Text style={styles.sessionCardDescription}>
              Request a video call once both peers are connected. When accepted, your camera preview appears alongside the
              remote feed.
            </Text>
            <View style={videoPreviewRowStyle}>
              <View style={videoPaneStyle}>
                <Text style={styles.videoPaneLabel}>Remote</Text>
                {RTCViewComponent && remoteVideoUrl ? (
                  <RTCViewComponent streamURL={remoteVideoUrl} style={videoSurfaceStyle} objectFit="cover" />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Ionicons name="videocam-outline" size={28} color={COLORS.ice} />
                    <Text style={styles.videoPlaceholderText}>Waiting for remote video…</Text>
                  </View>
                )}
              </View>
              <View style={videoPaneStyle}>
                <Text style={styles.videoPaneLabel}>You</Text>
                {RTCViewComponent && localVideoUrl ? (
                  <RTCViewComponent streamURL={localVideoUrl} style={videoSurfaceStyle} objectFit="cover" mirror />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Ionicons name="person-circle-outline" size={28} color={COLORS.ice} />
                    <Text style={styles.videoPlaceholderText}>Camera preview</Text>
                  </View>
                )}
              </View>
            </View>
            {incomingCallFrom ? (
              <View style={styles.videoActionsRow}>
                <TouchableOpacity style={[styles.primaryButton, styles.videoAcceptButton]} onPress={acceptVideoChat}>
                  <Ionicons name="videocam" size={18} color={COLORS.midnight} />
                  <Text style={[styles.primaryButtonLabel, styles.videoAcceptLabel]}>Accept video</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.secondaryButton, styles.videoDeclineButton]} onPress={declineVideoChat}>
                  <Text style={styles.secondaryButtonLabel}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.videoActionsRow}>
                <TouchableOpacity
                  style={[styles.primaryButton, !videoReady && styles.primaryButtonDisabled]}
                  disabled={!videoReady}
                  onPress={callState === 'idle' ? requestVideoChat : endVideoChat}
                >
                  {callState === 'idle' ? (
                    <Ionicons name="videocam-outline" size={18} color={COLORS.midnight} />
                  ) : (
                    <Ionicons name="close" size={18} color={COLORS.midnight} />
                  )}
                  <Text style={[styles.primaryButtonLabel, !videoReady && styles.primaryButtonLabelDisabled]}>
                    {callState === 'idle'
                      ? videoReady
                        ? 'Request video chat'
                        : 'Waiting for connection…'
                      : callState === 'active'
                        ? 'End video'
                        : 'Cancel request'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {(callState === 'connecting' || callState === 'active') && (
              <View style={[styles.videoControlsRow, isCallFullscreen && styles.videoControlsRowFullscreen]}>
                <TouchableOpacity style={styles.videoIconButton} onPress={toggleCallFullscreen}>
                  <Ionicons
                    name={isCallFullscreen ? 'contract-outline' : 'expand-outline'}
                    size={18}
                    color={COLORS.midnight}
                  />
                  <Text style={styles.videoIconLabel}>{isCallFullscreen ? 'Exit full screen' : 'Full screen'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.videoIconButton, isLocalVideoMuted && styles.videoIconButtonMuted]}
                  onPress={toggleLocalVideo}
                >
                  <Ionicons
                    name={isLocalVideoMuted ? 'videocam-off' : 'videocam'}
                    size={18}
                    color={COLORS.midnight}
                  />
                  <Text style={styles.videoIconLabel}>{isLocalVideoMuted ? 'Camera off' : 'Camera on'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.videoIconButton, isLocalAudioMuted && styles.videoIconButtonMuted]}
                  onPress={toggleLocalAudio}
                >
                  <Ionicons
                    name={isLocalAudioMuted ? 'mic-off' : 'mic'}
                    size={18}
                    color={COLORS.midnight}
                  />
                  <Text style={styles.videoIconLabel}>{isLocalAudioMuted ? 'Mic muted' : 'Mic live'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.videoIconButton} onPress={flipCamera}>
                  <Ionicons name="camera-reverse-outline" size={18} color={COLORS.midnight} />
                  <Text style={styles.videoIconLabel}>Switch camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.videoIconButton, styles.videoEndButton]} onPress={endVideoChat}>
                  <Ionicons name="call" size={18} color={COLORS.ice} />
                  <Text style={[styles.videoIconLabel, styles.videoEndLabel]}>End call</Text>
                </TouchableOpacity>
              </View>
            )}
            </View>
          )}

          <KeyboardAvoidingView
            style={styles.chatCard}
            behavior={Platform.select({ ios: 'padding', android: undefined })}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 32 : 0}
          >
            <View style={styles.sessionCardHeader}>
              <Text style={styles.sessionCardTitle}>Messages</Text>
              <View style={[styles.connectionBadge, connectionBadgeStyle]}>
                <Text style={styles.connectionBadgeLabel}>{connectionBadgeLabel}</Text>
              </View>
            </View>
            <Text style={styles.sessionCardDescription}>
              Chat with your guest using the native realtime channel. Messages sync over the same WebRTC data channel used on the web.
            </Text>
            {callState === 'idle' && (
              <View style={styles.chatActionsRow}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.chatActionButton, !videoReady && styles.primaryButtonDisabled]}
                  disabled={!videoReady}
                  onPress={requestVideoChat}
                >
                  <Ionicons name="videocam-outline" size={18} color={COLORS.midnight} />
                  <Text style={[styles.primaryButtonLabel, !videoReady && styles.primaryButtonLabelDisabled]}>Request video call</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.chatListWrapper}>
              {messages.length === 0 ? (
                <View style={styles.chatEmptyState}>
                  <Text style={styles.chatEmptyText}>
                    {connected ? 'Say hello to get things started.' : 'Waiting for the realtime channel to connect…'}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  ref={chatScrollRef}
                  style={styles.chatList}
                  contentContainerStyle={styles.chatListContent}
                  keyboardShouldPersistTaps="handled"
                  onContentSizeChange={scrollMessagesToEnd}
                >
                  {messages.map(renderMessage)}
                </ScrollView>
              )}
            </View>
            {error ? <Text style={styles.chatError}>{error}</Text> : null}
            <View style={styles.chatComposerRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message…"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={draft}
                onChangeText={setDraft}
                editable={connected && !isReconnecting}
                multiline
              />
              <TouchableOpacity style={[styles.sendButton, !canSend && styles.sendButtonDisabled]} onPress={handleSendMessage} disabled={!canSend}>
                {canSend ? <Ionicons name="send" size={18} color={COLORS.midnight} /> : <Ionicons name="send" size={18} color="rgba(2,11,31,0.4)" />}
              </TouchableOpacity>
            </View>
            <Text style={styles.chatMetaLabel}>
              Data channel: {dataChannelState ?? '—'} · Socket: {socketReady ? 'connected' : 'offline'}
            </Text>
          </KeyboardAvoidingView>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const MainScreen: React.FC = () => {
  const webRtcAvailable = isWebRtcSupported();
  const [showForm, setShowForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null);
  const [inAppSession, setInAppSession] = useState(false);
  const [joiningInApp, setJoiningInApp] = useState(false);
  const [inAppParticipantId, setInAppParticipantId] = useState<string | null>(null);
  const [participantRole, setParticipantRole] = useState<string | null>(null);
  const isInAppSessionActive = Boolean(tokenResponse && inAppSession);

  const handleReset = () => {
    setTokenResponse(null);
    setInAppSession(false);
    setInAppParticipantId(null);
    setJoiningInApp(false);
    setParticipantRole(null);
    setShowJoinForm(false);
  };

  const handleStartInApp = async () => {
    if (!tokenResponse || joiningInApp) {
      return;
    }
    if (!webRtcAvailable) {
      Alert.alert(
        'Development build required',
        'Expo Go does not include the WebRTC native module. Run “npx expo run:ios” or “npx expo run:android” to install the Expo dev build before launching sessions here, or use “On web”.'
      );
      return;
    }

    try {
      setJoiningInApp(true);
      const payload = await joinSession(tokenResponse.token, inAppParticipantId);
      setInAppParticipantId(payload.participant_id);
      setTokenResponse((prev: TokenResponse | null) => (prev ? { ...prev, token: payload.token || prev.token } : prev));
      setParticipantRole(payload.role ?? 'host');
      setInAppSession(true);
    } catch (error: any) {
      Alert.alert('Cannot start session', error?.message ?? 'Unexpected error while launching the in-app session.');
    } finally {
      setJoiningInApp(false);
    }
  };

  const renderContent = () => {
    if (tokenResponse && inAppSession) {
      if (!webRtcAvailable) {
        return (
          <LinearGradient
            colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sessionFallbackCard}
          >
            <Text style={styles.sessionFallbackTitle}>Development build required</Text>
            <Text style={styles.sessionFallbackBody}>
              Expo Go doesn’t ship the WebRTC native module. Install the Expo dev build (run “npx expo run:ios” or “npx expo
              run:android”) and relaunch the app to continue hosting sessions natively.
            </Text>
            <TouchableOpacity style={styles.resetButton} onPress={() => setInAppSession(false)}>
              <Text style={styles.resetButtonLabel}>Back to token</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sessionFallbackLink} onPress={() => void Linking.openURL(EXPO_DEV_BUILD_DOCS_URL)}>
              <Text style={styles.sessionFallbackLinkLabel}>View setup guide</Text>
            </TouchableOpacity>
          </LinearGradient>
        );
      }
      if (!inAppParticipantId || !participantRole) {
        return (
          <LinearGradient
            colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sessionFallbackCard}
          >
            <Text style={styles.sessionFallbackTitle}>Session connection lost</Text>
            <Text style={styles.sessionFallbackBody}>
              We couldn't recover your participant link. Return to the token screen and try launching the in-app session again.
            </Text>
            <TouchableOpacity style={styles.resetButton} onPress={() => setInAppSession(false)}>
              <Text style={styles.resetButtonLabel}>Back to token</Text>
            </TouchableOpacity>
          </LinearGradient>
        );
      }

      return (
        <InAppSessionScreen
          token={tokenResponse}
          participantId={inAppParticipantId}
          participantRole={participantRole!}
          onExit={() => setInAppSession(false)}
        />
      );
    }

    if (tokenResponse) {
      return (
        <TokenResultCard
          token={tokenResponse}
          onReset={handleReset}
          onStartInApp={handleStartInApp}
          joiningInApp={joiningInApp}
          webRtcAvailable={webRtcAvailable}
        />
      );
    }

    return (
      <View style={styles.actionRow}>
        <BigActionButton
          title="Need token"
          description="Create a secure pass with custom duration."
          onPress={() => setShowForm(true)}
          background="rgba(8, 47, 112, 0.72)"
          icon={<Ionicons name="planet" size={42} color={COLORS.aurora} />}
        />
        <BigActionButton
          title="Got token"
          description="Enter a shared key to join an existing orbit."
          onPress={() => setShowJoinForm(true)}
          background="rgba(6, 36, 92, 0.78)"
          icon={<MaterialCommunityIcons name="shield-check" size={42} color={COLORS.aurora} />}
        />
      </View>
    );
  };

  const renderedContent = renderContent();

  return (
    <LinearGradient
      colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean, COLORS.lagoon]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.container, isInAppSessionActive && styles.containerInSession]}
    >
      <StatusBar style="light" />
      {isInAppSessionActive ? (
        renderedContent
      ) : (
        <ScrollView
          style={styles.landingScroll}
          contentContainerStyle={styles.landingContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Launch a ChatOrbit session</Text>
            <Text style={styles.headerSubtitle}>
              Generate a one-time secure token or prepare to join an existing session with a single tap.
            </Text>
          </View>
          {renderedContent}
        </ScrollView>
      )}
        <NeedTokenForm
          visible={showForm && !tokenResponse}
          onClose={() => setShowForm(false)}
          onGenerated={(tokenData: TokenResponse) => {
            setShowForm(false);
            setTokenResponse(tokenData);
            setInAppParticipantId(null);
            setInAppSession(false);
            setJoiningInApp(false);
            setParticipantRole(null);
          }}
      />
        <JoinTokenForm
          visible={showJoinForm && !tokenResponse}
          onClose={() => setShowJoinForm(false)}
          onJoined={({ payload, token }: JoinTokenFormResult) => {
          setShowJoinForm(false);
          const now = Date.now();
          const ttlGuess = payload.session_expires_at && payload.session_started_at
            ? Math.max(
                0,
                Math.round(
                  (new Date(payload.session_expires_at).getTime() - new Date(payload.session_started_at).getTime()) / 1000
                )
              )
            : 3600;
          setTokenResponse({
            token: payload.token || token,
            validity_expires_at: payload.session_expires_at ?? payload.session_started_at ?? new Date(now + ttlGuess * 1000).toISOString(),
            session_ttl_seconds: ttlGuess,
            message_char_limit: payload.message_char_limit ?? DEFAULT_MESSAGE_CHAR_LIMIT,
            created_at: new Date().toISOString()
          });
          setInAppParticipantId(payload.participant_id);
          setParticipantRole(payload.role ?? 'guest');
          setInAppSession(true);
          setJoiningInApp(false);
        }}
          webRtcAvailable={webRtcAvailable}
      />
    </LinearGradient>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font
  });
  const [accepted, setAccepted] = useState(false);

  if (!fontsLoaded) {
    return (
      <LinearGradient
        colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean, COLORS.lagoon]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.loadingContainer}
      >
        <StatusBar style="light" />
        <ActivityIndicator color={COLORS.mint} size="large" />
      </LinearGradient>
    );
  }

  if (!accepted) {
    return <AcceptScreen onAccept={() => setAccepted(true)} />;
  }

  return <MainScreen />;
}


