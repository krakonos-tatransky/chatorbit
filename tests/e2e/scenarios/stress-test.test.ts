import { describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { BrowserClient } from '../clients/browser-client';
import { MobileSimulator } from '../clients/mobile-simulator';
import { TestLogger } from '../utils/logger';
import { createToken } from '../utils/token-helper';
import * as path from 'path';

/**
 * WebRTC Stress Tests
 *
 * Tests system behavior under load and edge cases
 */
describe('WebRTC Stress Tests', () => {
  let logger: TestLogger;
  let browserClient: BrowserClient;
  let mobileClient: MobileSimulator;
  let testRunDir: string;

  beforeAll(async () => {
    testRunDir = process.env.TEST_RUN_DIR || path.join(__dirname, '../output/test-run-latest');
    logger = new TestLogger('stress-test', testRunDir);
    logger.info('=== Starting Stress Tests ===');

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    browserClient = new BrowserClient(
      new TestLogger('browser-stress', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    mobileClient = new MobileSimulator(
      new TestLogger('mobile-stress', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );
  });

  afterEach(async () => {
    await browserClient?.close();
    await mobileClient?.close();
  });

  afterAll(async () => {
    logger.saveToFile();
    logger.info('=== Stress Tests Complete ===');
  });

  test('should handle large messages near character limit', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const response = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    const token = response.token;
    const characterLimit = 2000;

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

    // Create large message (90% of limit to avoid rejection)
    const messageSize = Math.floor(characterLimit * 0.9);
    const largeMessage = 'A'.repeat(messageSize) + ` timestamp:${Date.now()}`;

    logger.info('Step 1: Sending large message', { size: largeMessage.length });

    await browserClient.sendMessage(largeMessage);
    await mobileClient.waitForMessage(`timestamp:${Date.now().toString().slice(0, 8)}`, 15000);

    logger.info('Large message delivered successfully');

    // Verify message was received completely
    const receivedMessages = mobileClient.getReceivedMessages();
    const receivedLargeMessage = receivedMessages.find(msg => msg.includes('timestamp:'));

    expect(receivedLargeMessage).toBeDefined();
    expect(receivedLargeMessage!.length).toBeGreaterThan(messageSize * 0.95);

    logger.info('✅ Large message test passed');
  }, 150000);

  test('should handle bidirectional message flood', async () => {
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

    // Send messages bidirectionally
    const messageCount = 20;
    const browserMessages: string[] = [];
    const mobileMessages: string[] = [];

    logger.info(`Step 1: Sending ${messageCount} messages from each side`);

    // Send interleaved messages
    for (let i = 0; i < messageCount; i++) {
      const browserMsg = `Browser-${i}-${Date.now()}`;
      const mobileMsg = `Mobile-${i}-${Date.now()}`;

      browserMessages.push(browserMsg);
      mobileMessages.push(mobileMsg);

      // Send from both sides
      await Promise.all([
        browserClient.sendMessage(browserMsg),
        mobileClient.sendMessage(mobileMsg),
      ]);

      // Small delay between rounds
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    logger.info('All messages sent');

    // Wait for all messages to be received on both sides
    logger.info('Step 2: Waiting for all messages to be delivered');

    // Browser should receive all mobile messages
    for (const msg of mobileMessages) {
      await browserClient.waitForMessage(msg, 20000);
    }

    // Mobile should receive all browser messages
    for (const msg of browserMessages) {
      await mobileClient.waitForMessage(msg, 20000);
    }

    logger.info('All messages delivered');

    // Verify counts
    const browserReceived = browserClient.getReceivedMessages();
    const mobileReceived = mobileClient.getReceivedMessages();

    const browserReceivedCount = browserReceived.filter(msg => msg.startsWith('Mobile-')).length;
    const mobileReceivedCount = mobileReceived.filter(msg => msg.startsWith('Browser-')).length;

    expect(browserReceivedCount).toBe(messageCount);
    expect(mobileReceivedCount).toBe(messageCount);

    logger.info('✅ Bidirectional flood test passed', {
      browserReceived: browserReceivedCount,
      mobileReceived: mobileReceivedCount,
    });
  }, 180000);

  test('should maintain connection during sustained activity', async () => {
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

    // Sustain activity for 30 seconds
    const testDuration = 30000; // 30 seconds
    const interval = 1000; // Send every second
    const startTime = Date.now();
    let messagesSent = 0;

    logger.info(`Step 1: Sustaining activity for ${testDuration / 1000} seconds`);

    while (Date.now() - startTime < testDuration) {
      const msg = `Sustained-${messagesSent}-${Date.now()}`;
      await browserClient.sendMessage(msg);
      messagesSent++;

      await new Promise(resolve => setTimeout(resolve, interval));

      // Verify connection is still healthy every 5 messages
      if (messagesSent % 5 === 0) {
        const browserState = await browserClient.getWebRTCState();
        const mobileState = mobileClient.getWebRTCState();

        expect(browserState.connectionState).toMatch(/connected|completed/);
        expect(mobileState.connectionState).toMatch(/connected|completed/);
        expect(browserState.dataChannelState).toBe('open');
        expect(mobileState.dataChannelState).toBe('open');

        logger.info(`Health check at ${messagesSent} messages: connection healthy`);
      }
    }

    logger.info('Sustained activity complete', { messagesSent });

    // Final state check
    const finalBrowserState = await browserClient.getWebRTCState();
    const finalMobileState = mobileClient.getWebRTCState();

    expect(finalBrowserState.connectionState).toMatch(/connected|completed/);
    expect(finalMobileState.connectionState).toMatch(/connected|completed/);
    expect(finalBrowserState.dataChannelState).toBe('open');
    expect(finalMobileState.dataChannelState).toBe('open');

    logger.info('✅ Sustained activity test passed');
  }, 150000);

  test('should handle special characters and unicode in messages', async () => {
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

    // Test various special character sets
    const testMessages = [
      'Emoji test: 🚀 🎉 ✅ ❌ 🔧 📊',
      'Unicode: こんにちは 你好 مرحبا',
      'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
      'Newlines:\nLine 1\nLine 2\nLine 3',
      'Quotes: "double" \'single\' `backtick`',
      'JSON-like: {"key": "value", "nested": {"test": true}}',
    ];

    logger.info('Step 1: Sending messages with special characters');

    for (const msg of testMessages) {
      await browserClient.sendMessage(msg);
      // Use a unique substring for each message type
      const uniquePart = msg.split(':')[0];
      await mobileClient.waitForMessage(uniquePart, 10000);
      logger.info(`Delivered: ${uniquePart}`);
    }

    logger.info('All special character messages delivered');

    // Verify all messages were received
    const receivedMessages = mobileClient.getReceivedMessages();
    for (const msg of testMessages) {
      const uniquePart = msg.split(':')[0];
      const found = receivedMessages.some(received => received.includes(uniquePart));
      expect(found).toBe(true);
    }

    logger.info('✅ Special characters test passed');
  }, 120000);
});
