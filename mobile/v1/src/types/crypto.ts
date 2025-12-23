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

export type CryptoLike = {
  subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  randomUUID?: () => string;
};
