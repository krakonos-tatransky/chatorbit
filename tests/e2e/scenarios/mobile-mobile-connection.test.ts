import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { MobileSimulator } from '../clients/mobile-simulator';
import { TestLogger } from '../utils/logger';
import { createToken, getSessionStatus } from '../utils/token-helper';
import * as path from 'path';

/**
 * Mobile-to-Mobile WebRTC Connection Test
 *
 * Tests WebRTC connection establishment between two mobile simulators.
 * This simulates two mobile app clients connecting via the same token.
 *
 * Flow:
 * 1. Client A creates/gets a token and joins as host
 * 2. Client B uses the same token and joins as guest
 * 3. WebRTC connection is established
 * 4. Data channel is opened for messaging
 * 5. Messages are exchanged to verify the connection
 */
describe('Mobile-to-Mobile WebRTC Connection', () => {
  let logger: TestLogger;
  let hostMobile: MobileSimulator;
  let guestMobile: MobileSimulator;
  let token: string;
  let testRunDir: string;

  beforeAll(async () => {
    testRunDir = process.env.TEST_RUN_DIR || path.join(__dirname, '../output/test-run-latest');
    logger = new TestLogger('mobile-mobile-connection', testRunDir);
    logger.info('=== Starting Mobile-to-Mobile Connection Test ===');

    // Create session token
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    logger.info('Creating session token', { apiBaseUrl });

    const response = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    token = response.token;
    logger.info('Token created', { token, response });

    // Initialize mobile simulators
    hostMobile = new MobileSimulator(
      new TestLogger('host-mobile', testRunDir),
      { role: 'host', deviceName: 'iPhone-Host', autoConnect: true }
    );

    guestMobile = new MobileSimulator(
      new TestLogger('guest-mobile', testRunDir),
      { role: 'guest', deviceName: 'iPhone-Guest', autoConnect: true }
    );
  });

  afterAll(async () => {
    // Close mobile simulators
    await hostMobile?.close();
    await guestMobile?.close();

    // Save logs
    logger.saveToFile();

    logger.info('=== Test Complete ===');
  });

  test('should create token and verify session is issued', async () => {
    logger.info('TEST: Verify token creation');

    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const status = await getSessionStatus(apiBaseUrl, token);

    logger.info('Session status', status);

    expect(status.token).toBe(token);
    expect(status.status).toBe('issued');
    expect(status.participants).toHaveLength(0);

    logger.info('Token created and session is in issued state');
  }, 30000);

  test('should connect host mobile to session', async () => {
    logger.info('TEST: Host mobile connecting');

    await hostMobile.connect(token);

    expect(hostMobile.isConnected()).toBe(true);

    // Verify session now has host participant
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const status = await getSessionStatus(apiBaseUrl, token);

    logger.info('Session status after host join', status);

    expect(status.participants).toHaveLength(1);
    expect(status.participants[0].role).toBe('host');

    logger.info('Host mobile connected successfully');
  }, 30000);

  test('should connect guest mobile and activate session', async () => {
    logger.info('TEST: Guest mobile connecting');

    await guestMobile.connect(token);

    expect(guestMobile.isConnected()).toBe(true);

    // Verify session is now active with both participants
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const status = await getSessionStatus(apiBaseUrl, token);

    logger.info('Session status after guest join', status);

    expect(status.status).toBe('active');
    expect(status.participants).toHaveLength(2);

    const roles = status.participants.map(p => p.role).sort();
    expect(roles).toEqual(['guest', 'host']);

    logger.info('Guest mobile connected, session is now active');
  }, 30000);

  test('should establish WebRTC connection between mobile clients', async () => {
    logger.info('TEST: Establishing WebRTC connection');

    // Wait for both clients to establish WebRTC connection
    await Promise.all([
      hostMobile.waitForConnection(90000),
      guestMobile.waitForConnection(90000),
    ]);

    logger.info('WebRTC connections established');

    // Verify connection states
    const hostState = hostMobile.getWebRTCState();
    const guestState = guestMobile.getWebRTCState();

    logger.info('Host WebRTC state', hostState);
    logger.info('Guest WebRTC state', guestState);

    expect(hostState.connectionState).toMatch(/connected|completed/);
    expect(guestState.connectionState).toMatch(/connected|completed/);

    logger.info('WebRTC connection test passed');
  }, 120000);

  test('should open data channel between mobile clients', async () => {
    logger.info('TEST: Opening data channel');

    // Wait for data channels to open
    await Promise.all([
      hostMobile.waitForDataChannel(60000),
      guestMobile.waitForDataChannel(60000),
    ]);

    logger.info('Data channels opened');

    // Verify data channel states
    const hostState = hostMobile.getWebRTCState();
    const guestState = guestMobile.getWebRTCState();

    expect(hostState.dataChannelState).toBe('open');
    expect(guestState.dataChannelState).toBe('open');

    logger.info('Data channel test passed');
  }, 90000);

  test('should exchange messages between mobile clients', async () => {
    logger.info('TEST: Exchanging messages');

    const hostMessage = `Hello from host mobile ${Date.now()}`;
    const guestMessage = `Hello from guest mobile ${Date.now()}`;

    // Host sends message
    logger.info('Host sending message', { text: hostMessage });
    await hostMobile.sendMessage(hostMessage);

    // Guest waits for message
    logger.info('Guest waiting for message');
    await guestMobile.waitForMessage(hostMessage, 10000);
    logger.info('Guest received message from host');

    // Guest sends reply
    logger.info('Guest sending reply', { text: guestMessage });
    await guestMobile.sendMessage(guestMessage);

    // Host waits for reply
    logger.info('Host waiting for reply');
    await hostMobile.waitForMessage(guestMessage, 10000);
    logger.info('Host received message from guest');

    // Verify messages
    const hostReceived = hostMobile.getReceivedMessages();
    const guestReceived = guestMobile.getReceivedMessages();

    expect(hostReceived).toContain(guestMessage);
    expect(guestReceived).toContain(hostMessage);

    logger.info('Message exchange test passed');
  }, 60000);

  test('should verify session remains active after messaging', async () => {
    logger.info('TEST: Verify session status');

    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const status = await getSessionStatus(apiBaseUrl, token);

    logger.info('Final session status', status);

    expect(status.status).toBe('active');
    expect(status.remaining_seconds).toBeGreaterThan(0);

    logger.info('Session status verification passed');
  }, 30000);
});
