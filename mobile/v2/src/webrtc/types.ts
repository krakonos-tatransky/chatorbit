/**
 * WebRTC Types
 *
 * Type definitions for WebRTC signaling, peer connections, and media.
 */

import { RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';

/**
 * Signaling message types
 */
export type SignalingMessageType =
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'message'
  | 'error'
  | 'session-ended'
  | 'session_deleted'  // Backend sends this when session is ended via API
  | 'session_closed'   // Backend may send this for other close scenarios
  | 'session_expired'  // Backend sends this when session expires
  | 'video-invite'
  | 'video-accept'
  | 'status'
  | 'signal';

/**
 * Base signaling message
 */
export interface BaseSignalingMessage {
  type: SignalingMessageType;
  participantId: string;
}

/**
 * WebRTC offer message
 */
export interface OfferMessage extends BaseSignalingMessage {
  type: 'offer';
  offer: RTCSessionDescriptionInit;
}

/**
 * WebRTC answer message
 */
export interface AnswerMessage extends BaseSignalingMessage {
  type: 'answer';
  answer: RTCSessionDescriptionInit;
}

/**
 * ICE candidate message
 */
export interface IceCandidateMessage extends BaseSignalingMessage {
  type: 'ice-candidate';
  candidate: RTCIceCandidateInit;
}

/**
 * Encrypted chat message
 */
export interface ChatMessage extends BaseSignalingMessage {
  type: 'message';
  payload: string; // Base64 encrypted payload
  messageId: string;
  timestamp: number;
}

/**
 * Error message
 */
export interface ErrorMessage extends BaseSignalingMessage {
  type: 'error';
  error: string;
}

/**
 * Session ended message (peer-to-peer notification)
 */
export interface SessionEndedMessage extends BaseSignalingMessage {
  type: 'session-ended';
  reason?: string;
}

/**
 * Session deleted message (from backend when session is ended via API)
 */
export interface SessionDeletedMessage {
  type: 'session_deleted';
}

/**
 * Session closed message (from backend)
 */
export interface SessionClosedMessage {
  type: 'session_closed';
}

/**
 * Session expired message (from backend when session times out)
 */
export interface SessionExpiredMessage {
  type: 'session_expired';
}

/**
 * Video invite message
 */
export interface VideoInviteMessage extends BaseSignalingMessage {
  type: 'video-invite';
}

/**
 * Video accept message
 */
export interface VideoAcceptMessage extends BaseSignalingMessage {
  type: 'video-accept';
}

/**
 * Session status message (sent when session state changes)
 * Backend uses snake_case for these fields
 */
export interface StatusMessage extends BaseSignalingMessage {
  type: 'status';
  status?: string; // 'active', 'issued', 'closed', etc.
  connected_participants?: string[]; // Array of participant IDs
  session_started_at?: string;
  session_expires_at?: string;
  remaining_seconds?: number;
}

/**
 * Signal-wrapped message (used for backend communication)
 */
export interface SignalMessage extends BaseSignalingMessage {
  type: 'signal';
  signalType: string;
  payload?: any;
  fromParticipant?: string;
}

/**
 * Union of all signaling messages
 */
export type SignalingMessage =
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | ChatMessage
  | ErrorMessage
  | SessionEndedMessage
  | SessionDeletedMessage
  | SessionClosedMessage
  | SessionExpiredMessage
  | VideoInviteMessage
  | VideoAcceptMessage
  | StatusMessage
  | SignalMessage;

/**
 * WebRTC configuration
 */
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

/**
 * Media constraints
 */
export interface MediaConstraints {
  audio: boolean | MediaTrackConstraints;
  video: boolean | MediaTrackConstraints;
}

/**
 * Default media constraints
 */
export const DEFAULT_MEDIA_CONSTRAINTS: MediaConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    facingMode: 'user',
  },
};

/**
 * WebRTC error codes
 */
export enum WebRTCErrorCode {
  SIGNALING_CONNECTION_FAILED = 'SIGNALING_CONNECTION_FAILED',
  SIGNALING_DISCONNECTED = 'SIGNALING_DISCONNECTED',
  PEER_CONNECTION_FAILED = 'PEER_CONNECTION_FAILED',
  NOT_CONNECTED = 'NOT_CONNECTED',
  MEDIA_PERMISSION_DENIED = 'MEDIA_PERMISSION_DENIED',
  MEDIA_DEVICE_ERROR = 'MEDIA_DEVICE_ERROR',
  DATA_CHANNEL_ERROR = 'DATA_CHANNEL_ERROR',
  SEND_MESSAGE_FAILED = 'SEND_MESSAGE_FAILED',
  INVALID_STATE = 'INVALID_STATE',
}

/**
 * WebRTC error
 */
export class WebRTCError extends Error {
  constructor(
    public code: WebRTCErrorCode,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WebRTCError';
  }
}

/**
 * Data channel message types
 */
export type DataChannelMessageType = 'message' | 'typing' | 'ack';

/**
 * Data channel message
 */
export interface DataChannelMessage {
  type: DataChannelMessageType;
  payload: string;
  messageId: string;
  timestamp: number;
}

/**
 * Typing indicator message
 */
export interface TypingMessage {
  type: 'typing';
  isTyping: boolean;
}

/**
 * Message acknowledgment
 */
export interface AckMessage {
  type: 'ack';
  messageId: string;
}
