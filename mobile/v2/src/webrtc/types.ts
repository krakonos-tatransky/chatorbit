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
  | 'video-invite'
  | 'video-accept';

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
 * Session ended message
 */
export interface SessionEndedMessage extends BaseSignalingMessage {
  type: 'session-ended';
  reason?: string;
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
 * Union of all signaling messages
 */
export type SignalingMessage =
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | ChatMessage
  | ErrorMessage
  | SessionEndedMessage
  | VideoInviteMessage
  | VideoAcceptMessage;

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
  audio: true,
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
