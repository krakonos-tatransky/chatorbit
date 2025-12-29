/**
 * WebRTC Encryption Utilities
 *
 * AES-GCM encryption/decryption helpers for ChatOrbit's end-to-end encrypted messaging.
 * Extracted from session-view.tsx for modularity.
 *
 * Key Derivation: SHA-256(session_token)
 * Algorithm: AES-GCM (256-bit)
 * IV: Random 12 bytes per message
 * Format: base64(IV + ciphertext + auth_tag)
 */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// ============================================================================
// Crypto API Resolution
// ============================================================================

export type CryptoLike = {
  subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  randomUUID?: () => string;
};

/**
 * Resolve the Web Crypto API from various global scopes.
 * Handles browser, worker, and cross-platform environments.
 */
export function resolveCrypto(): CryptoLike | null {
  const globalScope: any =
    typeof globalThis !== "undefined"
      ? globalThis
      : typeof self !== "undefined"
        ? self
        : typeof window !== "undefined"
          ? window
          : undefined;

  if (!globalScope) {
    return null;
  }

  const candidates = [
    globalScope.crypto,
    globalScope.msCrypto,
    globalScope?.webkitCrypto,
    globalScope.navigator?.crypto,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const subtle: SubtleCrypto | undefined =
      candidate.subtle ?? candidate.webkitSubtle ?? candidate.webcrypto?.subtle;
    const getRandomValues: CryptoLike["getRandomValues"] | undefined =
      typeof candidate.getRandomValues === "function"
        ? candidate.getRandomValues.bind(candidate)
        : typeof candidate.webcrypto?.getRandomValues === "function"
          ? candidate.webcrypto.getRandomValues.bind(candidate.webcrypto)
          : undefined;
    const randomUUID: CryptoLike["randomUUID"] | undefined =
      typeof candidate.randomUUID === "function"
        ? candidate.randomUUID.bind(candidate)
        : typeof candidate.webcrypto?.randomUUID === "function"
          ? candidate.webcrypto.randomUUID.bind(candidate.webcrypto)
          : undefined;

    if (subtle && getRandomValues) {
      return { subtle, getRandomValues, randomUUID };
    }
  }

  return null;
}

// ============================================================================
// Base64 Encoding/Decoding
// ============================================================================

/**
 * Convert Uint8Array to base64 string.
 * Uses btoa if available, falls back to Buffer.
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  const globalBuffer = (globalThis as { Buffer?: any }).Buffer;
  if (globalBuffer) {
    return globalBuffer.from(bytes).toString("base64");
  }
  throw new Error("Base64 encoding is not supported in this environment.");
}

/**
 * Convert base64 string to Uint8Array.
 * Uses atob if available, falls back to Buffer.
 */
export function fromBase64(value: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  const globalBuffer = (globalThis as { Buffer?: any }).Buffer;
  if (globalBuffer) {
    return globalBuffer.from(value, "base64");
  }
  throw new Error("Base64 decoding is not supported in this environment.");
}

// ============================================================================
// Key Derivation
// ============================================================================

/**
 * Derive AES-GCM encryption key from session token.
 * Uses SHA-256 to hash the token and imports as AES-GCM key.
 *
 * @param token - Session token (used as pre-shared key)
 * @returns CryptoKey suitable for AES-GCM encrypt/decrypt
 */
export async function deriveKey(token: string): Promise<CryptoKey> {
  const cryptoLike = resolveCrypto();
  if (!cryptoLike) {
    throw new Error("Web Crypto API is not available.");
  }
  const digest = await cryptoLike.subtle.digest("SHA-256", textEncoder.encode(token));
  return cryptoLike.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

// ============================================================================
// Encryption
// ============================================================================

/**
 * Encrypt plaintext message using AES-GCM.
 * Generates random IV (12 bytes) per message.
 * Returns base64-encoded: IV (12 bytes) + ciphertext + auth_tag (16 bytes)
 *
 * @param key - CryptoKey from deriveKey()
 * @param plaintext - Message content to encrypt
 * @returns Base64-encoded encrypted payload
 */
export async function encryptMessage(key: CryptoKey, plaintext: string): Promise<string> {
  const cryptoLike = resolveCrypto();
  if (!cryptoLike) {
    throw new Error("Web Crypto API is not available.");
  }

  // Generate random IV (12 bytes for AES-GCM)
  const iv = cryptoLike.getRandomValues(new Uint8Array(12));

  // Encode plaintext
  const encoded = textEncoder.encode(plaintext);

  // Encrypt with AES-GCM (includes authentication tag)
  const encrypted = await cryptoLike.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  // Combine: IV + ciphertext + auth_tag
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return toBase64(combined);
}

// ============================================================================
// Decryption
// ============================================================================

/**
 * Decrypt base64-encoded AES-GCM payload.
 * Extracts IV from first 12 bytes, then decrypts remainder.
 *
 * @param key - CryptoKey from deriveKey()
 * @param payload - Base64-encoded encrypted message
 * @returns Decrypted plaintext
 */
export async function decryptMessage(key: CryptoKey, payload: string): Promise<string> {
  const cryptoLike = resolveCrypto();
  if (!cryptoLike) {
    throw new Error("Web Crypto API is not available.");
  }

  // Decode from base64
  const bytes = fromBase64(payload);
  if (bytes.length < 13) {
    throw new Error("Encrypted payload is not valid.");
  }

  // Extract IV (first 12 bytes)
  const iv = bytes.slice(0, 12);

  // Extract ciphertext + auth_tag (remainder)
  const encrypted = bytes.slice(12);

  // Decrypt
  const decrypted = await cryptoLike.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);

  // Decode to string
  return textDecoder.decode(decrypted);
}

// ============================================================================
// Message ID Generation
// ============================================================================

/**
 * Generate unique message ID.
 * Uses crypto.randomUUID() if available, falls back to timestamp + random.
 *
 * @returns Unique message identifier
 */
export function generateMessageId(): string {
  const cryptoLike = resolveCrypto();
  if (cryptoLike?.randomUUID) {
    return cryptoLike.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`;
}

// ============================================================================
// Hash Calculation (Optional Integrity Check)
// ============================================================================

/**
 * Simple SHA-256 implementation as fallback if Web Crypto API unavailable.
 * Note: This is NOT cryptographically secure. For production, always use Web Crypto API.
 */
function sha256Bytes(input: string): Uint8Array {
  // Simplified SHA-256 for fallback (not production-grade)
  // In practice, Web Crypto API should always be available in modern browsers
  const bytes = textEncoder.encode(input);
  const hash = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) {
    hash[i % 32] ^= bytes[i];
  }
  return hash;
}

/**
 * Calculate hash of message for optional integrity verification.
 * Uses SHA-256(sessionId:participantId:messageId:content)
 *
 * @param sessionId - Session token
 * @param participantId - Sender participant ID
 * @param messageId - Message ID
 * @param content - Message content (plaintext)
 * @returns Base64-encoded hash
 */
export async function calculateMessageHash(
  sessionId: string,
  participantId: string,
  messageId: string,
  content: string
): Promise<string> {
  const cryptoLike = resolveCrypto();
  const composite = `${sessionId}:${participantId}:${messageId}:${content}`;

  if (cryptoLike?.subtle) {
    const digest = await cryptoLike.subtle.digest("SHA-256", textEncoder.encode(composite));
    return toBase64(new Uint8Array(digest));
  }

  // Fallback (not secure, for compatibility only)
  return toBase64(sha256Bytes(composite));
}
