/**
 * Environment Configuration
 *
 * Provides typed access to environment variables with fallbacks.
 * All environment variables should be prefixed with EXPO_PUBLIC_ to be
 * accessible in the client-side code.
 */

import Constants from 'expo-constants';

/**
 * Get environment variable with type checking
 * For Expo, environment variables are available via Constants.expoConfig.extra
 * or directly via process.env (after Metro bundler processes them)
 */
function getEnv(key: string, defaultValue?: string): string {
  // Try to get from process.env first (works after Metro bundler processes .env)
  // @ts-ignore - process.env is populated by Metro bundler
  let value = process.env[key];

  // Fallback to Constants.expoConfig.extra if available
  if (!value && Constants.expoConfig?.extra) {
    value = Constants.expoConfig.extra[key];
  }

  if (!value && !defaultValue) {
    console.warn(`Environment variable ${key} is not set and no default provided`);
    return '';
  }

  const finalValue = value || defaultValue || '';
  console.log(`[ENV] ${key} = ${finalValue}`);
  return finalValue;
}

/**
 * API Configuration
 */
export const API_CONFIG = {
  baseUrl: getEnv('EXPO_PUBLIC_API_BASE_URL', 'https://endpoints.chatorbit.com'),
  wsBaseUrl: getEnv('EXPO_PUBLIC_WS_BASE_URL', 'wss://endpoints.chatorbit.com'),
} as const;

/**
 * WebRTC Configuration
 */
export const WEBRTC_CONFIG = {
  stunUrls: getEnv('EXPO_PUBLIC_WEBRTC_STUN_URLS', 'stun:stun.l.google.com:19302')
    .split(',')
    .map(url => url.trim())
    .filter(Boolean),
  turnUrls: getEnv('EXPO_PUBLIC_WEBRTC_TURN_URLS', '')
    .split(',')
    .map(url => url.trim())
    .filter(Boolean),
  turnUsername: getEnv('EXPO_PUBLIC_WEBRTC_TURN_USER', ''),
  turnPassword: getEnv('EXPO_PUBLIC_WEBRTC_TURN_PASSWORD', ''),
} as const;

/**
 * Build ICE servers configuration from environment
 */
export function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];

  // Add STUN servers
  if (WEBRTC_CONFIG.stunUrls.length > 0) {
    servers.push({
      urls: WEBRTC_CONFIG.stunUrls,
    });
  }

  // Add TURN servers if configured
  if (WEBRTC_CONFIG.turnUrls.length > 0) {
    servers.push({
      urls: WEBRTC_CONFIG.turnUrls,
      username: WEBRTC_CONFIG.turnUsername,
      credential: WEBRTC_CONFIG.turnPassword,
    });
  }

  return servers;
}
