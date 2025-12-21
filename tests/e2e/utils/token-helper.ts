export type ValidityPeriod = '1_day' | '1_week' | '1_month' | '1_year';

export interface TokenParams {
  validity_period?: ValidityPeriod;
  session_ttl_minutes?: number;
  message_char_limit?: number;
  client_identity?: string | null;
}

export interface TokenResponse {
  token: string;
  validity_expires_at: string;
  session_ttl_seconds: number;
  message_char_limit: number;
  created_at: string;
}

export interface SessionStatusResponse {
  token: string;
  status: string;
  validity_expires_at: string;
  session_started_at: string | null;
  session_expires_at: string | null;
  message_char_limit: number;
  participants: Array<{
    participant_id: string;
    role: string;
    joined_at: string;
  }>;
  remaining_seconds: number | null;
}

/**
 * Create a new session token via the API
 */
export async function createToken(
  apiBaseUrl: string,
  params: TokenParams = {}
): Promise<TokenResponse> {
  const url = `${apiBaseUrl}/api/tokens`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      validity_period: params.validity_period ?? '1_day',
      session_ttl_minutes: params.session_ttl_minutes ?? 30,
      message_char_limit: params.message_char_limit ?? 2000,
      client_identity: params.client_identity ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create token: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get session status
 */
export async function getSessionStatus(
  apiBaseUrl: string,
  token: string
): Promise<SessionStatusResponse> {
  const url = `${apiBaseUrl}/api/sessions/${token}/status`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to get session status: ${response.statusText}`);
  }

  return await response.json();
}
