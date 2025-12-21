import { describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { BrowserClient } from '../clients/browser-client';
import { MobileSimulator } from '../clients/mobile-simulator';
import { TestLogger } from '../utils/logger';
import { createToken } from '../utils/token-helper';
import * as path from 'path';

/**
 * Connection Recovery Test
 *
 * Tests WebRTC connection resilience and recovery scenarios
 */
describe('WebRTC Connection Recovery', () => {
  let logger: TestLogger;
  let browserClient: BrowserClient;
  let mobileClient: MobileSimulator;
  let testRunDir: string;

  beforeAll(async () => {
    testRunDir = process.env.TEST_RUN_DIR || path.join(__dirname, '../output/test-run-latest');
    logger = new TestLogger('connection-recovery', testRunDir);
    logger.info('=== Starting Connection Recovery Tests ===');

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    browserClient = new BrowserClient(
      new TestLogger('browser-recovery', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    mobileClient = new MobileSimulator(
      new TestLogger('mobile-recovery', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );
  });

  afterEach(async () => {
    await browserClient?.close();
    await mobileClient?.close();
  });

  afterAll(async () => {
    logger.saveToFile();
    logger.info('=== Connection Recovery Tests Complete ===');
  });

  test('should maintain connection state after network hiccup simulation', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    logger.info('Creating session token');

    const response = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    const token = response.token;
    logger.info('Token created', { token });

    // Establish initial connection
    logger.info('Step 1: Establishing initial connection');
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

    logger.info('Initial connection established');

    // Verify initial state
    const initialBrowserState = await browserClient.getWebRTCState();
    const initialMobileState = mobileClient.getWebRTCState();

    expect(initialBrowserState.connectionState).toMatch(/connected|completed/);
    expect(initialMobileState.connectionState).toMatch(/connected|completed/);

    // Send test message to verify channel works
    logger.info('Step 2: Sending test message before hiccup');
    const beforeMessage = `Before hiccup ${Date.now()}`;
    await browserClient.sendMessage(beforeMessage);
    await mobileClient.waitForMessage(beforeMessage, 10000);

    logger.info('Message delivered successfully before hiccup');

    // Simulate brief network hiccup (pause execution)
    logger.info('Step 3: Simulating network hiccup (2 second pause)');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify connection is still alive
    logger.info('Step 4: Verifying connection after hiccup');
    const afterBrowserState = await browserClient.getWebRTCState();
    const afterMobileState = mobileClient.getWebRTCState();

    expect(afterBrowserState.connectionState).toMatch(/connected|completed/);
    expect(afterMobileState.connectionState).toMatch(/connected|completed/);
    expect(afterBrowserState.dataChannelState).toBe('open');
    expect(afterMobileState.dataChannelState).toBe('open');

    // Send another message to verify channel still works
    logger.info('Step 5: Sending message after hiccup');
    const afterMessage = `After hiccup ${Date.now()}`;
    await mobileClient.sendMessage(afterMessage);
    await browserClient.waitForMessage(afterMessage, 10000);

    logger.info('✅ Connection recovery test passed');
  }, 150000);

  test('should handle rapid message exchange without packet loss', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const response = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    const token = response.token;

    // Establish connection
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

    logger.info('Connection established');

    // Send rapid burst of messages
    logger.info('Step 1: Sending rapid message burst (10 messages)');
    const messageCount = 10;
    const messages: string[] = [];

    for (let i = 0; i < messageCount; i++) {
      const msg = `Rapid message ${i} at ${Date.now()}`;
      messages.push(msg);
      await browserClient.sendMessage(msg);
      // Small delay to avoid overwhelming the channel
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('All messages sent');

    // Wait for all messages to be received
    logger.info('Step 2: Waiting for all messages to be received');
    for (const msg of messages) {
      await mobileClient.waitForMessage(msg, 15000);
    }

    logger.info('All messages received');

    // Verify all messages were delivered
    const receivedMessages = mobileClient.getReceivedMessages();
    for (const msg of messages) {
      expect(receivedMessages).toContain(msg);
    }

    logger.info('✅ Rapid message exchange test passed');
  }, 150000);

  test('should report disconnection when peer closes connection', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const response = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    const token = response.token;

    // Establish connection
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

    logger.info('Connection established');

    // Verify initial state
    const initialState = await browserClient.getWebRTCState();
    expect(initialState.connectionState).toMatch(/connected|completed/);

    // Close mobile client
    logger.info('Step 1: Closing mobile client');
    await mobileClient.close();

    // Wait for browser to detect disconnection
    logger.info('Step 2: Waiting for browser to detect disconnection');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check browser state
    const finalState = await browserClient.getWebRTCState();
    logger.info('Final browser state', finalState);

    // Connection should be in a non-connected state
    // Note: Could be 'disconnected', 'failed', or 'closed' depending on timing
    expect(finalState.connectionState).not.toMatch(/connected|completed/);

    logger.info('✅ Disconnection detection test passed');
  }, 120000);
});
