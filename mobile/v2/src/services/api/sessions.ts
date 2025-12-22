/**
 * Session API Service
 *
 * API methods for session management (join, status, delete, report abuse).
 */

import { apiClient } from './client';
import type {
  JoinSessionRequest,
  JoinSessionResponse,
  SessionStatusResponse,
  ReportAbuseRequest,
  ReportAbuseResponse,
} from './types';

/**
 * Join a session with a token
 *
 * POST /api/sessions/join
 *
 * Joins a session using a token. Returns participant ID and role (host or guest).
 * First participant becomes the host, second becomes the guest.
 *
 * @param request - Join session parameters
 * @returns Session join response with participant details
 * @throws {APIError} - Token not found (404), session full (409), token expired (410)
 *
 * @example
 * ```typescript
 * const session = await joinSession({ token: 'ABC123' });
 * console.log('Role:', session.role); // 'host' or 'guest'
 * console.log('Participant ID:', session.participant_id);
 * ```
 */
export async function joinSession(request: JoinSessionRequest): Promise<JoinSessionResponse> {
  const response = await apiClient.post<JoinSessionResponse>('/api/sessions/join', request);
  return response.data;
}

/**
 * Get session status
 *
 * GET /api/sessions/{token}/status
 *
 * Retrieves the current status of a session, including participants and timing.
 *
 * @param token - Session token
 * @returns Session status information
 * @throws {APIError} - Token not found (404) or network errors
 *
 * @example
 * ```typescript
 * const status = await getSessionStatus('ABC123');
 * console.log('Status:', status.status); // 'issued', 'active', etc.
 * console.log('Participants:', status.participants.length);
 * ```
 */
export async function getSessionStatus(token: string): Promise<SessionStatusResponse> {
  const response = await apiClient.get<SessionStatusResponse>(`/api/sessions/${token}/status`);
  return response.data;
}

/**
 * Delete/end a session
 *
 * DELETE /api/sessions/{token}
 *
 * Ends the session immediately. All participants will be disconnected.
 *
 * @param token - Session token
 * @returns Final session status
 * @throws {APIError} - Token not found (404) or network errors
 *
 * @example
 * ```typescript
 * await deleteSession('ABC123');
 * ```
 */
export async function deleteSession(token: string): Promise<SessionStatusResponse> {
  const response = await apiClient.delete<SessionStatusResponse>(`/api/sessions/${token}`);
  return response.data;
}

/**
 * Report abuse in a session
 *
 * POST /api/sessions/{token}/report-abuse
 *
 * Submits an abuse report for the session. This may result in session termination.
 *
 * @param token - Session token
 * @param request - Abuse report details
 * @returns Abuse report response
 * @throws {APIError} - Validation errors or network errors
 *
 * @example
 * ```typescript
 * const report = await reportAbuse('ABC123', {
 *   reporter_email: 'user@example.com',
 *   summary: 'Description of the abuse',
 *   questionnaire: {
 *     immediate_threat: false,
 *     involves_criminal_activity: false,
 *     requires_follow_up: true,
 *   },
 * });
 * ```
 */
export async function reportAbuse(
  token: string,
  request: ReportAbuseRequest
): Promise<ReportAbuseResponse> {
  const response = await apiClient.post<ReportAbuseResponse>(
    `/api/sessions/${token}/report-abuse`,
    request
  );
  return response.data;
}

/**
 * Helper to check if session is active
 */
export function isSessionActive(status: SessionStatusResponse): boolean {
  return status.status === 'active';
}

/**
 * Helper to check if session is joinable
 */
export function isSessionJoinable(status: SessionStatusResponse): boolean {
  return status.status === 'issued' && status.participants.length < 2;
}

/**
 * Helper to check if session has ended
 */
export function isSessionEnded(status: SessionStatusResponse): boolean {
  return ['closed', 'expired', 'deleted'].includes(status.status);
}

/**
 * Helper to get remaining time in seconds
 */
export function getRemainingSeconds(status: SessionStatusResponse): number | null {
  return status.remaining_seconds ?? null;
}

/**
 * Helper to format remaining time as MM:SS
 */
export function formatRemainingTime(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '--:--';

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
