const env = typeof process !== 'undefined' && process.env ? process.env : undefined;

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

export const API_BASE_URL = stripTrailingSlash(
  readEnvValue('EXPO_PUBLIC_API_BASE_URL', 'NEXT_PUBLIC_API_BASE_URL', 'API_BASE_URL') ||
    'https://endpoints.chatorbit.com/api'
);

export const WS_BASE_URL = stripTrailingSlash(
  readEnvValue('EXPO_PUBLIC_WS_BASE_URL', 'NEXT_PUBLIC_WS_BASE_URL', 'WS_BASE_URL') ||
    'wss://endpoints.chatorbit.com'
);

export const MOBILE_CLIENT_IDENTITY = 'mobile-app-host';

export const DEFAULT_TERMS_TEXT = `Welcome to ChatOrbit!\n\nBefore generating secure session tokens, please take a moment to review these highlights:\n\n• Tokens are valid only for the duration selected during creation.\n• Share your token only with trusted participants.\n• Generated sessions may be monitored for quality and abuse prevention.\n• Using the token implies that you agree to abide by ChatOrbit community guidelines.\n\nThis preview app is designed for rapid testing of the ChatOrbit realtime experience. By continuing you acknowledge that:\n\n1. You are authorised to request access tokens on behalf of your organisation or team.\n2. All interactions facilitated by the token must respect local regulations regarding recorded communication.\n3. ChatOrbit may contact you for product feedback using the email or account associated with your workspace.\n4. Abuse of the system, including sharing illicit content, will result in automatic suspension of the workspace.\n\nScroll to the bottom of this message to enable the Accept button. Thank you for helping us keep the orbit safe and collaborative!`;

export const MAX_PARTICIPANTS = 2;
