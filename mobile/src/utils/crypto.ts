import { CryptoLike } from '../types';

const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

export function resolveCrypto(): CryptoLike | null {
  const globalScope: any =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof self !== 'undefined'
        ? self
        : typeof window !== 'undefined'
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
    const subtle: SubtleCrypto | undefined = candidate.subtle ?? candidate.webkitSubtle ?? candidate.webcrypto?.subtle;
    const getRandomValues: CryptoLike['getRandomValues'] | undefined =
      typeof candidate.getRandomValues === 'function'
        ? candidate.getRandomValues.bind(candidate)
        : typeof candidate.webcrypto?.getRandomValues === 'function'
          ? candidate.webcrypto.getRandomValues.bind(candidate.webcrypto)
          : undefined;
    const randomUUID: CryptoLike['randomUUID'] | undefined =
      typeof candidate.randomUUID === 'function'
        ? candidate.randomUUID.bind(candidate)
        : typeof candidate.webcrypto?.randomUUID === 'function'
          ? candidate.webcrypto.randomUUID.bind(candidate.webcrypto)
          : undefined;

    if (subtle && getRandomValues) {
      return { subtle, getRandomValues, randomUUID };
    }
  }

  return null;
}

export const cryptoLike = resolveCrypto();

export function encodeUtf8(value: string): Uint8Array {
  if (textEncoder) {
    return textEncoder.encode(value);
  }
  const encoded = unescape(encodeURIComponent(value));
  const bytes = new Uint8Array(encoded.length);
  for (let index = 0; index < encoded.length; index += 1) {
    bytes[index] = encoded.charCodeAt(index);
  }
  return bytes;
}

export function decodeUtf8(bytes: Uint8Array): string {
  if (textDecoder) {
    return textDecoder.decode(bytes);
  }
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return decodeURIComponent(escape(binary));
}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  const globalBuffer = (globalThis as { Buffer?: any }).Buffer;
  if (globalBuffer) {
    return globalBuffer.from(bytes).toString('base64');
  }
  throw new Error('Base64 encoding is not supported in this environment.');
}

export function fromBase64(value: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  const globalBuffer = (globalThis as { Buffer?: any }).Buffer;
  if (globalBuffer) {
    return globalBuffer.from(value, 'base64');
  }
  throw new Error('Base64 decoding is not supported in this environment.');
}

function rotateRight(value: number, amount: number): number {
  return ((value >>> amount) | (value << (32 - amount))) >>> 0;
}

export function sha256Bytes(input: string): Uint8Array {
  const message = encodeUtf8(input);
  const messageLength = message.length;
  const paddedLength = (messageLength + 9 + 63) & ~63;
  const buffer = new ArrayBuffer(paddedLength);
  const bytes = new Uint8Array(buffer);
  bytes.set(message);
  bytes[messageLength] = 0x80;
  const view = new DataView(buffer);
  const bitLength = messageLength * 8;
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  view.setUint32(paddedLength - 8, highBits, false);
  view.setUint32(paddedLength - 4, lowBits, false);

  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4, false);
    }
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }

    let a = hash[0]; let b = hash[1]; let c = hash[2]; let d = hash[3];
    let e = hash[4]; let f = hash[5]; let g = hash[6]; let h = hash[7];

    for (let index = 0; index < 64; index += 1) {
      const S1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[index] + words[index]) >>> 0;
      const S0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e;
      e = (d + temp1) >>> 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) >>> 0;
    }

    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const outputView = new DataView(result.buffer);
  for (let index = 0; index < 8; index += 1) {
    outputView.setUint32(index * 4, hash[index], false);
  }
  return result;
}

export function generateMessageId(): string {
  if (cryptoLike?.randomUUID) {
    return cryptoLike.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`;
}

export async function deriveKey(token: string): Promise<CryptoKey> {
  if (!cryptoLike?.subtle) {
    throw new Error('Web Crypto API is not available.');
  }
  const digest = await cryptoLike.subtle.digest('SHA-256', toArrayBuffer(encodeUtf8(token)));
  return cryptoLike.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptText(key: CryptoKey, plaintext: string): Promise<string> {
  if (!cryptoLike?.subtle || !cryptoLike?.getRandomValues) {
    throw new Error('Web Crypto API is not available.');
  }
  const iv = cryptoLike.getRandomValues(new Uint8Array(12));
  const encoded = encodeUtf8(plaintext);
  const encrypted = await cryptoLike.subtle.encrypt({ name: 'AES-GCM', iv }, key, toArrayBuffer(encoded));
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return toBase64(combined);
}

export async function decryptText(key: CryptoKey, payload: string): Promise<string> {
  if (!cryptoLike?.subtle) {
    throw new Error('Web Crypto API is not available.');
  }
  const bytes = fromBase64(payload);
  if (bytes.length < 13) {
    throw new Error('Encrypted payload is not valid.');
  }
  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  const decrypted = await cryptoLike.subtle.decrypt({ name: 'AES-GCM', iv }, key, toArrayBuffer(cipher));
  return decodeUtf8(new Uint8Array(decrypted));
}

export async function computeMessageHash(
  sessionId: string,
  participantId: string,
  messageId: string,
  content: string,
): Promise<string> {
  if (cryptoLike?.subtle) {
    const digest = await cryptoLike.subtle.digest(
      'SHA-256',
      toArrayBuffer(encodeUtf8(`${sessionId}:${participantId}:${messageId}:${content}`)),
    );
    return toBase64(new Uint8Array(digest));
  }
  return toBase64(sha256Bytes(`${sessionId}:${participantId}:${messageId}:${content}`));
}
