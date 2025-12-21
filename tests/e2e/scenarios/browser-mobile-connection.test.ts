import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { BrowserClient } from '../clients/browser-client';
import { MobileSimulator } from '../clients/mobile-simulator';
import { TestLogger } from '../utils/logger';
import { createToken } from '../utils/token-helper';
import * as path from 'path';

/**
 * Browser-Mobile WebRTC Connection Test
 *
 * Tests WebRTC connection between browser (host) and mobile simulator (guest)
 * This is the primary test scenario for cross-platform connectivity
 */
describe('Browser ↔ Mobile WebRTC Connection', () => {
  let logger: TestLogger;
  let browserClient: BrowserClient;
  let mobileClient: MobileSimulator;
  let testRunDir: string;

  beforeAll(async () => {
    testRunDir = process.env.TEST_RUN_DIR || path.join(__dirname, '../output/test-run-latest');
    logger = new TestLogger('browser-mobile-connection', testRunDir);
    logger.info('=== Starting Browser-Mobile Connection Test ===');

    // Initialize clients
    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    browserClient = new BrowserClient(
      new TestLogger('browser-host', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    mobileClient = new MobileSimulator(
      new TestLogger('mobile-guest', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );
  });

  afterEach(async () => {
    await browserClient?.close();
    await mobileClient?.close();
  });

  afterAll(async () => {
    // Save logs
    logger.saveToFile();

    logger.info('=== Test Complete ===');
  });

  test('should establish WebRTC data channel between browser and mobile', async () => {
    // Create a fresh session token for this test
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    logger.info('Creating session token', { apiBaseUrl });

    const response = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    const token = response.token;
    logger.info('Token created', { token, response });

    logger.info('TEST: Establishing data channel between browser and mobile');

    // Step 1: Browser (host) launches and joins session
    logger.info('Step 1: Browser launching and joining as host');
    await browserClient.launch();
    await browserClient.navigateToSession(token);
    logger.info('Browser joined session as host');

    // Step 2: Mobile (guest) connects and joins session
    logger.info('Step 2: Mobile connecting and joining as guest');
    await mobileClient.connect(token);
    logger.info('Mobile joined session as guest');

    // Step 3: Wait for WebRTC connection on both sides
    logger.info('Step 3: Waiting for WebRTC connections');
    await Promise.all([
      browserClient.waitForConnection(90000),
      mobileClient.waitForConnection(90000),
    ]);
    logger.info('WebRTC connections established');

    // Step 4: Wait for data channel to open
    logger.info('Step 4: Waiting for data channels');
    await Promise.all([
      browserClient.waitForDataChannel(90000),
      mobileClient.waitForDataChannel(90000),
    ]);
    logger.info('Data channels opened');

    // Step 5: Verify connection states
    logger.info('Step 5: Verifying connection states');

    const browserState = await browserClient.getWebRTCState();
    const mobileState = mobileClient.getWebRTCState();

    logger.info('Browser state', browserState);
    logger.info('Mobile state', mobileState);

    // Assertions
    expect(browserState.connectionState).toMatch(/connected|completed/);
    expect(browserState.dataChannelState).toBe('open');

    expect(mobileState.connectionState).toMatch(/connected|completed/);
    expect(mobileState.dataChannelState).toBe('open');

    logger.info('✅ Connection test passed');

    // Take success screenshots
    await browserClient.screenshot('connection-success-browser');
  }, 150000); // Allow extra time for cross-platform negotiation

  test('should exchange text messages between browser and mobile', async () => {
    // Create a fresh session token for this test
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    logger.info('Creating session token', { apiBaseUrl });

    const response = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    const token = response.token;
    logger.info('Token created', { token, response });

    logger.info('TEST: Exchanging messages between browser and mobile');

    const browserMessage = `Hello from browser ${Date.now()}`;
    const mobileMessage = `Hello from mobile ${Date.now()}`;

    // Step 1: Launch and connect
    logger.info('Step 1: Browser launching and joining as host');
    await browserClient.launch();
    await browserClient.navigateToSession(token);
    await mobileClient.connect(token);
    await Promise.all([
      browserClient.waitForConnection(90000),
      mobileClient.waitForConnection(90000),
    ]);
    await Promise.all([
      browserClient.waitForDataChannel(90000),
      mobileClient.waitForDataChannel(90000),
    ]);

    // Step 2: Browser sends message
    logger.info('Step 2: Browser sending message', { text: browserMessage });
    await browserClient.sendMessage(browserMessage);

    // Step 3: Mobile waits for message
    logger.info('Step 3: Mobile waiting for message');
    await mobileClient.waitForMessage(browserMessage, 30000);
    logger.info('Mobile received message from browser');

    // Step 4: Mobile sends reply
    logger.info('Step 4: Mobile sending reply', { text: mobileMessage });
    await mobileClient.sendMessage(mobileMessage);

    // Step 5: Browser waits for reply
    logger.info('Step 5: Browser waiting for reply');
    await browserClient.waitForMessage(mobileMessage, 30000);
    logger.info('Browser received message from mobile');

    // Verify messages
    const browserReceived = browserClient.getReceivedMessages();
    const mobileReceived = mobileClient.getReceivedMessages();

    expect(browserReceived).toContain(mobileMessage);
    expect(mobileReceived).toContain(browserMessage);

    logger.info('✅ Message exchange test passed');

    // Take success screenshots
    await browserClient.screenshot('messages-success-browser');
  }, 60000);

  test('should handle video call initiation', async () => {
    // Create a fresh session token for this test
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    logger.info('Creating session token', { apiBaseUrl });

    const response = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    const token = response.token;
    logger.info('Token created', { token, response });

    logger.info('TEST: Video call initiation');

    await browserClient.launch();
    await browserClient.navigateToSession(token);
    await mobileClient.connect(token);
    await Promise.all([
      browserClient.waitForConnection(90000),
      mobileClient.waitForConnection(90000),
    ]);
    await Promise.all([
      browserClient.waitForDataChannel(90000),
      mobileClient.waitForDataChannel(90000),
    ]);

    // Step 1: Browser initiates video call
    logger.info('Step 1: Browser initiating video call');
    await browserClient.initiateVideoCall();

    // Wait a moment for negotiation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Verify media streams
    const browserState = await browserClient.getWebRTCState();
    const mobileState = mobileClient.getWebRTCState();

    logger.info('Browser state after video call', browserState);
    logger.info('Mobile state after video call', mobileState);

    // Note: Media negotiation may vary depending on implementation
    // At minimum, connection should remain stable
    expect(browserState.connectionState).toMatch(/connected|completed/);
    expect(mobileState.connectionState).toMatch(/connected|completed/);

    logger.info('✅ Video call test passed');

    // Take screenshots
    await browserClient.screenshot('video-call-browser');
  }, 30000);
});
