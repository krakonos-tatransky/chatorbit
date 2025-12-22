/**
 * WebRTC Module
 *
 * Barrel file for all WebRTC exports.
 */

// Manager (main API)
export { WebRTCManager, webrtcManager } from './manager';

// Signaling
export { SignalingClient, signalingClient } from './signaling';
export type { SignalingMessageHandler } from './signaling';

// Peer Connection
export { PeerConnection } from './connection';
export type {
  DataChannelMessageHandler,
  MediaStreamHandler,
  IceCandidateHandler,
} from './connection';

// Types
export type {
  SignalingMessage,
  SignalingMessageType,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  ChatMessage,
  ErrorMessage,
  SessionEndedMessage,
  VideoInviteMessage,
  VideoAcceptMessage,
  WebRTCConfig,
  MediaConstraints,
  DataChannelMessage,
  DataChannelMessageType,
  TypingMessage,
  AckMessage,
} from './types';

export { WebRTCError, WebRTCErrorCode, DEFAULT_MEDIA_CONSTRAINTS } from './types';
