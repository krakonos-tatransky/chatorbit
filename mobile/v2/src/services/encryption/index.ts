/**
 * Encryption Services
 *
 * Barrel file for all encryption service exports.
 */

// Types
export type { EncryptedMessage, DecryptedMessage } from './types';
export { EncryptionError, EncryptionErrorCode } from './types';

// Crypto utilities (low-level, generally not used directly)
export {
  deriveKey,
  encrypt,
  decrypt,
  generateMessageId,
  encodeUtf8,
  decodeUtf8,
  toBase64,
  fromBase64,
} from './crypto';

// Message encryption (high-level, use these in app code)
export {
  encryptMessage,
  decryptMessage,
  clearKeyCache,
  clearKey,
  validateMessageContent,
  preDeriveKey,
} from './messages';
