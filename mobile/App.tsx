import React, { ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  LogBox,
  Modal,
  NativeModules,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFonts } from 'expo-font';
import type {
  RTCPeerConnection as NativeRTCPeerConnection,
  RTCIceCandidate as NativeRTCIceCandidate,
  RTCSessionDescription as NativeRTCSessionDescription,
  MediaStream as NativeMediaStream,
  RTCTrackEvent as NativeRTCTrackEvent
} from 'react-native-webrtc';
type RTCPeerConnection = NativeRTCPeerConnection;
type RTCIceCandidate = NativeRTCIceCandidate;
type RTCSessionDescription = NativeRTCSessionDescription;
type MediaStream = NativeMediaStream;
type RTCTrackEvent = NativeRTCTrackEvent;
type RTCViewComponent = ComponentType<{ streamURL: string; objectFit?: string; mirror?: boolean }>;
import { getIceServers, hasRelayIceServers } from './webrtc';

const env = typeof process !== 'undefined' && process.env ? process.env : undefined;

const IGNORED_NATIVE_WARNINGS = [
  'hapticpatternlibrary.plist',
  'Error creating CHHapticPattern',
  'RemoteTextInput',
  'perform input operation requires a valid sessionID'
];

const filterConsole = (original: (...args: any[]) => void) =>
  (...args: any[]) => {
    const shouldIgnore = args.some((arg) => {
      if (typeof arg !== 'string') {
        return false;
      }
      return IGNORED_NATIVE_WARNINGS.some((pattern) => arg.includes(pattern));
    });
    if (shouldIgnore) {
      return;
    }
    original(...args);
  };

// Filter noisy simulator-only warnings before React components mount.
// eslint-disable-next-line no-console
console.warn = filterConsole(console.warn.bind(console));
// eslint-disable-next-line no-console
console.error = filterConsole(console.error.bind(console));

LogBox.ignoreLogs([
  // iOS simulators do not ship the haptic pattern library, which triggers noisy warnings
  // when the keyboard feedback generator initializes. This does not affect functionality.
  'hapticpatternlibrary.plist',
  'Error creating CHHapticPattern',
  // Simulators also emit RemoteTextInput warnings when focusing fields without a session id.
  'RemoteTextInput',
  'perform input operation requires a valid sessionID',
  // Keyboards may warn about missing haptic assets while generating feedback.
  'UIKBFeedbackGenerator'
]);
const EXPO_DEV_BUILD_DOCS_URL = 'https://docs.expo.dev/development/introduction/';

type WebRtcBindings = {
  RTCPeerConnection: new (...args: any[]) => NativeRTCPeerConnection;
  RTCIceCandidate: new (...args: any[]) => NativeRTCIceCandidate;
  RTCSessionDescription: new (...args: any[]) => NativeRTCSessionDescription;
  RTCView?: RTCViewComponent;
  mediaDevices?: {
    getUserMedia: (constraints: Record<string, unknown>) => Promise<MediaStream>;
  };
};

const WEBRTC_NATIVE_MODULE_CANDIDATES = ['WebRTCModule', 'WebRTC'];
let cachedWebRtcBindings: WebRtcBindings | null | undefined;

const getWebRtcBindings = (): WebRtcBindings | null => {
  if (cachedWebRtcBindings !== undefined) {
    return cachedWebRtcBindings;
  }

  try {
    const bindings = require('react-native-webrtc') as WebRtcBindings;
    if (
      bindings?.RTCPeerConnection &&
      bindings?.RTCIceCandidate &&
      bindings?.RTCSessionDescription
    ) {
      cachedWebRtcBindings = bindings;
      return cachedWebRtcBindings;
    }
  } catch (error) {
    console.warn(
      'Unable to load react-native-webrtc. Build a development client to enable native session connectivity.',
      error
    );
    cachedWebRtcBindings = null;
    return null;
  }

  const nativeModules = NativeModules as Record<string, unknown> | null;
  const hasNativeModule = WEBRTC_NATIVE_MODULE_CANDIDATES.some((name) => Boolean(nativeModules?.[name]));

  if (!hasNativeModule) {
    console.warn(
      'react-native-webrtc native module not detected. Install the Expo dev build to enable in-app sessions.',
      nativeModules
    );
  }

  cachedWebRtcBindings = null;
  return null;
};

const isWebRtcSupported = (): boolean => getWebRtcBindings() !== null;

