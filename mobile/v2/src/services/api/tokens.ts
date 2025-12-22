/**
 * Token API Service
 *
 * API methods for token management (minting tokens).
 */

import { apiClient } from './client';
import type { CreateTokenRequest, TokenResponse } from './types';

/**
 * Mint a new token
 *
 * POST /api/tokens
 *
 * Creates a new chat token with specified validity and session parameters.
 *
 * @param request - Token creation parameters
 * @returns Token response with token string and metadata
 * @throws {APIError} - Rate limit (429), validation errors, or network errors
 *
 * @example
 * ```typescript
 * const token = await mintToken({
 *   validity_period: '1_day',
 *   session_ttl_minutes: 60,
 *   message_char_limit: 2000,
 * });
 * console.log('Token:', token.token);
 * ```
 */
export async function mintToken(request: CreateTokenRequest): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>('/api/tokens', request);
  return response.data;
}

/**
 * Helper to create default token parameters
 *
 * Returns sensible defaults for token creation:
 * - 1 day validity
 * - 60 minute session
 * - 2000 character limit
 */
export function getDefaultTokenParams(): CreateTokenRequest {
  return {
    validity_period: '1_day',
    session_ttl_minutes: 60,
    message_char_limit: 2000,
  };
}

/**
 * Validate token creation parameters
 *
 * @param request - Parameters to validate
 * @returns Error message if invalid, null if valid
 */
export function validateTokenParams(request: CreateTokenRequest): string | null {
  // Validate session TTL
  if (request.session_ttl_minutes < 1 || request.session_ttl_minutes > 1440) {
    return 'Session duration must be between 1 and 1440 minutes (24 hours)';
  }

  // Validate message char limit if provided
  if (
    request.message_char_limit !== undefined &&
    (request.message_char_limit < 200 || request.message_char_limit > 16000)
  ) {
    return 'Message character limit must be between 200 and 16,000';
  }

  return null;
}
