/**
 * Session Store
 *
 * Manages session state including token, participant info, and session timing.
 * Handles join/leave actions and session status updates.
 */

import { create } from 'zustand';
import type {
  ParticipantRole,
  SessionStatus,
  JoinSessionResponse,
  SessionStatusResponse,
} from '@/services/api/types';
import { joinSession, getSessionStatus, deleteSession } from '@/services/api';

/**
 * Session state
 */
interface SessionState {
  // Session data
  token: string | null;
  participantId: string | null;
  role: ParticipantRole | null;
  status: SessionStatus | null;
  messageCharLimit: number;

  // Timing
  sessionStartedAt: Date | null;
  sessionExpiresAt: Date | null;
  remainingSeconds: number | null;

  // Loading & error state
  isJoining: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Session actions
 */
interface SessionActions {
  /**
   * Join a session with a token
   */
  joinSession: (
    token: string,
    participantId?: string | null,
    clientIdentity?: string | null
  ) => Promise<void>;

  /**
   * Update session status from server
   */
  updateSessionStatus: (token: string) => Promise<void>;

  /**
   * End the current session
   */
  endSession: () => Promise<void>;

  /**
   * Update remaining time (called by timer)
   */
  updateRemainingTime: (seconds: number) => void;

  /**
   * Clear session state (logout)
   */
  clearSession: () => void;

  /**
   * Set error state
   */
  setError: (error: string | null) => void;
}

/**
 * Session store type
 */
type SessionStore = SessionState & SessionActions;

/**
 * Initial state
 */
const initialState: SessionState = {
  token: null,
  participantId: null,
  role: null,
  status: null,
  messageCharLimit: 2000,
  sessionStartedAt: null,
  sessionExpiresAt: null,
  remainingSeconds: null,
  isJoining: false,
  isLoading: false,
  error: null,
};

/**
 * Session store
 */
export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  joinSession: async (token, participantId = null, clientIdentity = null) => {
    set({ isJoining: true, error: null });
    try {
      const response: JoinSessionResponse = await joinSession({
        token,
        participant_id: participantId,
        client_identity: clientIdentity,
      });

      set({
        token: response.token,
        participantId: response.participant_id,
        role: response.role,
        status: response.session_active ? 'active' : 'issued',
        messageCharLimit: response.message_char_limit,
        sessionStartedAt: response.session_started_at
          ? new Date(response.session_started_at)
          : null,
        sessionExpiresAt: response.session_expires_at
          ? new Date(response.session_expires_at)
          : null,
        isJoining: false,
        error: null,
      });
    } catch (error) {
      set({
        isJoining: false,
        error: error instanceof Error ? error.message : 'Failed to join session',
      });
      throw error;
    }
  },

  updateSessionStatus: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const response: SessionStatusResponse = await getSessionStatus(token);

      set({
        token: response.token,
        status: response.status,
        messageCharLimit: response.message_char_limit,
        sessionStartedAt: response.session_started_at
          ? new Date(response.session_started_at)
          : null,
        sessionExpiresAt: response.session_expires_at
          ? new Date(response.session_expires_at)
          : null,
        remainingSeconds: response.remaining_seconds ?? null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Failed to update session status',
      });
      throw error;
    }
  },

  endSession: async () => {
    const { token } = get();
    if (!token) {
      set({ error: 'No active session to end' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      await deleteSession(token);
      set({
        ...initialState,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to end session',
      });
      throw error;
    }
  },

  updateRemainingTime: (seconds) => {
    set({ remainingSeconds: seconds });
  },

  clearSession: () => {
    set(initialState);
  },

  setError: (error) => {
    set({ error });
  },
}));

/**
 * Selectors for common state slices
 */
export const selectSessionActive = (state: SessionStore) =>
  state.status === 'active';

export const selectIsHost = (state: SessionStore) => state.role === 'host';

export const selectIsGuest = (state: SessionStore) => state.role === 'guest';

export const selectSessionData = (state: SessionStore) => ({
  token: state.token,
  participantId: state.participantId,
  role: state.role,
  status: state.status,
  messageCharLimit: state.messageCharLimit,
});

export const selectSessionTiming = (state: SessionStore) => ({
  sessionStartedAt: state.sessionStartedAt,
  sessionExpiresAt: state.sessionExpiresAt,
  remainingSeconds: state.remainingSeconds,
});
