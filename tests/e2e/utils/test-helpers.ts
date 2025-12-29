import { createToken, TokenParams, TokenResponse } from './token-helper';
import { TestLogger } from './logger';

/**
 * Test Helper Utilities
 *
 * Provides common utilities for WebRTC E2E tests
 */

// ============================================================================
// CRITICAL: Backend Health Check
// ============================================================================
// The ONLY valid health check endpoint is: /api/health/database
// Do NOT use /api/health or any other endpoint for health checks!
// ============================================================================

/**
 * Check if backend is running and healthy
 *
 * IMPORTANT: This is the ONLY valid health check endpoint: /api/health/database
 * Must be called before any test execution.
 *
 * @param apiBaseUrl - Base URL of the API (e.g., https://endpoints.chatorbit.com)
 * @param logger - Optional logger for output
 * @returns Promise<boolean> - true if backend is healthy
 * @throws Error if backend is not reachable or unhealthy
 */
export async function checkBackendHealth(
  apiBaseUrl: string,
  logger?: TestLogger
): Promise<boolean> {
  const healthUrl = `${apiBaseUrl}/api/health/database`;
  logger?.info(`Checking backend health at ${healthUrl}`);

  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Backend health check failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    logger?.info('Backend health check passed', data);
    return true;
  } catch (error) {
    const err = error as Error;
    logger?.error('Backend health check failed', err);
    throw new Error(
      `Backend is not available at ${healthUrl}. ` +
      `Error: ${err.message}. ` +
      `Make sure the backend is running and accessible.`
    );
  }
}

/**
 * Ensure backend is healthy before running tests
 * Call this at the start of each test suite
 */
export async function ensureBackendHealthy(logger?: TestLogger): Promise<void> {
  const apiBaseUrl = process.env.TEST_API_BASE_URL || 'http://localhost:50001';
  await checkBackendHealth(apiBaseUrl, logger);
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 30000,
  interval: number = 100,
  errorMessage: string = 'Timeout waiting for condition'
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await Promise.resolve(condition());
    if (result) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(errorMessage);
}

/**
 * Wait for connection with detailed logging
 */
export async function waitForConnection(
  client: any,
  timeout: number = 90000,
  logger?: TestLogger
): Promise<void> {
  logger?.info('Waiting for connection', { timeout });
  await client.waitForConnection(timeout);
  logger?.info('Connection established');
}

/**
 * Wait for DataChannel with detailed logging
 */
export async function waitForDataChannel(
  client: any,
  timeout: number = 90000,
  logger?: TestLogger
): Promise<void> {
  logger?.info('Waiting for DataChannel', { timeout });
  await client.waitForDataChannel(timeout);
  logger?.info('DataChannel opened');
}

/**
 * Create token with logging
 */
export async function createTestToken(
  apiBaseUrl: string,
  params?: TokenParams,
  logger?: TestLogger
): Promise<TokenResponse> {
  logger?.info('Creating session token', { apiBaseUrl, params });

  const response = await createToken(apiBaseUrl, params);

  logger?.info('Token created', {
    token: response.token,
    validity_expires_at: response.validity_expires_at,
    session_ttl_seconds: response.session_ttl_seconds,
  });

  return response;
}

/**
 * Verify message delivery
 */
export function verifyMessageDelivery(
  sentMessage: string,
  receivedMessages: string[],
  logger?: TestLogger
): void {
  logger?.info('Verifying message delivery', {
    sentMessage,
    receivedCount: receivedMessages.length,
  });

  if (!receivedMessages.includes(sentMessage)) {
    throw new Error(
      `Message not found in received messages. Sent: "${sentMessage}", Received: ${JSON.stringify(
        receivedMessages
      )}`
    );
  }

  logger?.info('Message delivery verified');
}

/**
 * Verify connection state
 */
export interface ConnectionState {
  connectionState: string;
  iceConnectionState: string;
  signalingState: string;
  dataChannelState: string;
}

export function verifyConnectionState(
  state: ConnectionState,
  expected: {
    connection?: string[];
    iceConnection?: string[];
    signaling?: string[];
    dataChannel?: string[];
  },
  logger?: TestLogger
): void {
  logger?.info('Verifying connection state', { state, expected });

  if (expected.connection && !expected.connection.includes(state.connectionState)) {
    throw new Error(
      `Unexpected connection state: ${state.connectionState}, expected one of: ${expected.connection.join(', ')}`
    );
  }

  if (expected.iceConnection && !expected.iceConnection.includes(state.iceConnectionState)) {
    throw new Error(
      `Unexpected ICE connection state: ${state.iceConnectionState}, expected one of: ${expected.iceConnection.join(', ')}`
    );
  }

  if (expected.signaling && !expected.signaling.includes(state.signalingState)) {
    throw new Error(
      `Unexpected signaling state: ${state.signalingState}, expected one of: ${expected.signaling.join(', ')}`
    );
  }

  if (expected.dataChannel && !expected.dataChannel.includes(state.dataChannelState)) {
    throw new Error(
      `Unexpected data channel state: ${state.dataChannelState}, expected one of: ${expected.dataChannel.join(', ')}`
    );
  }

  logger?.info('Connection state verified');
}

