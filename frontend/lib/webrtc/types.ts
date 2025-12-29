/**
 * WebRTC Type Definitions
 *
 * Type definitions for ChatOrbit's browser WebRTC implementation.
 * Extracted from session-view.tsx for modularity.
 */

// ============================================================================
// Connection State Types
// ============================================================================

export type CallState = "idle" | "incoming" | "requesting" | "connecting" | "active";

export type EncryptionMode = "aes-gcm" | "none";

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  messageId: string;
  participantId: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface EncryptedMessage {
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
}

// ============================================================================
// Signaling Message Types
// ============================================================================

export type SignalingMessageType =
  | 'offer'
  | 'answer'
  | 'iceCandidate'
  | 'ice-candidate'
  | 'message'
  | 'video-invite'
  | 'video-accept'
  | 'video-end';

export interface SignalingMessage {
  type: 'signal' | 'status' | 'message' | 'session-ended' | 'error';
  signalType?: SignalingMessageType;
  payload?: unknown;
  participantId?: string;
}

export interface SignalPayload {
  signalType: SignalingMessageType;
  payload: unknown;
}

// ============================================================================
// DataChannel Message Types
// ============================================================================

export type DataChannelMessageType =
  | 'message'
  | 'ack'
  | 'call'
  | 'capabilities'
  | 'typing';

export interface DataChannelMessage {
  type: DataChannelMessageType;
  [key: string]: unknown;
}

export interface CallMessage extends DataChannelMessage {
  type: 'call';
  action: 'request' | 'accept' | 'reject' | 'cancel' | 'end' | 'busy' | 'renegotiate';
  from?: string;
}

export interface CapabilitiesMessage extends DataChannelMessage {
  type: 'capabilities';
  supportsEncryption: boolean;
}

export interface MessageAck extends DataChannelMessage {
  type: 'ack';
  messageId: string;
}

export interface TextMessage extends DataChannelMessage {
  type: 'message';
  message?: EncryptedMessage; // Browser-compatible format
  payload?: string; // Mobile format
  messageId?: string;
  timestamp?: number;
}

// ============================================================================
// ICE and Connection Types
// ============================================================================

export interface IceCandidateStats {
  candidateType: string | null;
  protocol: string | null;
  relayProtocol: string | null;
  address: string | null;
  port: string | null;
}

export interface IceRouteInfo {
  display: string;
  label: string;
  localDetail: string | null;
  remoteDetail: string | null;
  localType: string | null;
  remoteType: string | null;
}

export interface IceConnectionStats {
  timestamp: number;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  iceGatheringState: RTCIceGatheringState;
  localCandidateType: string | null;
  remoteCandidateType: string | null;
  bytesSent: number;
  bytesReceived: number;
  currentRoundTripTime: number | null;
  availableOutgoingBitrate: number | null;
}

// ============================================================================
// Session Types
// ============================================================================

export interface Participant {
  participantId: string;
  role: string;
  joinedAt: string;
}

export interface SessionStatus {
  token: string;
  status: "issued" | "active" | "closed" | "expired" | "deleted";
  validityExpiresAt: string;
  sessionStartedAt: string | null;
  sessionExpiresAt: string | null;
  messageCharLimit: number;
  participants: Participant[];
  remainingSeconds: number | null;
  connectedParticipants?: string[];
}

// ============================================================================
// Event Callback Types
// ============================================================================

export type SignalingStateChangeCallback = (state: RTCSignalingState) => void;
export type IceConnectionStateChangeCallback = (state: RTCIceConnectionState) => void;
export type IceGatheringStateChangeCallback = (state: RTCIceGatheringState) => void;
export type ConnectionStateChangeCallback = (state: RTCPeerConnectionState) => void;
export type IceCandidateCallback = (candidate: RTCIceCandidate) => void;
export type DataChannelStateChangeCallback = (state: RTCDataChannelState) => void;
export type DataChannelMessageCallback = (message: DataChannelMessage) => void;
export type RemoteStreamCallback = (stream: MediaStream) => void;
export type SignalingMessageCallback = (message: SignalingMessage) => void;
export type ErrorCallback = (error: Error) => void;

// ============================================================================
// Configuration Types
// ============================================================================

export interface WebRTCConfig {
  iceServers?: RTCIceServer[];
  iceCandidatePoolSize?: number;
  iceTransportPolicy?: RTCIceTransportPolicy;
}

export interface SignalingConfig {
  url: string;
  reconnectMaxAttempts?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
}

export interface MediaConstraintsConfig {
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
}

// ============================================================================
// Manager Event Handlers
// ============================================================================

export interface WebRTCManagerCallbacks {
  onIceConnectionStateChange?: IceConnectionStateChangeCallback;
  onConnectionStateChange?: ConnectionStateChangeCallback;
  onDataChannelStateChange?: DataChannelStateChangeCallback;
  onDataChannelMessage?: DataChannelMessageCallback;
  onRemoteStream?: RemoteStreamCallback;
  onCallInvite?: (from: string | null) => void;
  onCallAccepted?: () => void;
  onCallRejected?: () => void;
  onCallEnded?: () => void;
  onError?: ErrorCallback;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_RECONNECT_BASE_DELAY_MS = 1000;
export const FAST_NETWORK_RECONNECT_DELAY_MS = 400;
export const MODERATE_NETWORK_RECONNECT_DELAY_MS = 700;
export const RECONNECT_MAX_DELAY_MS = 30000;
export const MAX_ICE_FAILURE_RETRIES = 5;
export const ICE_RETRY_BASE_DELAY_MS = 500;
export const ICE_RETRY_MAX_DELAY_MS = 16000;
export const DATA_CHANNEL_TIMEOUT_MS = 10000;
export const DATA_CHANNEL_TIMEOUT_SLOW_NETWORK_MS = 20000;
export const ICE_CANDIDATE_CACHE_MAX_SIZE = 100;
