/**
 * API Services
 *
 * Barrel file for all API service exports.
 */

// Client
export { apiClient } from './client';
export {
  isRateLimitError,
  isNotFoundError,
  isConflictError,
  isGoneError,
  isNetworkError,
} from './client';

// Types
export type {
  ValidityPeriod,
  SessionStatus,
  ParticipantRole,
  CreateTokenRequest,
  TokenResponse,
  JoinSessionRequest,
  JoinSessionResponse,
  ParticipantPublic,
  SessionStatusResponse,
  ReportAbuseQuestionnaire,
  ReportAbuseRequest,
  ReportAbuseResponse,
  APIError,
  WebSocketParams,
} from './types';

// Token API
export { mintToken, getDefaultTokenParams, validateTokenParams } from './tokens';

// Session API
export {
  joinSession,
  getSessionStatus,
  deleteSession,
  reportAbuse,
  isSessionActive,
  isSessionJoinable,
  isSessionEnded,
  getRemainingSeconds,
  formatRemainingTime,
} from './sessions';
