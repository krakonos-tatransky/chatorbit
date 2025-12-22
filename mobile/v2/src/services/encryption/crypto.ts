/**
 * Crypto Utilities
 *
 * Low-level cryptographic functions for key derivation and encryption/decryption.
 * Uses Web Crypto API (available in React Native via polyfills).
 */

import * as Crypto from 'expo-crypto';
import { EncryptionError, EncryptionErrorCode } from './types';

/**
 * Text encoder for UTF-8 conversion
 */
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Get the Web Crypto API subtle crypto interface
 */
function getSubtleCrypto(): SubtleCrypto {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle;
  }
  throw new EncryptionError(
    EncryptionErrorCode.CRYPTO_UNAVAILABLE,
    'Web Crypto API is not available in this environment'
  );
}

/**
 * Get random bytes
 */
function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  throw new EncryptionError(
    EncryptionErrorCode.CRYPTO_UNAVAILABLE,
    'Random number generation is not available'
  );
}

/**
 * Convert string to Uint8Array (UTF-8 encoding)
 */
export function encodeUtf8(text: string): Uint8Array {
  return textEncoder.encode(text);
}

/**
 * Convert Uint8Array to string (UTF-8 decoding)
 */
export function decodeUtf8(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}

/**
 * Convert Uint8Array to base64 string
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive an AES-GCM encryption key from a token string
 *
 * Uses SHA-256 to hash the token, then imports it as an AES-GCM key.
 * This is deterministic: same token always produces same key.
 *
 * @param token - Session token (6-character string)
 * @returns CryptoKey for AES-GCM encryption/decryption
 * @throws {EncryptionError} - If key derivation fails
 *
 * @example
 * ```typescript
 * const key = await deriveKey('ABC123');
 * ```
 */
export async function deriveKey(token: string): Promise<CryptoKey> {
  try {
    const subtle = getSubtleCrypto();

    // Hash the token using SHA-256
    const tokenBytes = encodeUtf8(token);
    const hashBuffer = await subtle.digest('SHA-256', tokenBytes as BufferSource);

    // Import the hash as an AES-GCM key
    const key = await subtle.importKey(
      'raw',
      hashBuffer,
      { name: 'AES-GCM' },
      false, // not extractable
      ['encrypt', 'decrypt']
    );

    return key;
  } catch (error) {
    throw new EncryptionError(
      EncryptionErrorCode.KEY_DERIVATION_FAILED,
      'Failed to derive encryption key from token',
      error as Error
    );
  }
}

/**
 * Encrypt plaintext using AES-GCM
 *
 * Format: IV (12 bytes) + Ciphertext, returned as base64
 *
 * @param key - AES-GCM CryptoKey from deriveKey()
 * @param plaintext - Text to encrypt
 * @returns Base64-encoded encrypted payload (IV + ciphertext)
 * @throws {EncryptionError} - If encryption fails
 *
 * @example
 * ```typescript
 * const key = await deriveKey('ABC123');
 * const encrypted = await encrypt(key, 'Hello World');
 * ```
 */
export async function encrypt(key: CryptoKey, plaintext: string): Promise<string> {
  try {
    const subtle = getSubtleCrypto();

    // Generate random 12-byte IV
    const iv = getRandomBytes(12);

    // Encode plaintext to bytes
    const plaintextBytes = encodeUtf8(plaintext);

    // Encrypt using AES-GCM
    const ciphertext = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      plaintextBytes as BufferSource
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Return as base64
    return toBase64(combined);
  } catch (error) {
    throw new EncryptionError(
      EncryptionErrorCode.ENCRYPTION_FAILED,
      'Failed to encrypt message',
      error as Error
    );
  }
}

/**
 * Decrypt ciphertext using AES-GCM
 *
 * @param key - AES-GCM CryptoKey from deriveKey()
 * @param payload - Base64-encoded encrypted payload (IV + ciphertext)
 * @returns Decrypted plaintext
 * @throws {EncryptionError} - If decryption fails or payload is invalid
 *
 * @example
 * ```typescript
 * const key = await deriveKey('ABC123');
 * const decrypted = await decrypt(key, encryptedPayload);
 * ```
 */
export async function decrypt(key: CryptoKey, payload: string): Promise<string> {
  try {
    const subtle = getSubtleCrypto();

    // Decode from base64
    const bytes = fromBase64(payload);

    // Validate payload length (must have at least IV + some ciphertext)
    if (bytes.length < 13) {
      throw new EncryptionError(
        EncryptionErrorCode.INVALID_PAYLOAD,
        'Encrypted payload is too short (minimum 13 bytes)'
      );
    }

    // Extract IV (first 12 bytes) and ciphertext (remainder)
    const iv = bytes.slice(0, 12);
    const ciphertext = bytes.slice(12);

    // Decrypt using AES-GCM
    const plaintextBuffer = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      ciphertext as BufferSource
    );

    // Decode bytes to string
    return decodeUtf8(new Uint8Array(plaintextBuffer));
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
 * Generate a unique message ID
 *
 * Uses crypto.randomUUID() if available, otherwise falls back to timestamp + random.
 *
 * @returns Unique message identifier
 *
 * @example
 * ```typescript
 * const messageId = generateMessageId(); // "a1b2c3d4e5f6..."
 * ```
 */
export function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  // Fallback: timestamp + random
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`;
}
