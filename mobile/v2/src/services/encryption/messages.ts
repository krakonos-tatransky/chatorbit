/**
 * Message Encryption Service
 *
 * High-level message encryption/decryption functions.
 * Handles message formatting, key caching, and error handling.
 */

import { deriveKey, encrypt, decrypt, generateMessageId } from './crypto';
import type { EncryptedMessage, DecryptedMessage } from './types';
import { EncryptionError, EncryptionErrorCode } from './types';

/**
 * Key cache to avoid re-deriving keys for the same token
 * Map<token, CryptoKey>
 */
const keyCache = new Map<string, CryptoKey>();

/**
 * Get or derive encryption key for a token
 *
 * Uses cache to avoid repeated key derivation.
 *
 * @param token - Session token
 * @returns CryptoKey for encryption/decryption
 */
async function getOrDeriveKey(token: string): Promise<CryptoKey> {
  // Check cache first
  if (keyCache.has(token)) {
    return keyCache.get(token)!;
  }

  // Derive new key
  const key = await deriveKey(token);

  // Cache it
  keyCache.set(token, key);

  return key;
}

/**
 * Clear the key cache
 *
 * Call this when leaving a session to free memory.
 */
export function clearKeyCache(): void {
  keyCache.clear();
}

/**
 * Clear a specific key from cache
 *
 * @param token - Token to remove from cache
 */
export function clearKey(token: string): void {
  keyCache.delete(token);
}

/**
 * Encrypt a message for sending
 *
 * Generates a unique message ID and encrypts the content using the session token.
 *
 * @param token - Session token
 * @param content - Plain text message content
 * @returns Encrypted message with ID, payload, and timestamp
 * @throws {EncryptionError} - If encryption fails
 *
 * @example
 * ```typescript
 * const encrypted = await encryptMessage('ABC123', 'Hello World');
 * // Send encrypted.payload and encrypted.messageId via WebRTC data channel
 * ```
 */
export async function encryptMessage(
  token: string,
  content: string
): Promise<EncryptedMessage> {
  try {
    // Get or derive key
    const key = await getOrDeriveKey(token);

    // Generate message ID
    const messageId = generateMessageId();

    // Encrypt content
    const payload = await encrypt(key, content);

    return {
      payload,
      messageId,
      timestamp: Date.now(),
    };
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(
      EncryptionErrorCode.ENCRYPTION_FAILED,
      'Failed to encrypt message',
      error as Error
    );
  }
}

/**
 * Decrypt a received message
 *
 * @param token - Session token
 * @param payload - Base64-encoded encrypted payload
 * @param messageId - Message ID (from sender)
 * @param timestamp - Original timestamp (from sender)
 * @returns Decrypted message
 * @throws {EncryptionError} - If decryption fails
 *
 * @example
 * ```typescript
 * const decrypted = await decryptMessage(
 *   'ABC123',
 *   receivedPayload,
 *   receivedMessageId,
 *   receivedTimestamp
 * );
 * console.log('Message:', decrypted.content);
 * ```
 */
export async function decryptMessage(
  token: string,
  payload: string,
  messageId: string,
  timestamp: number
): Promise<DecryptedMessage> {
  try {
    // Get or derive key
    const key = await getOrDeriveKey(token);

    // Decrypt payload
    const content = await decrypt(key, payload);

    return {
      content,
      messageId,
      timestamp,
    };
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(
      EncryptionErrorCode.DECRYPTION_FAILED,
      'Failed to decrypt message',
      error as Error
    );
  }
}

/**
 * Validate message content before encryption
 *
 * @param content - Message content
 * @param maxLength - Maximum allowed length
 * @returns Error message if invalid, null if valid
 */
export function validateMessageContent(
  content: string,
  maxLength: number
): string | null {
  if (!content || content.trim().length === 0) {
    return 'Message cannot be empty';
  }

  if (content.length > maxLength) {
    return `Message exceeds maximum length of ${maxLength} characters`;
  }

  return null;
}

/**
 * Pre-derive key for a session
 *
 * Useful for warming up the key cache before sending messages.
 *
 * @param token - Session token
 */
export async function preDeriveKey(token: string): Promise<void> {
  await getOrDeriveKey(token);
}
