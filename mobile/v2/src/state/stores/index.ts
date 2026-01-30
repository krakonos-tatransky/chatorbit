/**
 * Zustand Stores
 *
 * Barrel file for all state management stores.
 */

// Session store
export {
  useSessionStore,
  selectSessionActive,
  selectIsHost,
  selectIsGuest,
  selectSessionData,
  selectSessionTiming,
} from './sessionStore';

// Messages store
export {
  useMessagesStore,
  selectMessages,
  selectLastMessage,
  selectIsSending,
  selectSendError,
  decryptAndAddMessage,
} from './messagesStore';
export type { Message, MessageStatus, MessageType } from './messagesStore';

// Connection store
export {
  useConnectionStore,
  selectConnectionState,
  selectIsConnected,
  selectIsConnecting,
  selectSignalingConnected,
  selectHasMedia,
  selectNetworkStatus,
  selectConnectionError,
} from './connectionStore';
export type {
  ConnectionState,
  SignalingState,
  IceConnectionState,
  PeerConnectionState,
  NetworkQuality,
} from './connectionStore';

// Settings store
export {
  useSettingsStore,
  selectBackgroundPattern,
  selectPatternSize,
  selectIsHydrated,
  selectBackgroundSettings,
  selectIsPaidVersion,
  selectShouldShowAds,
} from './settingsStore';