const readEnvValue = (...keys: string[]): string | undefined => {
  if (!env) {
    return undefined;
  }
  for (const key of keys) {
    const value = env[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const API_BASE_URL = stripTrailingSlash(
  readEnvValue('EXPO_PUBLIC_API_BASE_URL', 'NEXT_PUBLIC_API_BASE_URL', 'API_BASE_URL') ||
    'https://endpoints.chatorbit.com/api'
);
const WS_BASE_URL = stripTrailingSlash(
  readEnvValue('EXPO_PUBLIC_WS_BASE_URL', 'NEXT_PUBLIC_WS_BASE_URL', 'WS_BASE_URL') ||
    'wss://endpoints.chatorbit.com'
);
const COLORS = {
  midnight: '#020B1F',
  abyss: '#041335',
  deepBlue: '#06255E',
  ocean: '#0A4A89',
  lagoon: '#0F6FBA',
  aurora: '#6FE7FF',
  ice: '#F4F9FF',
  mint: '#88E6FF',
  white: '#FFFFFF',
  glowSoft: 'rgba(4, 23, 60, 0.96)',
  glowWarm: 'rgba(9, 54, 120, 0.88)',
  glowEdge: 'rgba(111, 214, 255, 0.55)',
  cobaltShadow: 'rgba(3, 20, 46, 0.6)',
  danger: '#EF476F'
};

const MOBILE_CLIENT_IDENTITY = 'mobile-app-host';

const TERMS_TEXT = `Welcome to ChatOrbit!\n\nBefore generating secure session tokens, please take a moment to review these highlights:\n\n• Tokens are valid only for the duration selected during creation.\n• Share your token only with trusted participants.\n• Generated sessions may be monitored for quality and abuse prevention.\n• Using the token implies that you agree to abide by ChatOrbit community guidelines.\n\nThis preview app is designed for rapid testing of the ChatOrbit realtime experience. By continuing you acknowledge that:\n\n1. You are authorised to request access tokens on behalf of your organisation or team.\n2. All interactions facilitated by the token must respect local regulations regarding recorded communication.\n3. ChatOrbit may contact you for product feedback using the email or account associated with your workspace.\n4. Abuse of the system, including sharing illicit content, will result in automatic suspension of the workspace.\n\nScroll to the bottom of this message to enable the Accept button. Thank you for helping us keep the orbit safe and collaborative!`;

type DurationOption = {
  label: string;
  value: string;
};

type TokenTierOption = {
  label: string;
  value: string;
};

type TokenResponse = {
  token: string;
  validity_expires_at: string;
  session_ttl_seconds: number;
  message_char_limit: number;
  created_at: string;
};

type JoinResponse = {
  token: string;
  participant_id: string;
  role: string;
  session_active: boolean;
  session_started_at: string | null;
  session_expires_at: string | null;
  message_char_limit: number;
};

type ValidityOption = {
  label: string;
  value: '1_day' | '1_week' | '1_month' | '1_year';
};

const durationOptions: DurationOption[] = [
  { label: '15 minutes', value: '15m' },
  { label: '30 minutes', value: '30m' },
  { label: '1 hour', value: '1h' },
  { label: '4 hours', value: '4h' }
];

const tokenTierOptions: TokenTierOption[] = [
  { label: 'Standard Session', value: 'standard' },
  { label: 'Premium Session', value: 'premium' }
];

const validityOptions: ValidityOption[] = [
  { label: 'Valid for 1 day', value: '1_day' },
  { label: 'Valid for 1 week', value: '1_week' },
  { label: 'Valid for 1 month', value: '1_month' },
  { label: 'Valid for 1 year', value: '1_year' }
];

const SESSION_TTL_MINUTES: Record<string, number> = {
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '4h': 240
};

const DEFAULT_MESSAGE_CHAR_LIMIT = 2000;

type SessionParticipant = {
  participant_id: string;
  role: string;
  joined_at: string;
};

type SessionStatus = {
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

type SessionStatusSocketPayload = SessionStatus & {
  type: string;
  connected_participants?: string[];
};

const SESSION_POLL_INTERVAL_MS = 12000;

type Message = {
  messageId: string;
  participantId: string;
  role: string;
  content: string;
  createdAt: string;
};

type DataChannelState = 'connecting' | 'open' | 'closing' | 'closed';

type PeerDataChannel = ReturnType<RTCPeerConnection['createDataChannel']> & {
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
};

type EncryptionMode = 'aes-gcm' | 'none';

type EncryptedMessage = {
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

type CryptoLike = {
  subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
  randomUUID?: () => string;
};

type TimeoutHandle = ReturnType<typeof setTimeout> | number;

const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

function resolveCrypto(): CryptoLike | null {
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
    globalScope.navigator?.crypto
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

const cryptoLike = resolveCrypto();

function encodeUtf8(value: string): Uint8Array {
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

function decodeUtf8(bytes: Uint8Array): string {
  if (textDecoder) {
    return textDecoder.decode(bytes);
  }
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return decodeURIComponent(escape(binary));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function toBase64(bytes: Uint8Array): string {
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

function fromBase64(value: string): Uint8Array {
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

function sha256Bytes(input: string): Uint8Array {
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
    0x6a09e667,
    0xbb67ae85,
    0x3c6ef372,
    0xa54ff53a,
    0x510e527f,
    0x9b05688c,
    0x1f83d9ab,
    0x5be0cd19
  ]);

  const k = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
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

    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];

    for (let index = 0; index < 64; index += 1) {
      const S1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[index] + words[index]) >>> 0;
      const S0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
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

function generateMessageId(): string {
  if (cryptoLike?.randomUUID) {
    return cryptoLike.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`;
}

async function deriveKey(token: string): Promise<CryptoKey> {
  if (!cryptoLike?.subtle) {
    throw new Error('Web Crypto API is not available.');
  }
  const digest = await cryptoLike.subtle.digest('SHA-256', toArrayBuffer(encodeUtf8(token)));
  return cryptoLike.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptText(key: CryptoKey, plaintext: string): Promise<string> {
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

async function decryptText(key: CryptoKey, payload: string): Promise<string> {
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

async function computeMessageHash(sessionId: string, participantId: string, messageId: string, content: string): Promise<string> {
  if (cryptoLike?.subtle) {
    const digest = await cryptoLike.subtle.digest(
      'SHA-256',
      toArrayBuffer(encodeUtf8(`${sessionId}:${participantId}:${messageId}:${content}`))
    );
    return toBase64(new Uint8Array(digest));
  }
  return toBase64(sha256Bytes(`${sessionId}:${participantId}:${messageId}:${content}`));
}

function upsertMessage(list: Message[], message: Message): Message[] {
  const next = list.filter((item) => item.messageId !== message.messageId);
  next.push(message);
  next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return next;
}

const extractFriendlyError = (rawBody: string): string => {
  if (!rawBody) {
    return 'Unexpected response from the server.';
  }

  try {
    const parsed = JSON.parse(rawBody);
    if (typeof parsed?.detail === 'string') {
      return parsed.detail;
    }
    if (Array.isArray(parsed?.detail)) {
      const combined = parsed.detail
        .map((item: any) => (typeof item?.msg === 'string' ? item.msg : null))
        .filter(Boolean)
        .join('\n');
      if (combined) {
        return combined;
      }
    }
  } catch {
    // Swallow JSON parsing issues and fall back to the raw payload below.
  }

  return rawBody;
};

const joinSession = async (
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

const fetchSessionStatus = async (
  tokenValue: string,
  signal?: AbortSignal
): Promise<SessionStatus> => {
  const response = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(tokenValue)}/status`, {
    method: 'GET',
    signal
  });

  const rawBody = await response.text();

  if (!response.ok) {
    throw new Error(extractFriendlyError(rawBody) || 'Unable to load the session status.');
  }

  try {
    return JSON.parse(rawBody) as SessionStatus;
  } catch (error) {
    console.error('Failed to parse session status payload', error);
    throw new Error('Received an invalid session status payload.');
  }
};

const formatRemainingTime = (seconds: number | null) => {
  if (seconds == null) {
    return 'Session will begin once a guest joins.';
  }
  if (seconds <= 0) {
    return 'Session timer elapsed.';
  }
  const rounded = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m remaining`;
  }
  return `${minutes}m ${secs.toString().padStart(2, '0')}s remaining`;
};

const formatJoinedAt = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'Joined time unavailable';
  }
  return `Joined ${date.toLocaleString()}`;
};

const mapStatusLabel = (status: string | undefined) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'issued':
      return 'Waiting';
    case 'closed':
      return 'Closed';
    case 'expired':
      return 'Expired';
    case 'deleted':
      return 'Deleted';
    default:
      return 'Unknown';
  }
};

const mapStatusDescription = (status: string | undefined) => {
  switch (status) {
    case 'active':
      return 'Both participants are connected to the live session.';
    case 'issued':
      return 'Share the token with your guest to begin the session.';
    case 'closed':
      return 'This session has been closed.';
    case 'expired':
      return 'This session expired before both participants connected.';
    case 'deleted':
      return 'This session is no longer available.';
    default:
      return 'Session status is being determined.';
  }
};

const statusVariant = (status: string | undefined) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'issued':
      return 'waiting';
    default:
      return 'inactive';
  }
};

  type AcceptScreenProps = { onAccept: () => void };
  const AcceptScreen: React.FC<AcceptScreenProps> = ({ onAccept }: AcceptScreenProps) => {
  const [acceptEnabled, setAcceptEnabled] = useState(false);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromBottom <= 24) {
      setAcceptEnabled(true);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean, COLORS.lagoon]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.termsCard}
      >
        <Text style={styles.logoText}>ChatOrbit Token Lab</Text>
        <ScrollView
          style={styles.termsScroll}
          contentContainerStyle={styles.termsContent}
          onScroll={handleScroll}
          scrollEventThrottle={24}
        >
          <Text style={styles.termsText}>{TERMS_TEXT}</Text>
        </ScrollView>
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.acceptButton, !acceptEnabled && styles.acceptButtonDisabled]}
          onPress={onAccept}
          disabled={!acceptEnabled}
        >
          <Text style={styles.acceptButtonLabel}>{acceptEnabled ? 'Accept & Continue' : 'Scroll to accept'}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </LinearGradient>
  );
};

  type BigActionButtonProps = {
    icon: React.ReactNode;
    title: string;
    description: string;
    onPress: () => void;
    background: string;
  };
  const BigActionButton: React.FC<BigActionButtonProps> = ({
    icon,
    title,
    description,
    onPress,
    background
  }: BigActionButtonProps) => {
  return (
    <TouchableOpacity style={[styles.bigActionButton, { backgroundColor: background }]} onPress={onPress}>
      <View style={styles.bigActionIcon}>{icon}</View>
      <View style={styles.bigActionTextContainer}>
        <Text style={styles.bigActionTitle}>{title}</Text>
        <Text style={styles.bigActionDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
};

  type NeedTokenFormProps = {
    visible: boolean;
    onClose: () => void;
    onGenerated: (token: TokenResponse) => void;
  };
  const NeedTokenForm: React.FC<NeedTokenFormProps> = ({
    visible,
    onClose,
    onGenerated
  }: NeedTokenFormProps) => {
    const [selectedDuration, setSelectedDuration] = useState<DurationOption['value']>(durationOptions[2].value);
    const [selectedTier, setSelectedTier] = useState<TokenTierOption['value']>(tokenTierOptions[0].value);
  const [selectedValidity, setSelectedValidity] = useState<ValidityOption['value']>(validityOptions[0].value);
  const [loading, setLoading] = useState(false);

  const requestToken = async () => {
    try {
      setLoading(true);
      const sessionTtlMinutes = SESSION_TTL_MINUTES[selectedDuration] ?? SESSION_TTL_MINUTES['1h'];
      const response = await fetch(`${API_BASE_URL}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          validity_period: selectedValidity,
          session_ttl_minutes: sessionTtlMinutes,
          message_char_limit: DEFAULT_MESSAGE_CHAR_LIMIT,
          client_identity: `mobile-${selectedTier}`
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let friendlyMessage = errorText || 'Failed to generate token';
        try {
          const parsed = JSON.parse(errorText);
          if (Array.isArray(parsed?.detail)) {
            friendlyMessage = parsed.detail.map((item: any) => item?.msg).filter(Boolean).join('\n');
          } else if (typeof parsed?.detail === 'string') {
            friendlyMessage = parsed.detail;
          }
        } catch {
          // Ignore JSON parsing errors and fall back to raw text.
        }
        throw new Error(friendlyMessage);
      }

      const data = (await response.json()) as TokenResponse;
      if (!data.token) {
        throw new Error('The API response did not include a token.');
      }
      onGenerated(data);
    } catch (error: any) {
      console.error('Token request failed', error);
      Alert.alert('Token error', error.message || 'Unable to generate token at this time.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!loading) {
          onClose();
        }
      }}
    >
      <LinearGradient
        colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean, COLORS.lagoon]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.formContainer}
      >
        <StatusBar style="light" />
        <SafeAreaView style={styles.formSafeArea}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Need a token?</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              disabled={loading}
              style={[styles.formCloseButton, loading && styles.disabledClose]}
            >
              <Ionicons name="close" size={28} color={COLORS.ice} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.formSubtitle}>
              Set how long the live session runs, how long the token stays claimable, and the experience tier you need.
            </Text>
            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>Session duration</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedDuration}
                  onValueChange={(value: DurationOption['value'], _index: number) => setSelectedDuration(value)}
                  dropdownIconColor={COLORS.aurora}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {durationOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>Validity window</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedValidity}
                    onValueChange={(value: ValidityOption['value'], _index: number) => setSelectedValidity(value)}
                  dropdownIconColor={COLORS.aurora}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {validityOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.pickerGroup}>
              <Text style={styles.pickerLabel}>Token tier</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedTier}
                    onValueChange={(value: TokenTierOption['value'], _index: number) => setSelectedTier(value)}
                  dropdownIconColor={COLORS.aurora}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {tokenTierOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.generateButton, loading && styles.generateButtonDisabled]}
              onPress={requestToken}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.generateButtonLabel}>Generate token</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};

  type JoinTokenFormResult = { payload: JoinResponse; token: string };
  type JoinTokenFormProps = {
    visible: boolean;
    onClose: () => void;
    onJoined: (result: JoinTokenFormResult) => void;
    webRtcAvailable: boolean;
  };
  const JoinTokenForm: React.FC<JoinTokenFormProps> = ({
    visible,
    onClose,
    onJoined,
    webRtcAvailable
  }: JoinTokenFormProps) => {
  const [tokenValue, setTokenValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setTokenValue('');
      setLoading(false);
    }
  }, [visible]);

  const handleJoin = async () => {
    if (!tokenValue.trim()) {
      return;
    }

    try {
      setLoading(true);
      const trimmed = tokenValue.trim();
      const payload = await joinSession(trimmed);
      onJoined({ payload, token: trimmed });
      setTokenValue('');
    } catch (error: any) {
      Alert.alert('Cannot join session', error?.message ?? 'Unexpected error while joining the session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.joinOverlay}>
        <LinearGradient colors={[COLORS.glowSoft, COLORS.glowWarm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.joinCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Enter a token</Text>
            <TouchableOpacity style={styles.formCloseButton} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.ice} />
            </TouchableOpacity>
          </View>
          <Text style={styles.joinHelper}>Paste or type the token you received to join the live session natively.</Text>
          {!webRtcAvailable && (
            <View style={styles.joinInfoBanner}>
              <Ionicons name="warning" size={18} color={COLORS.danger} />
              <Text style={styles.joinInfoBannerText}>
                Expo Go doesn’t include the WebRTC native module. Install the Expo dev build (run “npx expo run:ios” or “npx expo
                run:android”) to join in-app, or tap “On web” to continue in the browser.
              </Text>
            </View>
          )}
          <TextInput
            style={styles.joinInput}
            placeholder="CHAT-XXXX-XXXX"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={tokenValue}
            onChangeText={setTokenValue}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.joinButton, (loading || !tokenValue.trim()) && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={loading || !tokenValue.trim()}
          >
            {loading ? <ActivityIndicator color={COLORS.midnight} /> : <Text style={styles.joinButtonLabel}>Join session</Text>}
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
};

  type TokenResultCardProps = {
    token: TokenResponse;
    onReset: () => void;
    onStartInApp: () => void | Promise<void>;
    joiningInApp: boolean;
    webRtcAvailable: boolean;
  };
  const TokenResultCard: React.FC<TokenResultCardProps> = ({
    token,
    onReset,
    onStartInApp,
    joiningInApp,
    webRtcAvailable
  }: TokenResultCardProps) => {
  const shareMessage = useMemo(() => `Join my ChatOrbit session using this token: ${token.token}`, [token.token]);
  const sessionMinutes = Math.max(1, Math.round(token.session_ttl_seconds / 60));
  const messageLimit = token.message_char_limit.toLocaleString();
  const [launchingWeb, setLaunchingWeb] = useState(false);
  const [storedParticipantId, setStoredParticipantId] = useState<string | null>(null);
  const inAppDisabled = joiningInApp || !webRtcAvailable;

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(token.token);
    Alert.alert('Copied', 'Token copied to clipboard.');
  };

  const shareToken = async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch (error: any) {
      Alert.alert('Unable to share', error?.message ?? 'Unexpected error while sharing token');
    }
  };

  const startSessionOnWeb = async () => {
    if (launchingWeb) {
      return;
    }

    try {
      setLaunchingWeb(true);
      const payload = await joinSession(token.token, storedParticipantId);
      const participantId = payload.participant_id;
      setStoredParticipantId(participantId);

      const canonicalToken = payload.token || token.token;
      const sessionUrl = `https://chatorbit.com/session/${encodeURIComponent(canonicalToken)}?participant=${encodeURIComponent(participantId)}`;
      const supported = await Linking.canOpenURL(sessionUrl);
      if (supported) {
        await Linking.openURL(sessionUrl);
      } else {
        throw new Error('Your device cannot open the ChatOrbit session URL.');
      }
    } catch (error: any) {
      Alert.alert('Cannot open session', error?.message ?? 'Unexpected error while launching the session.');
    } finally {
      setLaunchingWeb(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.resultCard}
    >
      <Text style={styles.resultTitle}>Your token is ready!</Text>
      <Text style={styles.tokenText}>{token.token}</Text>
      {token.validity_expires_at ? (
        <Text style={styles.expiryText}>
          Valid until {new Date(token.validity_expires_at).toLocaleString()}
        </Text>
      ) : null}
      <Text style={styles.resultMeta}>Session stays live for {sessionMinutes} minutes after everyone joins.</Text>
      <Text style={styles.resultMeta}>Messages are limited to {messageLimit} characters.</Text>
      <View style={styles.resultButtonRow}>
        <TouchableOpacity style={styles.resultButton} onPress={copyToClipboard}>
          <Ionicons name="copy-outline" size={20} color={COLORS.ice} />
          <Text style={styles.resultButtonLabel}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resultButton} onPress={shareToken}>
          <Ionicons name="share-outline" size={20} color={COLORS.ice} />
          <Text style={styles.resultButtonLabel}>Share</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.startSessionLabel}>Start session</Text>
      <View style={styles.sessionButtonsRow}>
        <TouchableOpacity
          style={[
            styles.resultButton,
            styles.primaryResultButton,
            inAppDisabled && styles.primaryResultButtonDisabled
          ]}
          onPress={onStartInApp}
          disabled={inAppDisabled}
        >
          {joiningInApp ? (
            <ActivityIndicator color={COLORS.midnight} />
          ) : (
            <MaterialCommunityIcons name="tablet-cellphone" size={20} color={COLORS.midnight} />
          )}
          <Text style={[styles.resultButtonLabel, styles.primaryResultButtonLabel]}>
            {joiningInApp ? 'Connecting…' : webRtcAvailable ? 'In app' : 'Dev build only'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.resultButton,
            styles.primaryResultButton,
            launchingWeb && styles.primaryResultButtonDisabled
          ]}
          onPress={startSessionOnWeb}
          disabled={launchingWeb}
        >
          {launchingWeb ? (
            <ActivityIndicator color={COLORS.midnight} />
          ) : (
            <MaterialCommunityIcons name="rocket-launch-outline" size={20} color={COLORS.midnight} />
          )}
          <Text style={[styles.resultButtonLabel, styles.primaryResultButtonLabel]}>
            {launchingWeb ? 'Opening…' : 'On web'}
          </Text>
        </TouchableOpacity>
      </View>
      {!webRtcAvailable && (
        <View style={styles.webrtcNotice}>
          <Ionicons name="warning" size={18} color={COLORS.danger} />
          <View style={styles.webrtcNoticeContent}>
            <Text style={styles.webrtcNoticeText}>
              Expo Go doesn’t bundle the WebRTC native module. Install the Expo dev build (run “npx expo run:ios” or “npx expo
              run:android”) to launch sessions here, or choose “On web” to continue in the browser.
            </Text>
            <TouchableOpacity style={styles.webrtcNoticeLink} onPress={() => void Linking.openURL(EXPO_DEV_BUILD_DOCS_URL)}>
              <Text style={styles.webrtcNoticeLinkLabel}>View setup guide</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <TouchableOpacity style={styles.resetButton} onPress={onReset}>
        <Text style={styles.resetButtonLabel}>Generate another token</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

type InAppSessionScreenProps = {
  token: TokenResponse;
  participantId: string;
  participantRole: string;
  onExit: () => void;
};

const InAppSessionScreen: React.FC<InAppSessionScreenProps> = ({
  token,
  participantId,
  participantRole,
  onExit
}: InAppSessionScreenProps) => {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [connectedParticipantIds, setConnectedParticipantIds] = useState<string[]>([]);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(true);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const [dataChannelState, setDataChannelState] = useState<DataChannelState | null>(null);
  const [supportsEncryption, setSupportsEncryption] = useState<boolean | null>(null);
  const [peerSupportsEncryption, setPeerSupportsEncryption] = useState<boolean | null>(null);
  const [callState, setCallState] = useState<'idle' | 'requesting' | 'incoming' | 'connecting' | 'active'>(
    'idle'
  );
  const [isLocalAudioMuted, setIsLocalAudioMuted] = useState(false);
  const [isLocalVideoMuted, setIsLocalVideoMuted] = useState(false);
  const [isCallFullscreen, setIsCallFullscreen] = useState(false);
  const [preferredCameraFacing, setPreferredCameraFacing] = useState<'user' | 'environment'>('user');
  const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [socketReconnectNonce, setSocketReconnectNonce] = useState(0);
  const [peerResetNonce, setPeerResetNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const peerLogCounterRef = useRef(0);
  const dataChannelRef = useRef<PeerDataChannel | null>(null);
  const hashedMessagesRef = useRef<Map<string, EncryptedMessage>>(new Map());
  const pendingSignalsRef = useRef<any[]>([]);
  const pendingCallMessagesRef = useRef<Array<{ action: string; detail: Record<string, unknown> }>>([]);
  const pendingOutgoingSignalsRef = useRef<{ type: string; signalType: string; payload: unknown }[]>([]);
  const pendingCandidatesRef = useRef<any[]>([]);
  const capabilityAnnouncedRef = useRef(false);
  const peerSupportsEncryptionRef = useRef<boolean | null>(null);
  const callStateRef = useRef<'idle' | 'requesting' | 'incoming' | 'connecting' | 'active'>('idle');
  const sessionActiveRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const socketReconnectTimeoutRef = useRef<TimeoutHandle | null>(null);
  const iceRetryTimeoutRef = useRef<TimeoutHandle | null>(null);
  const fallbackOfferTimeoutRef = useRef<TimeoutHandle | null>(null);
  const hasSentOfferRef = useRef(false);
  const localAudioStreamRef = useRef<MediaStream | null>(null);
  const localVideoStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoStreamRef = useRef<MediaStream | null>(null);

  const webRtcBindings = useMemo(() => getWebRtcBindings(), []);

  if (!webRtcBindings) {
    return (
      <LinearGradient
        colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sessionFallbackCard}
      >
        <Text style={styles.sessionFallbackTitle}>Development build required</Text>
        <Text style={styles.sessionFallbackBody}>
          Expo Go doesn’t include the WebRTC native module. Run “npx expo run:ios” or “npx expo run:android” to install the Expo
          dev build with WebRTC support, then reopen this session.
        </Text>
        <TouchableOpacity style={styles.resetButton} onPress={onExit}>
          <Text style={styles.resetButtonLabel}>Back to token</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sessionFallbackLink} onPress={() => void Linking.openURL(EXPO_DEV_BUILD_DOCS_URL)}>
          <Text style={styles.sessionFallbackLinkLabel}>View setup guide</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const { RTCPeerConnection: RTCPeerConnectionCtor, RTCIceCandidate: RTCIceCandidateCtor, RTCSessionDescription: RTCSessionDescriptionCtor } =
    webRtcBindings;
  const RTCViewComponent = webRtcBindings.RTCView;

  const iceServers = useMemo(() => getIceServers(), []);
  const hasRelaySupport = useMemo(() => hasRelayIceServers(iceServers), [iceServers]);
  const connectivityVariant = hasRelaySupport ? 'relay' : iceServers.length > 0 ? 'stun' : 'none';
  const connectivityLabel =
    connectivityVariant === 'relay'
      ? 'TURN ready'
      : connectivityVariant === 'stun'
        ? 'STUN only'
        : 'No ICE servers';
  const connectivityMessage =
    connectivityVariant === 'relay'
      ? 'Relay routing enabled for restrictive networks.'
      : connectivityVariant === 'stun'
        ? 'Basic STUN available; relay fallback is not configured yet.'
        : 'Configure STUN or TURN servers to complete the WebRTC flow.';
  const connectivityBadgeStyle =
    connectivityVariant === 'relay'
      ? styles.connectivityBadgeReady
      : connectivityVariant === 'stun'
        ? styles.connectivityBadgeLimited
        : styles.connectivityBadgeWarning;
  const connectivityIcon =
    connectivityVariant === 'relay'
      ? 'radio-outline'
      : connectivityVariant === 'stun'
        ? 'alert-circle-outline'
        : 'close-circle-outline';

  const connectionBadgeLabel = connected ? 'Connected' : isReconnecting ? 'Reconnecting…' : socketReady ? 'Waiting for peer' : 'Offline';
  const connectionBadgeStyle =
    connected ? styles.connectionBadgeOnline : isReconnecting ? styles.connectionBadgeReconnecting : styles.connectionBadgeIdle;
  const videoReady = connected && dataChannelState === 'open';
  const videoStatusLabel =
    callState === 'active'
      ? 'Video live'
      : callState === 'connecting'
        ? 'Connecting…'
      : callState === 'incoming'
        ? 'Incoming request'
        : callState === 'requesting'
          ? 'Requested…'
          : 'Idle';
  const videoStatusStyle =
    callState === 'active'
      ? styles.videoBadgeActive
      : callState === 'incoming'
        ? styles.videoBadgeIncoming
        : callState === 'requesting'
          ? styles.videoBadgePending
          : styles.videoBadgeIdle;
  const localVideoUrl = useMemo(() => (localVideoStream as any)?.toURL?.() ?? null, [localVideoStream]);
  const remoteVideoUrl = useMemo(() => (remoteVideoStream as any)?.toURL?.() ?? null, [remoteVideoStream]);
  const videoPreviewRowStyle = useMemo(
    () => [styles.videoPreviewRow, isCallFullscreen && styles.videoPreviewRowFullscreen],
    [isCallFullscreen]
  );
  const videoPaneStyle = useMemo(
    () => [styles.videoPane, isCallFullscreen && styles.videoPaneFullscreen],
    [isCallFullscreen]
  );
  const videoSurfaceStyle = useMemo(
    () => [styles.videoSurface, isCallFullscreen && styles.videoSurfaceFullscreen],
    [isCallFullscreen]
  );

  useEffect(() => {
    setSupportsEncryption(resolveCrypto() !== null);
  }, []);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    if (callState === 'idle') {
      setIsCallFullscreen(false);
    }
  }, [callState]);

  useEffect(() => {
    const stream = localAudioStreamRef.current;
    if (!stream) {
      return;
    }
    stream
      .getTracks()
      .filter((track) => track.kind === 'audio')
      .forEach((track) => {
        track.enabled = !isLocalAudioMuted;
      });
  }, [isLocalAudioMuted]);

  useEffect(() => {
    const stream = localVideoStreamRef.current;
    if (!stream) {
      return;
    }
    stream
      .getTracks()
      .filter((track) => track.kind === 'video')
      .forEach((track) => {
        track.enabled = !isLocalVideoMuted;
      });
  }, [isLocalVideoMuted]);

  useEffect(() => {
    pendingOutgoingSignalsRef.current = [];
  }, [token.token]);

  useEffect(() => {
    hashedMessagesRef.current.clear();
    setMessages([]);
    setDraft('');
    capabilityAnnouncedRef.current = false;
    peerSupportsEncryptionRef.current = null;
    setPeerSupportsEncryption(null);
  }, [token.token]);

  useEffect(() => {
    sessionActiveRef.current = sessionStatus?.status === 'active';
  }, [sessionStatus?.status]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const loadStatus = async (showSpinner: boolean) => {
      if (showSpinner) {
        setStatusLoading(true);
        setStatusError(null);
      }
      try {
        const status = await fetchSessionStatus(token.token, controller.signal);
        if (isMounted) {
          setSessionStatus(status);
          setRemainingSeconds(status.remaining_seconds ?? null);
          if (status.connected_participants !== undefined) {
            const connectedIds = Array.isArray(status.connected_participants)
              ? status.connected_participants
              : [];
            setConnectedParticipantIds(connectedIds);
            logSocket('http status', status.status, 'connected', connectedIds);
          } else {
            logSocket('http status missing connected_participants, keeping previous value');
          }
          setStatusError(null);
        }
      } catch (err: any) {
        if (isMounted && !controller.signal.aborted) {
          setStatusError(err?.message ?? 'Unable to load the session status.');
        }
      } finally {
        if (isMounted && showSpinner) {
          setStatusLoading(false);
        }
      }
    };
    loadStatus(true);

    const interval = setInterval(() => {
      loadStatus(false);
    }, SESSION_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [logSocket, token.token]);

  useEffect(() => {
    if (sessionStatus) {
      setRemainingSeconds(sessionStatus.remaining_seconds ?? null);
    }
  }, [sessionStatus?.remaining_seconds]);

  useEffect(() => {
    return () => {
      const stream = localAudioStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      localAudioStreamRef.current = null;
      const videoStream = localVideoStreamRef.current;
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
      localVideoStreamRef.current = null;
      remoteVideoStreamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (remainingSeconds == null || remainingSeconds <= 0) {
      return;
    }
    const timeout = setTimeout(() => {
      setRemainingSeconds((prev: number | null) => (prev == null || prev <= 0 ? prev : prev - 1));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [remainingSeconds]);

  const getPeerLogId = useCallback(
    (pc: RTCPeerConnection | null | undefined) => {
      if (!pc) {
        return 'none';
      }
      const key = '__chatorbitPeerId';
      const anyPeer = pc as RTCPeerConnection & { [key]?: number };
      if (anyPeer[key] != null) {
        return anyPeer[key];
      }
      const nextId = peerLogCounterRef.current++;
      anyPeer[key] = nextId;
      return nextId;
    },
    [clearRemoteVideo, stopLocalVideoTracks]
  );

  const logPeer = useCallback(
    (pc: RTCPeerConnection | null | undefined, message: string, ...detail: unknown[]) => {
      const id = getPeerLogId(pc);
      console.debug(`rn-webrtc:pc:${id} ${message}`, ...detail);
    },
    [getPeerLogId]
  );

  const logSocket = useCallback((message: string, ...detail: unknown[]) => {
    console.debug('rn-webrtc:ws', message, ...detail);
  }, []);

  const summarizeSignalPayload = useCallback((signalType: string, payload: unknown) => {
    if (!payload) {
      return 'no-payload';
    }
    if (signalType === 'iceCandidate' && typeof payload === 'object' && payload !== null) {
      const candidate = payload as { candidate?: string; sdpMid?: string; sdpMLineIndex?: number };
      return {
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
        hasCandidate: Boolean(candidate.candidate)
      };
    }
    if ((signalType === 'offer' || signalType === 'answer') && typeof payload === 'object' && payload !== null) {
      const desc = payload as { type?: string; sdp?: string };
      return {
        type: desc.type,
        sdpLength: desc.sdp?.length ?? 0
      };
    }
    return payload;
  }, []);

  const sendSignal = useCallback(
    (signalType: string, payload: unknown) => {
      if (!participantId) {
        logSocket('signal skip: missing participant', signalType);
        return;
      }
      const socket = socketRef.current;
      const message = { type: 'signal', signalType, payload };
      if (socket?.readyState !== WebSocket.OPEN) {
        logSocket('signal queued: socket not open', signalType, socket?.readyState);
        pendingOutgoingSignalsRef.current.push(message);
        return;
      }
      console.debug('rn-webrtc:signal:out', signalType, summarizeSignalPayload(signalType, payload));
      socket.send(JSON.stringify(message));
    },
    [logSocket, participantId, summarizeSignalPayload]
  );

  const flushQueuedSignals = useCallback((socket?: WebSocket | null) => {
    const targetSocket = socket ?? socketRef.current;
    if (!targetSocket || targetSocket.readyState !== WebSocket.OPEN) {
      return;
    }
    const backlog = pendingOutgoingSignalsRef.current.splice(0);
    if (backlog.length === 0) {
      return;
    }
    logSocket('flushing queued signals', backlog.length);
    backlog.forEach((message) => {
      console.debug('rn-webrtc:signal:out', message.signalType, summarizeSignalPayload(message.signalType, message.payload));
      targetSocket.send(JSON.stringify(message));
    });
  }, [logSocket, summarizeSignalPayload]);

  const sendCapabilities = useCallback(() => {
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== 'open') {
      return;
    }
    if (supportsEncryption === null) {
      return;
    }
    channel.send(
      JSON.stringify({
        type: 'capabilities',
        supportsEncryption: supportsEncryption === true
      })
    );
    capabilityAnnouncedRef.current = true;
  }, [supportsEncryption]);

  useEffect(() => {
    if (supportsEncryption === null) {
      return;
    }
    if (capabilityAnnouncedRef.current) {
      return;
    }
    if (dataChannelRef.current?.readyState === 'open') {
      sendCapabilities();
    }
  }, [sendCapabilities, supportsEncryption]);

  const flushPendingCallMessages = useCallback(
    (channel?: PeerDataChannel | null) => {
      const target = channel ?? dataChannelRef.current;
      if (!target || target.readyState !== 'open' || !participantId) {
        return;
      }
      const queue = pendingCallMessagesRef.current.splice(0);
      for (const { action, detail } of queue) {
        try {
          target.send(JSON.stringify({ type: 'call', action, from: participantId, ...detail }));
          logPeer(peerConnectionRef.current, 'sent call control (queued)', action);
        } catch (err) {
          console.warn('Failed to flush call control message', err);
          pendingCallMessagesRef.current.unshift({ action, detail });
          break;
        }
      }
    },
    [logPeer, participantId]
  );

  const sendCallMessage = useCallback(
    (action: string, detail: Record<string, unknown> = {}) => {
      if (!participantId) {
        return;
      }
      const channel = dataChannelRef.current;
      const payload = { type: 'call', action, from: participantId, ...detail };
      if (!channel || channel.readyState !== 'open') {
        pendingCallMessagesRef.current.push({ action, detail });
        return;
      }
      try {
        channel.send(JSON.stringify(payload));
        logPeer(peerConnectionRef.current, 'sent call control', action);
      } catch (err) {
        console.warn('Failed to send call control message', err);
        pendingCallMessagesRef.current.push({ action, detail });
      }
    },
    [logPeer, participantId]
  );

  const handlePeerMessage = useCallback(
    async (rawMessage: string) => {
      try {
        const payload = JSON.parse(rawMessage);
        if (payload.type === 'capabilities') {
          const remoteSupports = Boolean(payload.supportsEncryption);
          peerSupportsEncryptionRef.current = remoteSupports;
          setPeerSupportsEncryption(remoteSupports);
          return;
        }
        if (payload.type === 'call') {
          const action = payload.action as string;
          const from = payload.from as string | undefined;
          if (!from || from === participantId) {
            return;
          }
            if (action === 'request') {
              if (callState === 'active' || callState === 'connecting') {
                sendCallMessage('busy');
              return;
            }
            if (callState === 'requesting') {
              setCallState('connecting');
              try {
                await ensureCallMedia();
                if (callStateRef.current === 'connecting') {
                  sendCallMessage('accept');
                  requestMediaRenegotiation();
                }
              } catch (err) {
                console.warn('Failed to auto-accept call request', err);
                setCallState('idle');
                sendCallMessage('reject');
                stopLocalVideoTracks();
                stopLocalAudioTracks();
                clearRemoteVideo();
                resetCallControls();
              }
              return;
            }
            setIncomingCallFrom(from);
            setCallState('incoming');
            return;
          }
          if (action === 'accept') {
            setIncomingCallFrom(null);
            setCallState((prev) => (prev === 'requesting' ? 'connecting' : prev));
            try {
              await ensureCallMedia();
              requestMediaRenegotiation();
            } catch (err) {
              console.warn('Unable to attach media after acceptance', err);
              setCallState('idle');
              stopLocalVideoTracks();
              stopLocalAudioTracks();
              clearRemoteVideo();
              resetCallControls();
            }
            return;
          }
          if (action === 'reject') {
            setIncomingCallFrom(null);
            setCallState('idle');
            stopLocalVideoTracks();
            stopLocalAudioTracks();
            clearRemoteVideo();
            resetCallControls();
            return;
          }
          if (action === 'end') {
            setIncomingCallFrom(null);
            setCallState('idle');
            stopLocalVideoTracks();
            stopLocalAudioTracks();
            clearRemoteVideo();
            resetCallControls();
            return;
          }
          if (action === 'cancel') {
            if (callState !== 'idle') {
              setCallState('idle');
              stopLocalVideoTracks();
              stopLocalAudioTracks();
              clearRemoteVideo();
              resetCallControls();
            }
            return;
          }
          if (action === 'busy') {
            if (callState === 'requesting') {
              setCallState('idle');
              stopLocalVideoTracks();
              stopLocalAudioTracks();
              clearRemoteVideo();
              resetCallControls();
              setError('Peer is busy with another video chat.');
            }
            return;
          }
          if (action === 'renegotiate') {
            void negotiateMediaUpdate(peerConnectionRef.current, 'peer requested media update');
          }
          return;
        }
        if (payload.type === 'message') {
          const incoming = payload.message as EncryptedMessage;
          if (!incoming?.messageId || incoming.sessionId !== token.token) {
            return;
          }
          const encryptionMode: EncryptionMode = incoming.encryption ?? 'aes-gcm';
          if (peerSupportsEncryptionRef.current === null) {
            peerSupportsEncryptionRef.current = encryptionMode !== 'none';
            setPeerSupportsEncryption(encryptionMode !== 'none');
          }
          try {
            let content: string;
            if (encryptionMode === 'none') {
              content = incoming.content ?? '';
            } else {
              if (supportsEncryption !== true) {
                setError('Received encrypted message but encryption is not supported.');
                return;
              }
              if (!incoming.encryptedContent) {
                setError('Missing encrypted payload.');
                return;
              }
              const key = await deriveKey(token.token);
              try {
                content = await decryptText(key, incoming.encryptedContent);
              } catch (err) {
                setError('Failed to decrypt message.');
                return;
              }
            }
            if (incoming.hash) {
              const expectedHash = await computeMessageHash(
                incoming.sessionId,
                incoming.participantId,
                incoming.messageId,
                content
              );
              if (expectedHash !== incoming.hash) {
                console.warn('Hash mismatch for message', incoming.messageId);
                setError('Ignored a message with mismatched hash.');
                return;
              }
            }
            hashedMessagesRef.current.set(incoming.messageId, {
              ...incoming,
              content,
              encryption: encryptionMode,
              deleted: false
            });
            setMessages((prev: Message[]) =>
              upsertMessage(prev, {
                messageId: incoming.messageId,
                participantId: incoming.participantId,
                role: incoming.role,
                content,
                createdAt: incoming.createdAt
              })
            );
            setError(null);
            return;
          } catch (err) {
            console.warn('Unable to process incoming message', err);
            setError('Unable to process an incoming message.');
            return;
          }
        }
        if (payload.type === 'delete') {
          const messageId = payload.messageId as string | undefined;
          if (!messageId) {
            return;
          }
          hashedMessagesRef.current.delete(messageId);
          setMessages((prev: Message[]) => prev.filter((item: Message) => item.messageId !== messageId));
        }
      } catch (err) {
        console.warn('Unable to process data channel message', err);
      }
    },
    [
      callState,
      clearRemoteVideo,
      ensureCallMedia,
      negotiateMediaUpdate,
      participantId,
      requestMediaRenegotiation,
      sendCallMessage,
      stopLocalAudioTracks,
      stopLocalVideoTracks,
      token.token
    ]
  );

  const flushPendingCandidates = useCallback(
    async (pc: RTCPeerConnection) => {
      if (!pc.remoteDescription) {
        return;
      }
      const backlog = pendingCandidatesRef.current.splice(0);
      if (backlog.length > 0) {
        logPeer(pc, 'flushing buffered ice candidates', backlog.length);
      }
      for (const candidate of backlog) {
        try {
          await pc.addIceCandidate(new RTCIceCandidateCtor(candidate));
        } catch (err) {
          console.warn('Failed to apply buffered ICE candidate', err);
        }
      }
    },
    [RTCIceCandidateCtor, logPeer]
  );

  const processSignalPayload = useCallback(
    async (pc: RTCPeerConnection, payload: any) => {
      const signalType = payload.signalType as string;
      const detail = payload.payload;
      if (signalType === 'offer' && detail) {
        if (fallbackOfferTimeoutRef.current) {
          clearTimeout(fallbackOfferTimeoutRef.current as TimeoutHandle);
          fallbackOfferTimeoutRef.current = null;
        }
        logPeer(pc, 'received offer');
        await pc.setRemoteDescription(new RTCSessionDescriptionCtor(detail));
        logPeer(pc, 'applied remote offer');
        await flushPendingCandidates(pc);
        const answer = await pc.createAnswer();
        logPeer(pc, 'created answer');
        await pc.setLocalDescription(answer);
        logPeer(pc, 'set local answer');
        sendSignal('answer', answer);
      } else if (signalType === 'answer' && detail) {
        logPeer(pc, 'received answer');
        await pc.setRemoteDescription(new RTCSessionDescriptionCtor(detail));
        logPeer(pc, 'applied remote answer');
        await flushPendingCandidates(pc);
      } else if (signalType === 'iceCandidate') {
        if (!detail) {
          try {
            logPeer(pc, 'received end-of-candidates');
            await pc.addIceCandidate(null);
          } catch (err) {
            console.warn('Failed to process end-of-candidates signal', err);
          }
          return;
        }
        if (!pc.remoteDescription) {
          logPeer(pc, 'buffering ice candidate (no remote description yet)');
          pendingCandidatesRef.current.push(detail);
          return;
        }
        try {
          logPeer(pc, 'adding ice candidate');
          await pc.addIceCandidate(new RTCIceCandidateCtor(detail));
        } catch (err) {
          console.warn('Failed to process ICE candidate', err);
        }
      }
    },
    [RTCIceCandidateCtor, RTCSessionDescriptionCtor, flushPendingCandidates, logPeer, sendSignal]
  );

  const handleSignal = useCallback(
    (payload: any) => {
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.debug('rn-webrtc:signal:buffered', payload.signalType);
        pendingSignalsRef.current.push(payload);
        return;
      }
      console.debug('rn-webrtc:signal:in', payload.signalType);
      void processSignalPayload(pc, payload);
    },
    [processSignalPayload]
  );

  useEffect(() => {
    if (!participantId) {
      return;
    }
    const url = `${WS_BASE_URL}/ws/sessions/${encodeURIComponent(token.token)}?participantId=${encodeURIComponent(participantId)}`;
    let cancelled = false;

    try {
      logSocket('connecting', url, { participantId });
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        logSocket('open');
        setSocketReady(true);
        setStatusError(null);
        reconnectAttemptsRef.current = 0;
        flushQueuedSignals(socket);
      };

      socket.onerror = (event: Event) => {
        logSocket('error', event);
        setStatusError('Realtime connection interrupted. Attempting to reconnect…');
      };

      socket.onclose = (event: CloseEvent) => {
        logSocket('close', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        socketRef.current = null;
        setSocketReady(false);
        if (!cancelled) {
          setStatusError((prev: string | null) => prev ?? 'Realtime connection closed.');
          if (!socketReconnectTimeoutRef.current) {
            const attempt = reconnectAttemptsRef.current + 1;
            reconnectAttemptsRef.current = attempt;
            const delay = Math.min(3000, attempt * 600);
            logSocket('reconnect scheduled', { attempt, delay });
            socketReconnectTimeoutRef.current = setTimeout(() => {
              socketReconnectTimeoutRef.current = null;
              if (!cancelled) {
                logSocket('reconnect firing', { attempt });
                setSocketReconnectNonce((value: number) => value + 1);
              }
            }, delay);
          }
        }
      };

      socket.onmessage = (event: MessageEvent) => {
        logSocket('message', event.data);
        try {
          const payload = JSON.parse(event.data) as SessionStatusSocketPayload | { type: string; signalType?: string };
          if (payload.type === 'status') {
            const { connected_participants, type: _ignored, ...rest } = payload as SessionStatusSocketPayload;
            if (connected_participants !== undefined) {
              const connectedIds = Array.isArray(connected_participants) ? connected_participants : [];
              logSocket('status payload', rest.status, 'participants', connectedIds);
              setConnectedParticipantIds(connectedIds);
            } else {
              logSocket('status payload missing connected_participants, keeping previous value');
            }
            setSessionStatus(rest);
            setRemainingSeconds(rest.remaining_seconds ?? null);
            setStatusLoading(false);
          } else if (payload.type === 'signal') {
            const signalType = payload.signalType ?? 'unknown';
            logSocket('signal payload', signalType, summarizeSignalPayload(signalType, (payload as any).payload));
            handleSignal(payload);
          } else if (payload.type === 'session_closed') {
            setStatusError('The session has been closed.');
            setConnected(false);
          } else if (payload.type === 'session_expired') {
            setStatusError('The session has expired.');
            setConnected(false);
          } else if (payload.type === 'session_deleted') {
            setStatusError('The session is no longer available.');
            setConnected(false);
          }
        } catch (err) {
          console.warn('Unable to process websocket payload', err);
        }
      };
    } catch (err) {
      console.warn('Unable to open realtime session socket', err);
      setStatusError('Unable to open realtime connection. Some updates may be delayed.');
      if (!socketReconnectTimeoutRef.current) {
        socketReconnectTimeoutRef.current = setTimeout(() => {
          socketReconnectTimeoutRef.current = null;
          setSocketReconnectNonce((value: number) => value + 1);
        }, 1500);
      }
      return;
    }

    return () => {
      cancelled = true;
      if (socketReconnectTimeoutRef.current) {
        clearTimeout(socketReconnectTimeoutRef.current as TimeoutHandle);
        socketReconnectTimeoutRef.current = null;
      }
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (err) {
          console.warn('Failed to close session socket', err);
        }
      }
      socketRef.current = null;
    };
  }, [flushQueuedSignals, handleSignal, logSocket, participantId, socketReconnectNonce, summarizeSignalPayload, token.token]);

  const resetPeerConnection = useCallback(
    ({ recreate = true, delayMs }: { recreate?: boolean; delayMs?: number } = {}) => {
      if (iceRetryTimeoutRef.current) {
        clearTimeout(iceRetryTimeoutRef.current as TimeoutHandle);
        iceRetryTimeoutRef.current = null;
      }
      if (fallbackOfferTimeoutRef.current) {
        clearTimeout(fallbackOfferTimeoutRef.current as TimeoutHandle);
        fallbackOfferTimeoutRef.current = null;
      }
      const existing = peerConnectionRef.current;
      if (existing) {
        try {
          existing.close();
        } catch (err) {
          console.warn('Failed to close RTCPeerConnection', err);
        }
      }
      peerConnectionRef.current = null;
      if (dataChannelRef.current) {
        try {
          dataChannelRef.current.close();
        } catch (err) {
          console.warn('Failed to close data channel', err);
        }
      }
      dataChannelRef.current = null;
      capabilityAnnouncedRef.current = false;
      peerSupportsEncryptionRef.current = null;
      setPeerSupportsEncryption(null);
      pendingSignalsRef.current = [];
      pendingCandidatesRef.current = [];
      hasSentOfferRef.current = false;
      setConnected(false);
      setDataChannelState(null);
      stopLocalVideoTracks();
      stopLocalAudioTracks();
      clearRemoteVideo();
      setCallState('idle');
      setIncomingCallFrom(null);
      if (!recreate) {
        return;
      }
      if (delayMs && delayMs > 0) {
        iceRetryTimeoutRef.current = setTimeout(() => {
          iceRetryTimeoutRef.current = null;
          setPeerResetNonce((value: number) => value + 1);
        }, delayMs);
      } else {
        setPeerResetNonce((value: number) => value + 1);
      }
    },
    []
  );

  const schedulePeerConnectionRecovery = useCallback(
    (reason: string, { delayMs = 1000 }: { delayMs?: number } = {}) => {
      console.warn('Scheduling peer connection recovery', reason);
      logSocket('peer recovery', reason, 'delayMs', delayMs);
      if (!sessionActiveRef.current) {
        return;
      }
      setIsReconnecting(true);
      resetPeerConnection({ delayMs });
    },
    [logSocket, resetPeerConnection]
  );

  const attachDataChannel = useCallback(
    (channel: PeerDataChannel, owner: RTCPeerConnection | null) => {
      logPeer(owner, 'attach data channel', channel.label, channel.readyState);
      dataChannelRef.current = channel;
      setDataChannelState(channel.readyState as DataChannelState);
      const markOpen = () => {
        logPeer(owner, 'data channel open', channel.label);
        setConnected(true);
        setError(null);
        setIsReconnecting(false);
        capabilityAnnouncedRef.current = false;
        sendCapabilities();
        flushPendingCallMessages(channel);
        setDataChannelState('open');
      };
      if (channel.readyState === 'open') {
        markOpen();
      }
      channel.onopen = () => {
        markOpen();
      };
      channel.onclose = () => {
        logPeer(owner, 'data channel closed', channel.label);
        setConnected(false);
        setDataChannelState(channel.readyState as DataChannelState);
        capabilityAnnouncedRef.current = false;
        peerSupportsEncryptionRef.current = null;
        setPeerSupportsEncryption(null);
        if (owner && peerConnectionRef.current === owner && sessionActiveRef.current) {
          schedulePeerConnectionRecovery('data channel closed');
        }
      };
      channel.onerror = () => {
        logPeer(owner, 'data channel error', channel.label);
        setConnected(false);
        setDataChannelState(channel.readyState as DataChannelState);
        if (owner && peerConnectionRef.current === owner && sessionActiveRef.current) {
          schedulePeerConnectionRecovery('data channel error');
        }
      };
      channel.onmessage = (event: MessageEvent) => {
        void handlePeerMessage(event.data);
      };
    },
    [flushPendingCallMessages, handlePeerMessage, schedulePeerConnectionRecovery, sendCapabilities]
  );

  const ensureLocalAudioStream = useCallback(async () => {
    if (!webRtcBindings?.mediaDevices?.getUserMedia) {
      logSocket('mediaDevices missing; audio unavailable');
      return null;
    }
    if (localAudioStreamRef.current) {
      return localAudioStreamRef.current;
    }
    try {
      const stream = await webRtcBindings.mediaDevices.getUserMedia({ audio: true });
      localAudioStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.warn('Unable to start local audio stream', err);
      return null;
    }
  }, [logSocket, webRtcBindings]);

  const stopLocalAudioTracks = useCallback(() => {
    const stream = localAudioStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    localAudioStreamRef.current = null;
    const pc = peerConnectionRef.current;
    if (pc && typeof pc.getSenders === 'function') {
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === 'audio') {
          try {
            pc.removeTrack(sender);
          } catch (err) {
            console.warn('Failed to remove audio sender', err);
          }
        }
      });
    }
  }, []);

  const stopLocalVideoTracks = useCallback(() => {
    const stream = localVideoStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    localVideoStreamRef.current = null;
    setLocalVideoStream(null);
    const pc = peerConnectionRef.current;
    if (pc && typeof pc.getSenders === 'function') {
      pc.getSenders().forEach((sender) => {
        if (sender.track?.kind === 'video') {
          try {
            pc.removeTrack(sender);
          } catch (err) {
            console.warn('Failed to remove video sender', err);
          }
        }
      });
    }
  }, []);

  const clearRemoteVideo = useCallback(() => {
    remoteVideoStreamRef.current = null;
    setRemoteVideoStream(null);
  }, []);

  const resetCallControls = useCallback(() => {
    setIsLocalAudioMuted(false);
    setIsLocalVideoMuted(false);
    setIsCallFullscreen(false);
  }, []);

  const negotiateMediaUpdate = useCallback(
    async (pc: RTCPeerConnection | null, reason: string) => {
      if (!pc) {
        return;
      }
      if (pc.signalingState === 'closed') {
        return;
      }
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal('offer', offer);
        logPeer(pc, 'sent renegotiation offer', reason);
      } catch (err) {
        console.warn('Failed to renegotiate media', err);
      }
    },
    [logPeer, sendSignal]
  );

  const requestMediaRenegotiation = useCallback(() => {
    if (participantRole === 'host') {
      void negotiateMediaUpdate(peerConnectionRef.current, 'requested media update');
    } else {
      sendCallMessage('renegotiate');
    }
  }, [negotiateMediaUpdate, participantRole, sendCallMessage]);

  const ensureCallMedia = useCallback(
    async (options: { attach?: boolean } = {}) => {
      const { attach = true } = options;
      const pc = peerConnectionRef.current;
      if (!pc || !webRtcBindings?.mediaDevices?.getUserMedia) {
        return null;
      }

      const attachSenders = (kind: 'audio' | 'video', stream: MediaStream) => {
        const hasSender = pc.getSenders?.().some((sender) => sender.track?.kind === kind);
        if (!hasSender && typeof pc.addTransceiver === 'function') {
          try {
            pc.addTransceiver(kind, { direction: 'sendrecv' });
          } catch (err) {
            console.warn(`Failed to add ${kind} transceiver`, err);
          }
        }
        stream
          .getTracks()
          .filter((track) => track.kind === kind)
          .forEach((track) => {
            try {
              pc.addTrack(track, stream);
              logPeer(pc, `added local ${kind} track`, track.id);
            } catch (err) {
              console.warn(`Failed to attach local ${kind} track`, err);
            }
          });
      };

      let videoStream = localVideoStreamRef.current;
      if (!videoStream) {
        try {
          videoStream = await webRtcBindings.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: preferredCameraFacing } }
          });
          localVideoStreamRef.current = videoStream;
          setLocalVideoStream(videoStream);
        } catch (err) {
          console.warn('Unable to start local video stream', err);
          return null;
        }
      }

      videoStream
        .getTracks()
        .filter((track) => track.kind === 'video')
        .forEach((track) => {
          track.enabled = !isLocalVideoMuted;
        });

      if (videoStream && attach) {
        attachSenders('video', videoStream);
      }

      if (attach) {
        const audioStream = await ensureLocalAudioStream();
        if (audioStream) {
          audioStream
            .getTracks()
            .filter((track) => track.kind === 'audio')
            .forEach((track) => {
              track.enabled = !isLocalAudioMuted;
            });
          attachSenders('audio', audioStream);
        }
      }

      return videoStream;
    },
    [ensureLocalAudioStream, isLocalAudioMuted, isLocalVideoMuted, logPeer, preferredCameraFacing, webRtcBindings]
  );

  const toggleLocalAudio = useCallback(() => {
    setIsLocalAudioMuted((prev) => {
      const next = !prev;
      const stream = localAudioStreamRef.current;
      if (stream) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  const toggleLocalVideo = useCallback(() => {
    setIsLocalVideoMuted((prev) => {
      const next = !prev;
      const stream = localVideoStreamRef.current;
      if (stream) {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  const flipCamera = useCallback(() => {
    const stream = localVideoStreamRef.current;
    const track = stream?.getVideoTracks?.()[0];
    const switchable = track as unknown as { _switchCamera?: () => void } | undefined;
    if (switchable?._switchCamera) {
      switchable._switchCamera();
      setPreferredCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'));
    }
  }, []);

  const toggleCallFullscreen = useCallback(() => {
    setIsCallFullscreen((prev) => !prev);
  }, []);

  const requestVideoChat = useCallback(async () => {
    if (callState !== 'idle') {
      return;
    }
    const stream = await ensureCallMedia({ attach: false });
    if (!stream) {
      setError('Unable to access the camera for video chat.');
      return;
    }
    setCallState('requesting');
    setIncomingCallFrom(null);
    sendCallMessage('request');
  }, [callState, ensureCallMedia, sendCallMessage]);

  const acceptVideoChat = useCallback(async () => {
    if (!incomingCallFrom) {
      return;
    }
    const stream = await ensureCallMedia();
    if (!stream) {
      setError('Unable to access the camera for video chat.');
      sendCallMessage('reject');
      return;
    }
    setCallState('connecting');
    setIncomingCallFrom(null);
    sendCallMessage('accept');
    requestMediaRenegotiation();
  }, [ensureCallMedia, incomingCallFrom, requestMediaRenegotiation, sendCallMessage]);

  const declineVideoChat = useCallback(() => {
    sendCallMessage('reject');
    setIncomingCallFrom(null);
    setCallState('idle');
    stopLocalVideoTracks();
    stopLocalAudioTracks();
    clearRemoteVideo();
    resetCallControls();
  }, [clearRemoteVideo, resetCallControls, sendCallMessage, stopLocalAudioTracks, stopLocalVideoTracks]);

  const endVideoChat = useCallback(() => {
    if (callState === 'requesting') {
      sendCallMessage('cancel');
    } else {
      sendCallMessage('end');
    }
    setCallState('idle');
    setIncomingCallFrom(null);
    stopLocalVideoTracks();
    stopLocalAudioTracks();
    clearRemoteVideo();
    resetCallControls();
  }, [callState, clearRemoteVideo, resetCallControls, sendCallMessage, stopLocalAudioTracks, stopLocalVideoTracks]);

  useEffect(() => {
    if (remoteVideoStream && (callState === 'connecting' || callState === 'requesting')) {
      setCallState('active');
    }
  }, [callState, remoteVideoStream]);

  useEffect(() => {
    if (!participantId) {
      return;
    }
    let cancelled = false;
    let peerConnection: RTCPeerConnection | null = null;

    const setupPeerConnection = async () => {
      const pc = new RTCPeerConnectionCtor({ iceServers });
      peerConnection = pc;
      logPeer(pc, 'ctor', iceServers.length ? 'with-ice' : 'no-ice');
      peerConnectionRef.current = pc;

      const handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate && event.candidate.candidate) {
          const candidate = typeof event.candidate.toJSON === 'function' ? event.candidate.toJSON() : event.candidate;
          logPeer(pc, 'emit ice candidate');
          sendSignal('iceCandidate', candidate);
        } else {
          logPeer(pc, 'emit end-of-candidates');
          sendSignal('iceCandidate', null);
        }
      };

      const handleConnectionStateChange = () => {
        logPeer(pc, 'connection state change', pc.connectionState, pc.iceConnectionState);
        const state = pc.connectionState;
        if (state === 'connected') {
          setIsReconnecting(false);
          if (dataChannelRef.current?.readyState === 'open') {
            setConnected(true);
          }
        } else if (state === 'failed' || state === 'disconnected') {
          setConnected(false);
          if (sessionActiveRef.current) {
            schedulePeerConnectionRecovery(`connection ${state}`, { delayMs: state === 'failed' ? 0 : 1200 });
          }
        } else if (state === 'closed') {
          setConnected(false);
        }
      };

      const handleDataChannel = (event: RTCDataChannelEvent) => {
        logPeer(pc, 'incoming data channel', event.channel?.label);
        attachDataChannel(event.channel as unknown as PeerDataChannel, pc);
      };

      const handleTrack = (event: RTCTrackEvent) => {
        logPeer(pc, 'remote track', event.track?.kind, event.streams?.length ?? 0);
        if (event.track?.kind === 'audio') {
          event.track.enabled = true;
          return;
        }
        if (event.track?.kind === 'video') {
          const stream = event.streams?.[0] ?? new MediaStream([event.track]);
          remoteVideoStreamRef.current = stream as unknown as MediaStream;
          setRemoteVideoStream(stream as unknown as MediaStream);
          return;
        }
      };

      const handleNegotiationNeeded = () => {
        void negotiateMediaUpdate(pc, 'onnegotiationneeded');
      };

      const peerConnectionAny = pc as RTCPeerConnection & {
        onicecandidate?: ((event: RTCPeerConnectionIceEvent) => void) | null;
        onconnectionstatechange?: (() => void) | null;
        ondatachannel?: ((event: RTCDataChannelEvent) => void) | null;
        ontrack?: ((event: RTCTrackEvent) => void) | null;
        onnegotiationneeded?: (() => void) | null;
      };

      peerConnectionAny.onicecandidate = handleIceCandidate;
      peerConnectionAny.onconnectionstatechange = handleConnectionStateChange;
      peerConnectionAny.ondatachannel = handleDataChannel;
      peerConnectionAny.ontrack = handleTrack;
      peerConnectionAny.onnegotiationneeded = handleNegotiationNeeded;

      if (participantRole === 'host') {
        const channel = pc.createDataChannel('chat') as unknown as PeerDataChannel;
        logPeer(pc, 'created data channel', channel.label);
        attachDataChannel(channel, pc);
      }

      const backlog = pendingSignalsRef.current.splice(0);
      if (backlog.length > 0) {
        logPeer(pc, 'replaying buffered signals', backlog.length);
        backlog.forEach((item) => {
          void processSignalPayload(pc, item);
        });
      }

      if (participantRole === 'host') {
        try {
          logPeer(pc, 'creating offer');
          const offer = await pc.createOffer();
          if (peerConnectionRef.current !== pc || pc.signalingState === 'closed') {
            logPeer(pc, 'offer abandoned (stale peer)');
            return;
          }
          await pc.setLocalDescription(offer);
          if (peerConnectionRef.current !== pc || pc.signalingState === 'closed') {
            logPeer(pc, 'offer abandoned after setLocalDescription (stale peer)');
            return;
          }
          logPeer(pc, 'sending offer');
          sendSignal('offer', offer);
          hasSentOfferRef.current = true;
        } catch (err) {
          console.warn('Failed to create offer', err);
        }
      } else if (!pc.remoteDescription && !fallbackOfferTimeoutRef.current) {
        fallbackOfferTimeoutRef.current = setTimeout(async () => {
          fallbackOfferTimeoutRef.current = null;
          if (!peerConnectionRef.current || peerConnectionRef.current !== pc) {
            return;
          }
          if (pc.signalingState !== 'stable' || pc.remoteDescription) {
            return;
          }
          try {
            if (!dataChannelRef.current) {
              const channel = pc.createDataChannel('chat') as unknown as PeerDataChannel;
              logPeer(pc, 'created data channel (fallback)', channel.label);
              attachDataChannel(channel, pc);
            }
            logPeer(pc, 'creating fallback offer as guest');
            const offer = await pc.createOffer();
            if (peerConnectionRef.current !== pc || pc.signalingState === 'closed') {
              logPeer(pc, 'fallback offer abandoned (stale peer)');
              return;
            }
            await pc.setLocalDescription(offer);
            if (peerConnectionRef.current !== pc || pc.signalingState === 'closed') {
              logPeer(pc, 'fallback offer abandoned after setLocalDescription (stale peer)');
              return;
            }
            sendSignal('offer', offer);
            hasSentOfferRef.current = true;
          } catch (err) {
            console.warn('Failed to create fallback offer', err);
          }
        }, 750);
      }
    };

    void setupPeerConnection();

    return () => {
      cancelled = true;
      if (!peerConnection) {
        return;
      }
      if (fallbackOfferTimeoutRef.current) {
        clearTimeout(fallbackOfferTimeoutRef.current as TimeoutHandle);
        fallbackOfferTimeoutRef.current = null;
      }
      const peerConnectionAny = peerConnection as RTCPeerConnection & {
        onicecandidate?: ((event: RTCPeerConnectionIceEvent) => void) | null;
        onconnectionstatechange?: (() => void) | null;
        ondatachannel?: ((event: RTCDataChannelEvent) => void) | null;
        ontrack?: ((event: RTCTrackEvent) => void) | null;
      };
      peerConnectionAny.onicecandidate = null;
      peerConnectionAny.onconnectionstatechange = null;
      peerConnectionAny.ondatachannel = null;
      peerConnectionAny.ontrack = null;
      try {
        peerConnection.close();
      } catch (err) {
        console.warn('Failed to close peer connection', err);
      }
      if (dataChannelRef.current) {
        try {
          dataChannelRef.current.close();
        } catch (err) {
          console.warn('Failed to close data channel', err);
        }
      }
    };
  }, [
    RTCPeerConnectionCtor,
    attachDataChannel,
    iceServers,
    participantId,
    participantRole,
    peerResetNonce,
    processSignalPayload,
    sendSignal,
    schedulePeerConnectionRecovery
  ]);

  const sessionStatusLabel = mapStatusLabel(sessionStatus?.status);
  const sessionStatusDescription = mapStatusDescription(sessionStatus?.status);
  const statusIndicatorVariant = statusVariant(sessionStatus?.status);
  const sessionMessageLimit = sessionStatus?.message_char_limit ?? token.message_char_limit ?? DEFAULT_MESSAGE_CHAR_LIMIT;
  const connectedCount = connectedParticipantIds.length;
  const participants: SessionParticipant[] = sessionStatus?.participants ?? [];
  const canSend = connected && draft.trim().length > 0 && !isReconnecting;

  const handleSendMessage = useCallback(async () => {
    if (!connected) {
      setError('Connection is not ready yet.');
      return;
    }
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== 'open') {
      setError('Connection is not ready yet.');
      return;
    }
    if (!participantId) {
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }
    if (sessionStatus?.message_char_limit && trimmed.length > sessionStatus.message_char_limit) {
      setError(`Messages are limited to ${sessionStatus.message_char_limit} characters.`);
      return;
    }
    if (peerSupportsEncryption === null) {
      setError('Connection is still negotiating. Please wait a moment.');
      return;
    }
    const useEncryption = supportsEncryption === true && peerSupportsEncryption === true;
    const encryptionMode: EncryptionMode = useEncryption ? 'aes-gcm' : 'none';
    const messageId = generateMessageId();
    const createdAt = new Date().toISOString();
    try {
      const hash = await computeMessageHash(token.token, participantId, messageId, trimmed);
      let record: EncryptedMessage;
      if (useEncryption) {
        const key = await deriveKey(token.token);
        const encryptedContent = await encryptText(key, trimmed);
        record = {
          sessionId: token.token,
          messageId,
          participantId,
          role: participantRole,
          createdAt,
          encryptedContent,
          hash,
          encryption: encryptionMode,
          deleted: false
        };
      } else {
        record = {
          sessionId: token.token,
          messageId,
          participantId,
          role: participantRole,
          createdAt,
          content: trimmed,
          hash,
          encryption: encryptionMode,
          deleted: false
        };
      }
      hashedMessagesRef.current.set(messageId, record);
      channel.send(
        JSON.stringify({
          type: 'message',
          message: record
        })
      );
      setMessages((prev: Message[]) =>
        upsertMessage(prev, {
          messageId,
          participantId,
          role: participantRole,
          content: trimmed,
          createdAt
        })
      );
      setDraft('');
      setError(null);
    } catch (err) {
      console.warn('Failed to send message', err);
      setError('Unable to send your message.');
    }
  }, [connected, draft, participantId, participantRole, peerSupportsEncryption, sessionStatus?.message_char_limit, supportsEncryption, token.token]);

    const renderMessage = (item: Message) => {
      const isSelf = item.participantId === participantId;
      return (
        <View
          key={item.messageId}
          style={[styles.chatBubble, isSelf ? styles.chatBubbleSelf : styles.chatBubblePeer]}
        >
          <Text style={styles.chatBubbleMeta}>
            {item.role === 'host' ? 'Host' : 'Guest'} ·{' '}
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.chatBubbleText}>{item.content}</Text>
        </View>
      );
    };

  return (
    <LinearGradient colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.inAppSessionContainer}>
      <SafeAreaView style={styles.inAppSessionSafeArea}>
        <View style={styles.inAppHeaderRow}>
          <TouchableOpacity accessibilityRole="button" style={styles.inAppBackButton} onPress={onExit}>
            <Ionicons name="arrow-back" size={20} color={COLORS.ice} />
            <Text style={styles.inAppBackLabel}>Back</Text>
          </TouchableOpacity>
          <View style={styles.inAppHeaderTextGroup}>
            <Text style={styles.inAppTitle}>Live session cockpit</Text>
            <Text style={styles.inAppSubtitle}>Keep this screen open while participants join.</Text>
          </View>
        </View>
        <ScrollView
          style={styles.sessionScroll}
          contentContainerStyle={styles.sessionContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.sessionStatusCard}>
            <View style={styles.sessionCardHeader}>
              <Text style={styles.sessionCardTitle}>Session status</Text>
              <View style={[styles.statusPill, statusIndicatorVariant === 'success' ? styles.statusPillSuccess : statusIndicatorVariant === 'waiting' ? styles.statusPillWaiting : styles.statusPillInactive]}>
                <View style={styles.statusPillIndicator} />
                <Text style={styles.statusPillLabel}>{sessionStatusLabel}</Text>
              </View>
            </View>
            <Text style={styles.sessionCardDescription}>{sessionStatusDescription}</Text>
            <View style={[styles.connectivityBanner, connectivityBadgeStyle]}>
              <Ionicons name={connectivityIcon as any} size={18} color={COLORS.ice} />
              <View style={styles.connectivityBannerText}>
                <Text style={styles.connectivityBannerLabel}>{connectivityLabel}</Text>
                <Text style={styles.connectivityBannerMessage}>{connectivityMessage}</Text>
              </View>
            </View>
            {statusLoading ? (
              <View style={styles.statusLoadingRow}>
                <ActivityIndicator color={COLORS.aurora} />
                <Text style={styles.statusLoadingLabel}>Loading session details…</Text>
              </View>
            ) : statusError ? (
              <View style={styles.statusErrorBanner}>
                <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                <Text style={styles.statusErrorLabel}>{statusError}</Text>
              </View>
            ) : (
              <View style={styles.statusMetricsContainer}>
                <View style={styles.statusMetricRow}>
                  <Text style={styles.statusMetricLabel}>Timer</Text>
                  <Text style={styles.statusMetricValue}>{formatRemainingTime(remainingSeconds)}</Text>
                </View>
                <View style={styles.statusMetricRow}>
                  <Text style={styles.statusMetricLabel}>Message limit</Text>
                  <Text style={styles.statusMetricValue}>{sessionMessageLimit.toLocaleString()} characters</Text>
                </View>
                <View style={styles.statusMetricRow}>
                  <Text style={styles.statusMetricLabel}>Connected</Text>
                  <Text style={styles.statusMetricValue}>
                    {connectedCount}/{Math.max(participants.length, 2)} participants
                  </Text>
                </View>
                <View style={styles.participantList}>
                  {participants.length === 0 ? (
                    <Text style={styles.participantEmpty}>Waiting for participants to join…</Text>
                  ) : (
                    participants.map((participant: SessionParticipant) => {
                      const isConnected = connectedParticipantIds.includes(participant.participant_id);
                      return (
                        <View key={participant.participant_id} style={styles.participantRow}>
                          <View style={styles.participantDetails}>
                            <Text style={styles.participantRoleLabel}>{participant.role === 'host' ? 'Host' : 'Guest'}</Text>
                            <Text style={styles.participantMeta}>{formatJoinedAt(participant.joined_at)}</Text>
                          </View>
                          <View style={[styles.participantBadge, isConnected ? styles.participantBadgeOnline : styles.participantBadgeOffline]}>
                            <Text style={styles.participantBadgeLabel}>{isConnected ? 'Connected' : 'Awaiting connection'}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.videoCard}>
            <View style={styles.sessionCardHeader}>
              <Text style={styles.sessionCardTitle}>Video chat</Text>
              <View style={[styles.connectionBadge, videoStatusStyle]}>
                <Text style={styles.connectionBadgeLabel}>{videoStatusLabel}</Text>
              </View>
            </View>
            <Text style={styles.sessionCardDescription}>
              Request a video call once both peers are connected. When accepted, your camera preview appears alongside the
              remote feed.
            </Text>
            <View style={videoPreviewRowStyle}>
              <View style={videoPaneStyle}>
                <Text style={styles.videoPaneLabel}>Remote</Text>
                {RTCViewComponent && remoteVideoUrl ? (
                  <RTCViewComponent streamURL={remoteVideoUrl} style={videoSurfaceStyle} objectFit="cover" />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Ionicons name="videocam-outline" size={28} color={COLORS.ice} />
                    <Text style={styles.videoPlaceholderText}>Waiting for remote video…</Text>
                  </View>
                )}
              </View>
              <View style={videoPaneStyle}>
                <Text style={styles.videoPaneLabel}>You</Text>
                {RTCViewComponent && localVideoUrl ? (
                  <RTCViewComponent streamURL={localVideoUrl} style={videoSurfaceStyle} objectFit="cover" mirror />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Ionicons name="person-circle-outline" size={28} color={COLORS.ice} />
                    <Text style={styles.videoPlaceholderText}>Camera preview</Text>
                  </View>
                )}
              </View>
            </View>
            {incomingCallFrom ? (
              <View style={styles.videoActionsRow}>
                <TouchableOpacity style={[styles.primaryButton, styles.videoAcceptButton]} onPress={acceptVideoChat}>
                  <Ionicons name="videocam" size={18} color={COLORS.midnight} />
                  <Text style={[styles.primaryButtonLabel, styles.videoAcceptLabel]}>Accept video</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.secondaryButton, styles.videoDeclineButton]} onPress={declineVideoChat}>
                  <Text style={styles.secondaryButtonLabel}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.videoActionsRow}>
                <TouchableOpacity
                  style={[styles.primaryButton, !videoReady && styles.primaryButtonDisabled]}
                  disabled={!videoReady}
                  onPress={callState === 'idle' ? requestVideoChat : endVideoChat}
                >
                  {callState === 'idle' ? (
                    <Ionicons name="videocam-outline" size={18} color={COLORS.midnight} />
                  ) : (
                    <Ionicons name="close" size={18} color={COLORS.midnight} />
                  )}
                  <Text style={[styles.primaryButtonLabel, !videoReady && styles.primaryButtonLabelDisabled]}>
                    {callState === 'idle'
                      ? videoReady
                        ? 'Request video chat'
                        : 'Waiting for connection…'
                      : callState === 'active'
                        ? 'End video'
                        : 'Cancel request'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {(callState === 'connecting' || callState === 'active') && (
              <View style={[styles.videoControlsRow, isCallFullscreen && styles.videoControlsRowFullscreen]}>
                <TouchableOpacity style={styles.videoIconButton} onPress={toggleCallFullscreen}>
                  <Ionicons
                    name={isCallFullscreen ? 'contract-outline' : 'expand-outline'}
                    size={18}
                    color={COLORS.midnight}
                  />
                  <Text style={styles.videoIconLabel}>{isCallFullscreen ? 'Exit full screen' : 'Full screen'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.videoIconButton, isLocalVideoMuted && styles.videoIconButtonMuted]}
                  onPress={toggleLocalVideo}
                >
                  <Ionicons
                    name={isLocalVideoMuted ? 'videocam-off' : 'videocam'}
                    size={18}
                    color={COLORS.midnight}
                  />
                  <Text style={styles.videoIconLabel}>{isLocalVideoMuted ? 'Camera off' : 'Camera on'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.videoIconButton, isLocalAudioMuted && styles.videoIconButtonMuted]}
                  onPress={toggleLocalAudio}
                >
                  <Ionicons
                    name={isLocalAudioMuted ? 'mic-off' : 'mic'}
                    size={18}
                    color={COLORS.midnight}
                  />
                  <Text style={styles.videoIconLabel}>{isLocalAudioMuted ? 'Mic muted' : 'Mic live'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.videoIconButton} onPress={flipCamera}>
                  <Ionicons name="camera-reverse-outline" size={18} color={COLORS.midnight} />
                  <Text style={styles.videoIconLabel}>Switch camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.videoIconButton, styles.videoEndButton]} onPress={endVideoChat}>
                  <Ionicons name="call" size={18} color={COLORS.ice} />
                  <Text style={[styles.videoIconLabel, styles.videoEndLabel]}>End call</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <KeyboardAvoidingView
            style={styles.chatCard}
            behavior={Platform.select({ ios: 'padding', android: undefined })}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 32 : 0}
          >
            <View style={styles.sessionCardHeader}>
              <Text style={styles.sessionCardTitle}>Messages</Text>
              <View style={[styles.connectionBadge, connectionBadgeStyle]}>
                <Text style={styles.connectionBadgeLabel}>{connectionBadgeLabel}</Text>
              </View>
            </View>
            <Text style={styles.sessionCardDescription}>
              Chat with your guest using the native realtime channel. Messages sync over the same WebRTC data channel used on the web.
            </Text>
            <View style={styles.chatListWrapper}>
              {messages.length === 0 ? (
                <View style={styles.chatEmptyState}>
                  <Text style={styles.chatEmptyText}>
                    {connected ? 'Say hello to get things started.' : 'Waiting for the realtime channel to connect…'}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.chatList}
                  contentContainerStyle={styles.chatListContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {messages.map(renderMessage)}
                </ScrollView>
              )}
            </View>
            {error ? <Text style={styles.chatError}>{error}</Text> : null}
            <View style={styles.chatComposerRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message…"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={draft}
                onChangeText={setDraft}
                editable={connected && !isReconnecting}
                multiline
              />
              <TouchableOpacity style={[styles.sendButton, !canSend && styles.sendButtonDisabled]} onPress={handleSendMessage} disabled={!canSend}>
                {canSend ? <Ionicons name="send" size={18} color={COLORS.midnight} /> : <Ionicons name="send" size={18} color="rgba(2,11,31,0.4)" />}
              </TouchableOpacity>
            </View>
            <Text style={styles.chatMetaLabel}>
              Data channel: {dataChannelState ?? '—'} · Socket: {socketReady ? 'connected' : 'offline'}
            </Text>
          </KeyboardAvoidingView>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const MainScreen: React.FC = () => {
  const webRtcAvailable = isWebRtcSupported();
  const [showForm, setShowForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(null);
  const [inAppSession, setInAppSession] = useState(false);
  const [joiningInApp, setJoiningInApp] = useState(false);
  const [inAppParticipantId, setInAppParticipantId] = useState<string | null>(null);
  const [participantRole, setParticipantRole] = useState<string | null>(null);
  const isInAppSessionActive = Boolean(tokenResponse && inAppSession);

  const handleReset = () => {
    setTokenResponse(null);
    setInAppSession(false);
    setInAppParticipantId(null);
    setJoiningInApp(false);
    setParticipantRole(null);
    setShowJoinForm(false);
  };

  const handleStartInApp = async () => {
    if (!tokenResponse || joiningInApp) {
      return;
    }
    if (!webRtcAvailable) {
      Alert.alert(
        'Development build required',
        'Expo Go does not include the WebRTC native module. Run “npx expo run:ios” or “npx expo run:android” to install the Expo dev build before launching sessions here, or use “On web”.'
      );
      return;
    }

    try {
      setJoiningInApp(true);
      const payload = await joinSession(tokenResponse.token, inAppParticipantId);
      setInAppParticipantId(payload.participant_id);
      setTokenResponse((prev: TokenResponse | null) => (prev ? { ...prev, token: payload.token || prev.token } : prev));
      setParticipantRole(payload.role ?? 'host');
      setInAppSession(true);
    } catch (error: any) {
      Alert.alert('Cannot start session', error?.message ?? 'Unexpected error while launching the in-app session.');
    } finally {
      setJoiningInApp(false);
    }
  };

  const renderContent = () => {
    if (tokenResponse && inAppSession) {
      if (!webRtcAvailable) {
        return (
          <LinearGradient
            colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sessionFallbackCard}
          >
            <Text style={styles.sessionFallbackTitle}>Development build required</Text>
            <Text style={styles.sessionFallbackBody}>
              Expo Go doesn’t ship the WebRTC native module. Install the Expo dev build (run “npx expo run:ios” or “npx expo
              run:android”) and relaunch the app to continue hosting sessions natively.
            </Text>
            <TouchableOpacity style={styles.resetButton} onPress={() => setInAppSession(false)}>
              <Text style={styles.resetButtonLabel}>Back to token</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sessionFallbackLink} onPress={() => void Linking.openURL(EXPO_DEV_BUILD_DOCS_URL)}>
              <Text style={styles.sessionFallbackLinkLabel}>View setup guide</Text>
            </TouchableOpacity>
          </LinearGradient>
        );
      }
      if (!inAppParticipantId || !participantRole) {
        return (
          <LinearGradient
            colors={[COLORS.glowSoft, COLORS.glowWarm, COLORS.glowSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sessionFallbackCard}
          >
            <Text style={styles.sessionFallbackTitle}>Session connection lost</Text>
            <Text style={styles.sessionFallbackBody}>
              We couldn't recover your participant link. Return to the token screen and try launching the in-app session again.
            </Text>
            <TouchableOpacity style={styles.resetButton} onPress={() => setInAppSession(false)}>
              <Text style={styles.resetButtonLabel}>Back to token</Text>
            </TouchableOpacity>
          </LinearGradient>
        );
      }

      return (
        <InAppSessionScreen
          token={tokenResponse}
          participantId={inAppParticipantId}
          participantRole={participantRole!}
          onExit={() => setInAppSession(false)}
        />
      );
    }

    if (tokenResponse) {
      return (
        <TokenResultCard
          token={tokenResponse}
          onReset={handleReset}
          onStartInApp={handleStartInApp}
          joiningInApp={joiningInApp}
          webRtcAvailable={webRtcAvailable}
        />
      );
    }

    return (
      <View style={styles.actionRow}>
        <BigActionButton
          title="Need token"
          description="Create a secure pass with custom duration."
          onPress={() => setShowForm(true)}
          background="rgba(8, 47, 112, 0.72)"
          icon={<Ionicons name="planet" size={42} color={COLORS.aurora} />}
        />
        <BigActionButton
          title="Got token"
          description="Enter a shared key to join an existing orbit."
          onPress={() => setShowJoinForm(true)}
          background="rgba(6, 36, 92, 0.78)"
          icon={<MaterialCommunityIcons name="shield-check" size={42} color={COLORS.aurora} />}
        />
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean, COLORS.lagoon]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.container, isInAppSessionActive && styles.containerInSession]}
    >
      <StatusBar style="light" />
      {!isInAppSessionActive && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Launch a ChatOrbit session</Text>
          <Text style={styles.headerSubtitle}>
            Generate a one-time secure token or prepare to join an existing session with a single tap.
          </Text>
        </View>
      )}
      {renderContent()}
        <NeedTokenForm
          visible={showForm && !tokenResponse}
          onClose={() => setShowForm(false)}
          onGenerated={(tokenData: TokenResponse) => {
            setShowForm(false);
            setTokenResponse(tokenData);
            setInAppParticipantId(null);
            setInAppSession(false);
            setJoiningInApp(false);
            setParticipantRole(null);
          }}
      />
        <JoinTokenForm
          visible={showJoinForm && !tokenResponse}
          onClose={() => setShowJoinForm(false)}
          onJoined={({ payload, token }: JoinTokenFormResult) => {
          setShowJoinForm(false);
          const now = Date.now();
          const ttlGuess = payload.session_expires_at && payload.session_started_at
            ? Math.max(
                0,
                Math.round(
                  (new Date(payload.session_expires_at).getTime() - new Date(payload.session_started_at).getTime()) / 1000
                )
              )
            : 3600;
          setTokenResponse({
            token: payload.token || token,
            validity_expires_at: payload.session_expires_at ?? payload.session_started_at ?? new Date(now + ttlGuess * 1000).toISOString(),
            session_ttl_seconds: ttlGuess,
            message_char_limit: payload.message_char_limit ?? DEFAULT_MESSAGE_CHAR_LIMIT,
            created_at: new Date().toISOString()
          });
          setInAppParticipantId(payload.participant_id);
          setParticipantRole(payload.role ?? 'guest');
          setInAppSession(true);
          setJoiningInApp(false);
        }}
          webRtcAvailable={webRtcAvailable}
      />
    </LinearGradient>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font
  });
  const [accepted, setAccepted] = useState(false);

  if (!fontsLoaded) {
    return (
      <LinearGradient
        colors={[COLORS.midnight, COLORS.deepBlue, COLORS.ocean, COLORS.lagoon]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.loadingContainer}
      >
        <StatusBar style="light" />
        <ActivityIndicator color={COLORS.mint} size="large" />
      </LinearGradient>
    );
  }

  if (!accepted) {
    return <AcceptScreen onAccept={() => setAccepted(true)} />;
  }

  return <MainScreen />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 64,
    paddingHorizontal: 24
  },
  containerInSession: {
    paddingTop: 24,
    paddingHorizontal: 12
  },
  termsCard: {
    borderRadius: 28,
    padding: 24,
    paddingTop: 48,
    width: '100%',
    maxWidth: 420,
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 12
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.ice,
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 1.2
  },
  termsScroll: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 83, 170, 0.2)'
  },
  termsContent: {
    padding: 16
  },
  termsText: {
    color: 'rgba(232, 244, 255, 0.92)',
    fontSize: 16,
    lineHeight: 24
  },
  acceptButton: {
    marginTop: 20,
    backgroundColor: COLORS.aurora,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center'
  },
  acceptButtonDisabled: {
    backgroundColor: 'rgba(111, 231, 255, 0.3)'
  },
  acceptButtonLabel: {
    color: COLORS.midnight,
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    width: '100%',
    maxWidth: 480,
    marginBottom: 24
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8
  },
  headerSubtitle: {
    color: 'rgba(244, 249, 255, 0.78)',
    fontSize: 16,
    lineHeight: 22
  },
  actionRow: {
    width: '100%',
    maxWidth: 520,
    gap: 16
  },
  bigActionButton: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    elevation: 8
  },
  bigActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79, 183, 255, 0.16)'
  },
  bigActionTextContainer: {
    flex: 1,
    marginLeft: 16
  },
  bigActionTitle: {
    color: COLORS.ice,
    fontSize: 22,
    fontWeight: '700'
  },
  bigActionDescription: {
    color: 'rgba(219, 237, 255, 0.76)',
    fontSize: 14,
    marginTop: 6
  },
  disabledClose: {
    opacity: 0.4
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start'
  },
  formSafeArea: {
    flex: 1,
    paddingHorizontal: 20
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 16
  },
  formTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700'
  },
  formCloseButton: {
    padding: 4
  },
  formContent: {
    paddingBottom: 32
  },
  formSubtitle: {
    color: 'rgba(224, 239, 255, 0.82)',
    marginBottom: 16,
    lineHeight: 20
  },
  pickerGroup: {
    marginBottom: 24
  },
  pickerLabel: {
    color: COLORS.ice,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12
  },
  pickerWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(9, 64, 140, 0.42)',
    height: 132
  },
  picker: {
    color: COLORS.aurora,
    width: '100%',
    height: '100%'
  },
  pickerItem: {
    color: COLORS.aurora,
    fontSize: 16,
    height: 132
  },
  generateButton: {
    marginTop: 16,
    backgroundColor: COLORS.lagoon,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center'
  },
  generateButtonDisabled: {
    opacity: 0.6
  },
  generateButtonLabel: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700'
  },
  resultCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.35,
    shadowRadius: 34,
    elevation: 12
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ice,
    marginBottom: 12
  },
  tokenText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.aurora,
    letterSpacing: 1.1,
    marginTop: 4
  },
  expiryText: {
    marginTop: 6,
    color: 'rgba(219, 237, 255, 0.78)',
    fontSize: 14
  },
  resultButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12
  },
  resultMeta: {
    marginTop: 8,
    color: 'rgba(219, 237, 255, 0.78)',
    fontSize: 14,
    lineHeight: 20
  },
  resultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 32, 80, 0.78)',
    borderRadius: 16,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.glowEdge
  },
  resultButtonLabel: {
    color: COLORS.ice,
    fontWeight: '700'
  },
  primaryResultButton: {
    backgroundColor: COLORS.aurora,
    alignSelf: 'stretch',
    borderColor: 'transparent'
  },
  primaryResultButtonLabel: {
    color: COLORS.midnight
  },
  primaryResultButtonDisabled: {
    opacity: 0.6
  },
  startSessionLabel: {
    marginTop: 20,
    color: COLORS.ice,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  sessionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12
  },
  webrtcNotice: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(239, 71, 111, 0.4)',
    backgroundColor: 'rgba(239, 71, 111, 0.1)',
    padding: 14,
    marginBottom: 12
  },
  webrtcNoticeContent: {
    flex: 1,
    gap: 8
  },
  webrtcNoticeText: {
    color: 'rgba(219, 237, 255, 0.9)',
    lineHeight: 18,
    fontSize: 13
  },
  webrtcNoticeLink: {
    alignSelf: 'flex-start'
  },
  webrtcNoticeLinkLabel: {
    color: COLORS.aurora,
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  resetButton: {
    marginTop: 24,
    alignItems: 'center'
  },
  resetButtonLabel: {
    color: COLORS.aurora,
    fontSize: 15,
    textDecorationLine: 'underline',
    fontWeight: '600'
  },
  inAppSessionContainer: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.35,
    shadowRadius: 34,
    elevation: 12,
    flex: 1,
    overflow: 'hidden'
  },
  inAppSessionSafeArea: {
    flex: 1
  },
  inAppHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  inAppBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(6, 36, 92, 0.64)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.glowEdge
  },
  inAppBackLabel: {
    color: COLORS.ice,
    fontWeight: '600'
  },
  inAppHeaderTextGroup: {
    flex: 1,
    marginLeft: 16
  },
  inAppTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ice
  },
  inAppSubtitle: {
    marginTop: 6,
    color: 'rgba(219, 237, 255, 0.78)',
    lineHeight: 20
  },
  sessionScroll: {
    flex: 1
  },
  sessionContent: {
    flexGrow: 1,
    paddingBottom: 28,
    gap: 18
  },
  sessionStatusCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.45)',
    backgroundColor: 'rgba(2, 11, 31, 0.78)',
    padding: 20,
    gap: 14
  },
  chatCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.38)',
    backgroundColor: 'rgba(6, 36, 92, 0.66)',
    padding: 20,
    flex: 1,
    gap: 12,
    minHeight: 320
  },
  videoCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.38)',
    backgroundColor: 'rgba(4, 23, 60, 0.72)',
    padding: 20,
    gap: 12
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  sessionCardTitle: {
    color: COLORS.ice,
    fontSize: 18,
    fontWeight: '700'
  },
  sessionCardDescription: {
    color: 'rgba(219, 237, 255, 0.78)',
    lineHeight: 20
  },
  chatListWrapper: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.2)',
    backgroundColor: 'rgba(2, 11, 31, 0.7)',
    padding: 12
  },
  chatList: {
    flex: 1
  },
  chatListContent: {
    gap: 12,
    paddingBottom: 12
  },
  chatEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24
  },
  chatEmptyText: {
    color: 'rgba(219, 237, 255, 0.75)',
    textAlign: 'center'
  },
  chatBubble: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(9, 30, 74, 0.72)'
  },
  chatBubbleSelf: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(136, 230, 255, 0.18)'
  },
  chatBubblePeer: {
    alignSelf: 'flex-start'
  },
  chatBubbleMeta: {
    color: 'rgba(219, 237, 255, 0.6)',
    fontSize: 12,
    marginBottom: 6
  },
  chatBubbleText: {
    color: COLORS.ice,
    lineHeight: 20
  },
  chatComposerRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end'
  },
  chatInput: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.ice,
    minHeight: 48,
    backgroundColor: 'rgba(2, 11, 31, 0.6)'
  },
  chatError: {
    color: COLORS.danger,
    fontWeight: '600'
  },
  videoPreviewRow: {
    flexDirection: 'row',
    gap: 12
  },
  videoPreviewRowFullscreen: {
    flexDirection: 'column'
  },
  videoPane: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.25)',
    overflow: 'hidden',
    backgroundColor: 'rgba(2, 11, 31, 0.6)'
  },
  videoPaneFullscreen: {
    width: '100%'
  },
  videoPaneLabel: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: 'rgba(219, 237, 255, 0.78)',
    fontWeight: '600'
  },
  videoSurface: {
    width: '100%',
    height: 180,
    backgroundColor: 'black'
  },
  videoSurfaceFullscreen: {
    height: 260
  },
  videoPlaceholder: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  videoPlaceholderText: {
    color: 'rgba(219, 237, 255, 0.7)'
  },
  videoActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    alignItems: 'center'
  },
  videoControlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12
  },
  videoControlsRowFullscreen: {
    justifyContent: 'space-between'
  },
  videoIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(136, 230, 255, 0.35)',
    backgroundColor: 'rgba(136, 230, 255, 0.18)'
  },
  videoIconButtonMuted: {
    backgroundColor: 'rgba(255, 209, 102, 0.15)',
    borderColor: 'rgba(255, 209, 102, 0.45)'
  },
  videoIconLabel: {
    color: COLORS.midnight,
    fontWeight: '700'
  },
  videoEndButton: {
    backgroundColor: 'rgba(239, 71, 111, 0.9)',
    borderColor: 'rgba(239, 71, 111, 0.9)'
  },
  videoEndLabel: {
    color: COLORS.ice
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.aurora,
    borderRadius: 14,
    flex: 1
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(111, 231, 255, 0.3)'
  },
  primaryButtonLabel: {
    color: COLORS.midnight,
    fontWeight: '700'
  },
  primaryButtonLabelDisabled: {
    color: 'rgba(2,11,31,0.5)'
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(219, 237, 255, 0.4)'
  },
  secondaryButtonLabel: {
    color: COLORS.ice,
    fontWeight: '600'
  },
  videoAcceptButton: {
    backgroundColor: COLORS.aurora
  },
  videoAcceptLabel: {
    color: COLORS.midnight
  },
  videoDeclineButton: {
    borderColor: 'rgba(239, 71, 111, 0.65)'
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.aurora,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(111, 231, 255, 0.3)'
  },
  connectivityBanner: {
    marginTop: 6,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  connectivityBadgeReady: {
    backgroundColor: 'rgba(111, 231, 255, 0.12)',
    borderColor: 'rgba(111, 231, 255, 0.6)'
  },
  connectivityBadgeLimited: {
    backgroundColor: 'rgba(255, 209, 102, 0.12)',
    borderColor: 'rgba(255, 209, 102, 0.6)'
  },
  connectivityBadgeWarning: {
    backgroundColor: 'rgba(239, 71, 111, 0.14)',
    borderColor: 'rgba(239, 71, 111, 0.55)'
  },
  connectivityBannerText: {
    flex: 1
  },
  connectivityBannerLabel: {
    color: COLORS.ice,
    fontWeight: '700'
  },
  connectivityBannerMessage: {
    color: 'rgba(219, 237, 255, 0.78)',
    fontSize: 12,
    marginTop: 2
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  statusPillIndicator: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.ice
  },
  statusPillLabel: {
    color: COLORS.midnight,
    fontWeight: '600',
    fontSize: 13
  },
  statusPillSuccess: {
    backgroundColor: COLORS.aurora
  },
  statusPillWaiting: {
    backgroundColor: '#FFD166'
  },
  statusPillInactive: {
    backgroundColor: 'rgba(219, 237, 255, 0.68)'
  },
  statusLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  statusLoadingLabel: {
    color: 'rgba(219, 237, 255, 0.82)',
    fontWeight: '600'
  },
  statusErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 71, 111, 0.16)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 71, 111, 0.32)'
  },
  statusErrorLabel: {
    color: COLORS.danger,
    flex: 1,
    fontWeight: '600'
  },
  statusMetricsContainer: {
    gap: 12
  },
  statusMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusMetricLabel: {
    color: 'rgba(219, 237, 255, 0.7)',
    fontWeight: '600'
  },
  statusMetricValue: {
    color: COLORS.ice,
    fontWeight: '600'
  },
  participantList: {
    marginTop: 12,
    gap: 12
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(4, 23, 60, 0.66)',
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.24)'
  },
  participantDetails: {
    flex: 1,
    marginRight: 12
  },
  participantRoleLabel: {
    color: COLORS.ice,
    fontWeight: '700'
  },
  participantMeta: {
    marginTop: 4,
    color: 'rgba(219, 237, 255, 0.68)',
    fontSize: 12
  },
  participantBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  participantBadgeOnline: {
    backgroundColor: 'rgba(136, 230, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(136, 230, 255, 0.5)'
  },
  participantBadgeOffline: {
    backgroundColor: 'rgba(255, 209, 102, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.4)'
  },
  participantBadgeLabel: {
    color: COLORS.ice,
    fontWeight: '600',
    fontSize: 12
  },
  participantEmpty: {
    color: 'rgba(219, 237, 255, 0.65)',
    fontStyle: 'italic'
  },
  chatMetaLabel: {
    color: 'rgba(219, 237, 255, 0.7)',
    fontWeight: '600'
  },
  connectionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1
  },
  connectionBadgeOnline: {
    borderColor: 'rgba(136, 230, 255, 0.6)',
    backgroundColor: 'rgba(136, 230, 255, 0.2)'
  },
  connectionBadgeReconnecting: {
    borderColor: 'rgba(255, 209, 102, 0.6)',
    backgroundColor: 'rgba(255, 209, 102, 0.2)'
  },
  connectionBadgeIdle: {
    borderColor: 'rgba(255, 108, 96, 0.4)',
    backgroundColor: 'rgba(255, 108, 96, 0.2)'
  },
  connectionBadgeLabel: {
    color: COLORS.ice,
    fontWeight: '600'
  },
  videoBadgeActive: {
    borderColor: 'rgba(136, 230, 255, 0.7)',
    backgroundColor: 'rgba(136, 230, 255, 0.18)'
  },
  videoBadgeIncoming: {
    borderColor: 'rgba(255, 209, 102, 0.65)',
    backgroundColor: 'rgba(255, 209, 102, 0.2)'
  },
  videoBadgePending: {
    borderColor: 'rgba(219, 237, 255, 0.4)',
    backgroundColor: 'rgba(219, 237, 255, 0.15)'
  },
  videoBadgeIdle: {
    borderColor: 'rgba(111, 214, 255, 0.25)',
    backgroundColor: 'rgba(111, 214, 255, 0.08)'
  },
  sessionFallbackCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    shadowColor: COLORS.cobaltShadow,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.35,
    shadowRadius: 34,
    elevation: 12,
    gap: 16
  },
  sessionFallbackTitle: {
    color: COLORS.ice,
    fontSize: 20,
    fontWeight: '700'
  },
  sessionFallbackBody: {
    color: 'rgba(219, 237, 255, 0.78)',
    lineHeight: 20
  },
  sessionFallbackLink: {
    alignItems: 'center'
  },
  sessionFallbackLinkLabel: {
    color: COLORS.aurora,
    fontWeight: '600',
    textDecorationLine: 'underline'
  },
  joinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  joinCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.glowEdge,
    padding: 24,
    gap: 16
  },
  joinHelper: {
    color: 'rgba(219, 237, 255, 0.78)',
    lineHeight: 20
  },
  joinInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 71, 111, 0.4)',
    backgroundColor: 'rgba(239, 71, 111, 0.12)',
    padding: 12,
    marginBottom: 4
  },
  joinInfoBannerText: {
    flex: 1,
    color: 'rgba(219, 237, 255, 0.85)',
    lineHeight: 18,
    fontSize: 13
  },
  joinInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(111, 214, 255, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: COLORS.ice,
    backgroundColor: 'rgba(2, 11, 31, 0.6)'
  },
  joinButton: {
    borderRadius: 18,
    backgroundColor: COLORS.aurora,
    paddingVertical: 14,
    alignItems: 'center'
  },
  joinButtonDisabled: {
    backgroundColor: 'rgba(111, 231, 255, 0.4)'
  },
  joinButtonLabel: {
    color: COLORS.midnight,
    fontWeight: '700'
  }
});
