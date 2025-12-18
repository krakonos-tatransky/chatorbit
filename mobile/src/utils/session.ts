import { API_BASE_URL, MOBILE_CLIENT_IDENTITY } from '../session/config';
import { JoinResponse, SessionStatus } from '../types';

const extractFriendlyError = (rawBody: string): string | null => {
  try {
    const parsed = JSON.parse(rawBody);
    if (typeof parsed === 'object' && parsed !== null) {
      if (typeof (parsed as any).detail === 'string') {
        return (parsed as any).detail;
      }
      if (Array.isArray((parsed as any).detail)) {
        const combined = (parsed as any).detail
          .map((item: any) => item?.msg)
          .filter(Boolean)
          .join('\n');
        if (combined) {
          return combined;
        }
      }
    }
  } catch {
    // ignore
  }
  return rawBody;
};

export const joinSession = async (
  tokenValue: string,
  existingParticipantId?: string | null
): Promise<JoinResponse> => {
  const trimmedToken = tokenValue.trim();
  const response = await fetch(`${API_BASE_URL}/sessions/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: trimmedToken,
      participant_id: existingParticipantId ?? undefined,
      client_identity: MOBILE_CLIENT_IDENTITY
    })
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(extractFriendlyError(rawBody) || 'Unable to join the session.');
  }

  try {
    const payload = JSON.parse(rawBody) as JoinResponse;
    if (!payload?.participant_id || !payload?.token) {
      throw new Error('Missing participant details in the join response.');
    }
    return payload;
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Missing participant details in the join response.') {
      throw error;
    }
    throw new Error('Received an unexpected response from the session join API.');
  }
};

export const fetchSessionStatus = async (
  tokenValue: string,
  signal?: AbortSignal
): Promise<SessionStatus> => {
  const response = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(tokenValue)}/status`, {
    method: 'GET',
    signal
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(extractFriendlyError(rawBody) || 'Unable to fetch session status.');
  }

  try {
    const payload = JSON.parse(rawBody) as SessionStatus;
    if (!payload?.token) {
      throw new Error('Missing session details in the status response.');
    }
    return payload;
  } catch (error: any) {
    if (error instanceof Error && error.message === 'Missing session details in the status response.') {
      throw error;
    }
    throw new Error('Received an unexpected response from the session status API.');
  }
};
