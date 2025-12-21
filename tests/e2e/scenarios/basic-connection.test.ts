import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { BrowserClient } from '../clients/browser-client';
import { TestLogger } from '../utils/logger';
import { createToken } from '../utils/token-helper';
import * as path from 'path';

/**
 * Basic WebRTC Connection Test
 *
 * Tests browser-to-browser WebRTC connection establishment
 * This is the simplest test - both host and guest are browsers
 */
describe('Basic WebRTC Connection (Browser ↔ Browser)', () => {
  let logger: TestLogger;
  let hostBrowser: BrowserClient;
  let guestBrowser: BrowserClient;
  let token: string;
  let testRunDir: string;

  beforeAll(async () => {
    testRunDir = process.env.TEST_RUN_DIR || path.join(__dirname, '../output/test-run-latest');
    logger = new TestLogger('basic-connection', testRunDir);
    logger.info('=== Starting Basic Connection Test ===');

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

    // Initialize browser clients
    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    hostBrowser = new BrowserClient(
      new TestLogger('host-browser', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    guestBrowser = new BrowserClient(
      new TestLogger('guest-browser', testRunDir),
      { headless, screenshotsPath, videosPath }
    );
  });

  afterAll(async () => {
    // Close browsers
    await hostBrowser?.close();
    await guestBrowser?.close();

    // Save logs
    logger.saveToFile();

    logger.info('=== Test Complete ===');
  });

  beforeEach(async () => {
    // Take screenshot before each test for debugging
    if (hostBrowser.isLaunched()) {
      await hostBrowser.screenshot('before-test');
    }
  });

  test('should establish WebRTC data channel between two browsers', async () => {
    logger.info('TEST: Establishing data channel');

    // Step 1: Launch host browser
    logger.info('Step 1: Launching host browser');
    await hostBrowser.launch();
    await hostBrowser.navigateToSession(token);
    logger.info('Host browser ready');

    // Step 2: Launch guest browser
    logger.info('Step 2: Launching guest browser');
    await guestBrowser.launch();
    await guestBrowser.navigateToSession(token);
    logger.info('Guest browser ready');

    // Step 3: Wait for WebRTC connection
    logger.info('Step 3: Waiting for WebRTC connection');
    await Promise.all([
      hostBrowser.waitForConnection(90000),
      guestBrowser.waitForConnection(90000),
    ]);
    logger.info('WebRTC connections established');

    // Step 4: Wait for data channel
    logger.info('Step 4: Waiting for data channel');
    await Promise.all([
      hostBrowser.waitForDataChannel(90000),
      guestBrowser.waitForDataChannel(90000),
    ]);
    logger.info('Data channels opened');

    // Step 5: Verify connection states
    logger.info('Step 5: Verifying connection states');

    const hostState = await hostBrowser.getWebRTCState();
    const guestState = await guestBrowser.getWebRTCState();

    logger.info('Host state', hostState);
    logger.info('Guest state', guestState);

    // Assertions
    expect(hostState.connectionState).toMatch(/connected|completed/);
    expect(hostState.dataChannelState).toBe('open');

    expect(guestState.connectionState).toMatch(/connected|completed/);
    expect(guestState.dataChannelState).toBe('open');

    logger.info('✅ Connection test passed');

    // Take success screenshot
    await hostBrowser.screenshot('connection-success-host');
    await guestBrowser.screenshot('connection-success-guest');
  }, 150000); // Allow extra time for negotiation and data channel

  test('should exchange text messages', async () => {
    logger.info('TEST: Exchanging messages');

    // Ensure browsers are still connected from previous test
    // If not, this test will be skipped or fail appropriately

    const hostMessage = `Hello from host ${Date.now()}`;
    const guestMessage = `Hello from guest ${Date.now()}`;

    // Step 1: Host sends message
    logger.info('Step 1: Host sending message', { text: hostMessage });
    await hostBrowser.sendMessage(hostMessage);

    // Step 2: Guest waits for message
    logger.info('Step 2: Guest waiting for message');
    await guestBrowser.waitForMessage(hostMessage, 10000);
    logger.info('Guest received message from host');

    // Step 3: Guest sends reply
    logger.info('Step 3: Guest sending reply', { text: guestMessage });
    await guestBrowser.sendMessage(guestMessage);

    // Step 4: Host waits for reply
    logger.info('Step 4: Host waiting for reply');
    await hostBrowser.waitForMessage(guestMessage, 10000);
    logger.info('Host received message from guest');

    // Verify messages
    const hostReceived = hostBrowser.getReceivedMessages();
    const guestReceived = guestBrowser.getReceivedMessages();

    expect(hostReceived).toContain(guestMessage);
    expect(guestReceived).toContain(hostMessage);

    logger.info('✅ Message exchange test passed');

    // Take success screenshot
    await hostBrowser.screenshot('messages-success-host');
    await guestBrowser.screenshot('messages-success-guest');
  }, 60000);
});
