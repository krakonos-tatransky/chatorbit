/**
 * API Types
 *
 * TypeScript types generated from OpenAPI specification.
 * These types match the backend API contracts exactly.
 */

/**
 * Token validity period options
 */
export type ValidityPeriod = '1_day' | '1_week' | '1_month' | '1_year';

/**
 * Session status values
 */
export type SessionStatus = 'issued' | 'active' | 'closed' | 'expired' | 'deleted';

/**
 * Participant role in session
 */
export type ParticipantRole = 'host' | 'guest';

// ============================================================================
// Token Endpoints
// ============================================================================

/**
 * Request to create a new token
 * POST /api/tokens
 */
export interface CreateTokenRequest {
  /** How long the token remains valid for joining */
  validity_period: ValidityPeriod;
  /** How long the live chat session stays active once both users connect (1-1440 minutes) */
  session_ttl_minutes: number;
  /** Maximum characters allowed per message (200-16000, default: 2000) */
  message_char_limit?: number;
  /** Optional unique identifier provided by the client instead of an IP address */
  client_identity?: string | null;
}

/**
 * Response when token is successfully created
 */
export interface TokenResponse {
  /** The generated token string */
  token: string;
  /** When the token expires and can no longer be used to join */
  validity_expires_at: string; // ISO 8601 date-time
  /** Session time-to-live in seconds */
  session_ttl_seconds: number;
  /** Maximum characters allowed per message */
  message_char_limit: number;
  /** When the token was created */
  created_at: string; // ISO 8601 date-time
}

// ============================================================================
// Session Endpoints
// ============================================================================

/**
 * Request to join a session with a token
 * POST /api/sessions/join
 */
export interface JoinSessionRequest {
  /** The token to join with */
  token: string;
  /** Existing participant identifier when reclaiming a session slot */
  participant_id?: string | null;
  /** Optional unique identifier provided by the client instead of an IP address */
  client_identity?: string | null;
}

/**
 * Response when successfully joining a session
 */
export interface JoinSessionResponse {
  /** The session token */
  token: string;
  /** Unique participant identifier */
  participant_id: string;
  /** Role assigned to this participant */
  role: ParticipantRole;
  /** Whether the session is currently active (both participants connected) */
  session_active: boolean;
  /** When the session started (if active) */
  session_started_at?: string | null; // ISO 8601 date-time
  /** When the session will expire (if active) */
  session_expires_at?: string | null; // ISO 8601 date-time
  /** Maximum characters allowed per message */
  message_char_limit: number;
}

/**
 * Public participant information
 */
export interface ParticipantPublic {
  /** Unique participant identifier */
  participant_id: string;
  /** Participant role */
  role: string;
  /** When the participant joined */
  joined_at: string; // ISO 8601 date-time
}

/**
 * Session status response
 * GET /api/sessions/{token}/status
 * DELETE /api/sessions/{token}
 */
export interface SessionStatusResponse {
  /** The session token */
  token: string;
  /** Current session status */
  status: SessionStatus;
  /** When the token expires */
  validity_expires_at: string; // ISO 8601 date-time
  /** When the session started (if active) */
  session_started_at?: string | null; // ISO 8601 date-time
  /** When the session will expire (if active) */
  session_expires_at?: string | null; // ISO 8601 date-time
  /** Maximum characters allowed per message */
  message_char_limit: number;
  /** List of participants in the session */
  participants: ParticipantPublic[];
  /** Remaining seconds until session expires (if active) */
  remaining_seconds?: number | null;
}

// ============================================================================
// Abuse Reporting
// ============================================================================

/**
 * Abuse report questionnaire
 */
export interface ReportAbuseQuestionnaire {
  /** Is there an immediate threat? */
  immediate_threat?: boolean;
  /** Does this involve criminal activity? */
  involves_criminal_activity?: boolean;
  /** Does this require follow-up? */
  requires_follow_up?: boolean;
  /** Additional details (max 4000 chars) */
  additional_details?: string | null;
}

/**
 * Request to report abuse
 * POST /api/sessions/{token}/report-abuse
 */
export interface ReportAbuseRequest {
  /** Participant ID of the reporter */
  participant_id?: string | null;
  /** Email address of the reporter */
  reporter_email: string;
  /** Summary of the abuse (10-2000 chars) */
  summary: string;
  /** Questionnaire responses */
  questionnaire: ReportAbuseQuestionnaire;
}

/**
 * Response when abuse is reported
 */
export interface ReportAbuseResponse {
  /** ID of the created report */
  report_id: number;
  /** Status of the report */
  status: string;
  /** Status of the session after reporting */
  session_status: string;
}

// ============================================================================
// Error Responses
// ============================================================================

/**
 * Standard API error response
 */
export interface APIError {
  /** Error message */
  detail?: string;
  /** HTTP status code */
  status?: number;
  /** Error code (optional) */
  code?: string;
}

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * WebSocket connection parameters
 * WS /ws/sessions/{token}?participantId={id}
 */
export interface WebSocketParams {
  /** Session token */
  token: string;
  /** Participant ID */
  participantId: string;
}
