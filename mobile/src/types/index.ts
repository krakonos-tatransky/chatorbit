export type DurationOption = {
  label: string;
  value: string;
};

export type TokenTierOption = {
  label: string;
  value: string;
};

export type TokenResponse = {
  token: string;
  validity_expires_at: string;
  session_ttl_seconds: number;
  message_char_limit: number;
  created_at: string;
};

export type JoinResponse = {
  token: string;
  participant_id: string;
  role: string;
  session_active: boolean;
  session_started_at: string | null;
  session_expires_at: string | null;
  message_char_limit: number;
};

export type ValidityOption = {
  label: string;
  value: '1_day' | '1_week' | '1_month' | '1_year';
};

export type SessionParticipant = {
  participant_id: string;
  role: string;
  joined_at: string;
};

export type SessionStatus = {
  token: string;
  status: string;
  validity_expires_at: string;
  session_started_at: string | null;
  session_expires_at: string | null;
  message_char_limit: number;
  participants: SessionParticipant[];
  remaining_seconds: number | null;
  connected_participants?: string[];
};

export type SessionStatusSocketPayload = SessionStatus & { type: string };

export type Message = {
  messageId: string;
  participantId: string;
  role: string;
  content: string;
  createdAt: string;
};

export type DataChannelState = 'connecting' | 'open' | 'closing' | 'closed';

export type EncryptionMode = 'aes-gcm' | 'none';

export type EncryptedMessage = {
  sessionId: string;
  messageId: string;
  participantId: string;
  role: string;
  createdAt: string;
  encryption: EncryptionMode;
  hash?: string;
  content?: string;
  encryptedContent?: string;
  deleted?: boolean;
};
