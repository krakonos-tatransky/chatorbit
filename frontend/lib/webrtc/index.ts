/**
 * WebRTC Module - Public Exports
 *
 * Modular WebRTC implementation for ChatOrbit browser client.
 * Extracted from session-view.tsx for maintainability and reusability.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export * from './types';

// ============================================================================
// Encryption Utilities
// ============================================================================

export {
  resolveCrypto,
  toBase64,
  fromBase64,
  deriveKey,
  encryptMessage,
  decryptMessage,
  generateMessageId,
  calculateMessageHash,
  type CryptoLike,
} from './encryption';

// ============================================================================
// Signaling Client
// ============================================================================

export {
  SignalingClient,
  type SignalingClientConfig,
  type SignalingClientCallbacks,
} from './signaling';

// ============================================================================
// ICE Configuration (from existing webrtc.ts)
// ============================================================================

export { getIceServers } from '../webrtc';

// ============================================================================
// Peer Connection
// ============================================================================

export { PeerConnection } from './connection';

// ============================================================================
// WebRTC Manager
// ============================================================================

export { WebRTCManager, type DecryptedMessage } from './manager';