/**
 * Cleanup helper
 */
export async function cleanup(
  clients: Array<{ close: () => Promise<void> } | null | undefined>,
  logger?: TestLogger
): Promise<void> {
  logger?.info('Cleaning up clients', { count: clients.length });

  for (const client of clients) {
    if (client) {
      try {
        await client.close();
      } catch (error) {
        logger?.error('Error closing client', error as Error);
      }
    }
  }

  logger?.info('Cleanup complete');
}

/**
 * Generate unique test message
 */
export function generateTestMessage(prefix: string = 'Test message'): string {
  return `${prefix} ${Date.now()} ${Math.random().toString(36).substring(7)}`;
}

/**
 * Wait with logging
 */
export async function delay(ms: number, logger?: TestLogger, reason?: string): Promise<void> {
  logger?.info(`Waiting ${ms}ms${reason ? ` - ${reason}` : ''}`);
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    logger?: TestLogger;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    logger,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger?.info(`Attempt ${attempt}/${maxAttempts}`);
      return await operation();
    } catch (error) {
      lastError = error as Error;
      logger?.warn(`Attempt ${attempt} failed`, { error: lastError.message });

      if (attempt < maxAttempts) {
        logger?.info(`Retrying in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}

/**
 * Assert with custom error message
 */
export function assert(condition: boolean, message: string, logger?: TestLogger): void {
  if (!condition) {
    logger?.error('Assertion failed', { message });
    throw new Error(`Assertion failed: ${message}`);
  }
  logger?.debug('Assertion passed', { message });
}

/**
 * Measure execution time
 */
export async function measureTime<T>(
  operation: () => Promise<T>,
  logger?: TestLogger,
  label?: string
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;

  logger?.info(`${label || 'Operation'} completed in ${duration}ms`);

  return { result, duration };
}

/**
 * Verify WebRTC states are stable
 */
export function verifyStableConnection(state: ConnectionState, logger?: TestLogger): void {
  verifyConnectionState(
    state,
    {
      connection: ['connected', 'completed'],
      iceConnection: ['connected', 'completed'],
      signaling: ['stable'],
      dataChannel: ['open'],
    },
    logger
  );
}

/**
 * Wait for multiple clients to reach a state
 */
export async function waitForAllClients(
  operations: Array<() => Promise<void>>,
  logger?: TestLogger,
  description?: string
): Promise<void> {
  logger?.info(`Waiting for ${operations.length} clients${description ? ` - ${description}` : ''}`);

  await Promise.all(operations.map(op => op()));

  logger?.info('All clients ready');
}

/**
 * Exchange messages bidirectionally
 */
export async function exchangeMessages(
  clientA: any,
  clientB: any,
  messageA: string,
  messageB: string,
  logger?: TestLogger
): Promise<void> {
  logger?.info('Exchanging messages bidirectionally', { messageA, messageB });

  // A sends to B
  await clientA.sendMessage(messageA);
  await clientB.waitForMessage(messageA, 10000);

  // B sends to A
  await clientB.sendMessage(messageB);
  await clientA.waitForMessage(messageB, 10000);

  // Verify
  verifyMessageDelivery(messageA, clientB.getReceivedMessages(), logger);
  verifyMessageDelivery(messageB, clientA.getReceivedMessages(), logger);

  logger?.info('Message exchange complete');
}

/**
 * Test configuration defaults
 */
export const TEST_DEFAULTS = {
  CONNECTION_TIMEOUT: 90000,
  DATACHANNEL_TIMEOUT: 90000,
  MESSAGE_TIMEOUT: 10000,
  VIDEO_NEGOTIATION_TIMEOUT: 5000,
  TOKEN_VALIDITY: '1_day' as const,
  SESSION_TTL_MINUTES: 30,
  MESSAGE_CHAR_LIMIT: 2000,
};

/**
 * Get test environment config
 */
export interface TestEnvironment {
  apiBaseUrl: string;
  wsBaseUrl: string;
  headless: boolean;
  timeout: number;
  logLevel: string;
}

export function getTestEnvironment(): TestEnvironment {
  return {
    apiBaseUrl: process.env.TEST_API_BASE_URL || 'http://localhost:50001',
    wsBaseUrl: process.env.TEST_WS_BASE_URL || 'ws://localhost:50001',
    headless: process.env.TEST_HEADLESS === 'true',
    timeout: parseInt(process.env.TEST_TIMEOUT || '90000', 10),
    logLevel: process.env.TEST_LOG_LEVEL || 'debug',
  };
}
