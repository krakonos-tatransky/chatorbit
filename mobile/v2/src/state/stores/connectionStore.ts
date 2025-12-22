/**
 * Connection Store
 *
 * Manages WebRTC connection state, network status, and connection actions.
 * Tracks peer connection, signaling, and ICE connection states.
 */

import { create } from 'zustand';

/**
 * Overall connection state
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'failed';

/**
 * WebSocket signaling state
 */
export type SignalingState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/**
 * WebRTC ICE connection state
 */
export type IceConnectionState =
  | 'new'
  | 'checking'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'disconnected'
  | 'closed';

/**
 * WebRTC peer connection state
 */
export type PeerConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

/**
 * Network quality indicator
 */
export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'unknown';

/**
 * Connection state
 */
interface ConnectionStoreState {
  // Overall state
  connectionState: ConnectionState;

  // WebSocket signaling
  signalingState: SignalingState;
  signalingError: string | null;

  // WebRTC states
  iceConnectionState: IceConnectionState;
  peerConnectionState: PeerConnectionState;

  // Network quality
  networkQuality: NetworkQuality;
  rtt: number | null; // Round-trip time in ms

  // Media tracks
  hasLocalVideo: boolean;
  hasLocalAudio: boolean;
  hasRemoteVideo: boolean;
  hasRemoteAudio: boolean;

  // Error state
  error: string | null;
  lastError: string | null;
}

/**
 * Connection actions
 */
interface ConnectionActions {
  /**
   * Update overall connection state
   */
  setConnectionState: (state: ConnectionState) => void;

  /**
   * Update signaling state
   */
  setSignalingState: (state: SignalingState, error?: string | null) => void;

  /**
   * Update ICE connection state
   */
  setIceConnectionState: (state: IceConnectionState) => void;

  /**
   * Update peer connection state
   */
  setPeerConnectionState: (state: PeerConnectionState) => void;

  /**
   * Update network quality metrics
   */
  updateNetworkQuality: (quality: NetworkQuality, rtt?: number | null) => void;

  /**
   * Update local media tracks
   */
  setLocalMedia: (hasVideo: boolean, hasAudio: boolean) => void;

  /**
   * Update remote media tracks
   */
  setRemoteMedia: (hasVideo: boolean, hasAudio: boolean) => void;

  /**
   * Set connection error
   */
  setError: (error: string | null) => void;

  /**
   * Clear connection error
   */
  clearError: () => void;

  /**
   * Reset connection state
   */
  resetConnection: () => void;
}

/**
 * Connection store type
 */
type ConnectionStore = ConnectionStoreState & ConnectionActions;

/**
 * Initial state
 */
const initialState: ConnectionStoreState = {
  connectionState: 'disconnected',
  signalingState: 'disconnected',
  signalingError: null,
  iceConnectionState: 'new',
  peerConnectionState: 'new',
  networkQuality: 'unknown',
  rtt: null,
  hasLocalVideo: false,
  hasLocalAudio: false,
  hasRemoteVideo: false,
  hasRemoteAudio: false,
  error: null,
  lastError: null,
};

/**
 * Connection store
 */
export const useConnectionStore = create<ConnectionStore>((set) => ({
  ...initialState,

  setConnectionState: (connectionState) => {
    set({ connectionState });
  },

  setSignalingState: (signalingState, signalingError = null) => {
    set({ signalingState, signalingError });
  },

  setIceConnectionState: (iceConnectionState) => {
    set({ iceConnectionState });

    // Auto-update overall connection state based on ICE state
    if (iceConnectionState === 'connected' || iceConnectionState === 'completed') {
      set({ connectionState: 'connected' });
    } else if (iceConnectionState === 'checking') {
      set({ connectionState: 'connecting' });
    } else if (iceConnectionState === 'failed') {
      set({ connectionState: 'failed' });
    } else if (iceConnectionState === 'disconnected') {
      set({ connectionState: 'reconnecting' });
    }
  },

  setPeerConnectionState: (peerConnectionState) => {
    set({ peerConnectionState });
  },

  updateNetworkQuality: (networkQuality, rtt = null) => {
    set({ networkQuality, rtt });
  },

  setLocalMedia: (hasLocalVideo, hasLocalAudio) => {
    set({ hasLocalVideo, hasLocalAudio });
  },

  setRemoteMedia: (hasRemoteVideo, hasRemoteAudio) => {
    set({ hasRemoteVideo, hasRemoteAudio });
  },

  setError: (error) => {
    set({ error, lastError: error });
  },

  clearError: () => {
    set({ error: null });
  },

  resetConnection: () => {
    set(initialState);
  },
}));

/**
 * Selectors for common state slices
 */
export const selectConnectionState = (state: ConnectionStore) =>
  state.connectionState;

export const selectIsConnected = (state: ConnectionStore) =>
  state.connectionState === 'connected';

export const selectIsConnecting = (state: ConnectionStore) =>
  state.connectionState === 'connecting' ||
  state.connectionState === 'reconnecting';

export const selectSignalingConnected = (state: ConnectionStore) =>
  state.signalingState === 'connected';

export const selectHasMedia = (state: ConnectionStore) => ({
  localVideo: state.hasLocalVideo,
  localAudio: state.hasLocalAudio,
  remoteVideo: state.hasRemoteVideo,
  remoteAudio: state.hasRemoteAudio,
});

export const selectNetworkStatus = (state: ConnectionStore) => ({
  quality: state.networkQuality,
  rtt: state.rtt,
});

export const selectConnectionError = (state: ConnectionStore) => state.error;
