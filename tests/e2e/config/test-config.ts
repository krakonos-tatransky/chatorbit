/**
 * E2E Test Configuration
 *
 * Centralized configuration for all E2E tests
 */

export interface WebRTCConfig {
  stunUrls: string[];
  turnUrls?: string[];
  turnUsername?: string;
  turnPassword?: string;
}

export interface TimeoutConfig {
  connection: number;
  dataChannel: number;
  message: number;
  videoNegotiation: number;
  iceGathering: number;
  reconnection: number;
}

export interface TestConfig {
  backend: {
    apiBaseUrl: string;
    wsBaseUrl: string;
  };
  webrtc: WebRTCConfig;
  timeouts: TimeoutConfig;
  browser: {
    headless: boolean;
    slowMo: number;
    screenshotsPath: string;
    videosPath: string;
  };
  session: {
    validityPeriod: '1_day' | '1_week' | '1_month' | '1_year';
    ttlMinutes: number;
    messageCharLimit: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    saveToFile: boolean;
    outputDir: string;
  };
}

/**
 * Parse WebRTC configuration from environment variables
 */
function parseWebRTCConfig(): WebRTCConfig {
  const stunUrls = process.env.TEST_WEBRTC_STUN_URLS?.split(',').map(url => url.trim()) || [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
  ];

  const turnUrls = process.env.TEST_WEBRTC_TURN_URLS?.split(',').map(url => url.trim());
  const turnUsername = process.env.TEST_WEBRTC_TURN_USER;
  const turnPassword = process.env.TEST_WEBRTC_TURN_PASSWORD;

  return {
    stunUrls,
    turnUrls,
    turnUsername,
    turnPassword,
  };
}

/**
 * Parse timeout configuration from environment variables
 */
function parseTimeoutConfig(): TimeoutConfig {
  return {
    connection: parseInt(process.env.TEST_TIMEOUT_CONNECTION || '90000', 10),
    dataChannel: parseInt(process.env.TEST_TIMEOUT_DATACHANNEL || '90000', 10),
    message: parseInt(process.env.TEST_TIMEOUT_MESSAGE || '10000', 10),
    videoNegotiation: parseInt(process.env.TEST_TIMEOUT_VIDEO_NEGOTIATION || '5000', 10),
    iceGathering: parseInt(process.env.TEST_TIMEOUT_ICE_GATHERING || '30000', 10),
    reconnection: parseInt(process.env.TEST_TIMEOUT_RECONNECTION || '30000', 10),
  };
}

/**
 * Get test configuration
 */
export function getTestConfig(): TestConfig {
  const outputDir = process.env.TEST_RUN_DIR || `${__dirname}/../output/test-run-${Date.now()}`;

  return {
    backend: {
      apiBaseUrl: process.env.TEST_API_BASE_URL || 'http://localhost:50001',
      wsBaseUrl: process.env.TEST_WS_BASE_URL || 'ws://localhost:50001',
    },
    webrtc: parseWebRTCConfig(),
    timeouts: parseTimeoutConfig(),
    browser: {
      headless: process.env.TEST_HEADLESS === 'true',
      slowMo: parseInt(process.env.TEST_SLOW_MO || '0', 10),
      screenshotsPath: `${outputDir}/screenshots`,
      videosPath: `${outputDir}/videos`,
    },
    session: {
      validityPeriod: (process.env.TEST_SESSION_VALIDITY_PERIOD as any) || '1_day',
      ttlMinutes: parseInt(process.env.TEST_SESSION_TTL_MINUTES || '30', 10),
      messageCharLimit: parseInt(process.env.TEST_SESSION_MESSAGE_CHAR_LIMIT || '2000', 10),
    },
    logging: {
      level: (process.env.TEST_LOG_LEVEL as any) || 'debug',
      saveToFile: process.env.TEST_LOG_SAVE_TO_FILE !== 'false',
      outputDir,
    },
  };
}

/**
 * Validate test configuration
 */
export function validateTestConfig(config: TestConfig): void {
  // Validate backend URLs
  if (!config.backend.apiBaseUrl) {
    throw new Error('TEST_API_BASE_URL is required');
  }
  if (!config.backend.wsBaseUrl) {
    throw new Error('TEST_WS_BASE_URL is required');
  }

  // Validate WebRTC config
  if (config.webrtc.stunUrls.length === 0) {
    throw new Error('At least one STUN server is required');
  }

  // Validate timeouts
  if (config.timeouts.connection <= 0) {
    throw new Error('Connection timeout must be positive');
  }

  // Validate session config
  if (config.session.ttlMinutes <= 0) {
    throw new Error('Session TTL must be positive');
  }
  if (config.session.messageCharLimit < 200 || config.session.messageCharLimit > 16000) {
    throw new Error('Message char limit must be between 200 and 16000');
  }
}

/**
 * Default test configuration
 */
export const DEFAULT_TEST_CONFIG = getTestConfig();

/**
 * Validate on module load
 */
try {
  validateTestConfig(DEFAULT_TEST_CONFIG);
} catch (error) {
  console.error('Invalid test configuration:', error);
  throw error;
}
