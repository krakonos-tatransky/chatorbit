/**
 * Encryption Types
 *
 * Types for encrypted messages and encryption errors.
 */

/**
 * Encrypted message format
 *
 * Format: IV (12 bytes) + Ciphertext, encoded as base64
 */
export interface EncryptedMessage {
  /** Base64-encoded encrypted payload (IV + ciphertext) */
  payload: string;
  /** Message ID for tracking */
  messageId: string;
  /** Timestamp when encrypted */
  timestamp: number;
}

/**
 * Decrypted message
 */
export interface DecryptedMessage {
  /** Plain text content */
  content: string;
  /** Message ID */
  messageId: string;
  /** Original timestamp */
  timestamp: number;
}

/**
 * Encryption error types
 */
export enum EncryptionErrorCode {
  /** Crypto API not available */
  CRYPTO_UNAVAILABLE = 'CRYPTO_UNAVAILABLE',
  /** Key derivation failed */
  KEY_DERIVATION_FAILED = 'KEY_DERIVATION_FAILED',
  /** Encryption failed */
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  /** Decryption failed */
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  /** Invalid payload format */
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  /** Invalid key */
  INVALID_KEY = 'INVALID_KEY',
}

/**
 * Encryption error
 */
export class EncryptionError extends Error {
  constructor(
    public code: EncryptionErrorCode,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'EncryptionError';
  }
}
