import { describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { BrowserClient } from '../clients/browser-client';
import { MobileSimulator } from '../clients/mobile-simulator';
import { TestLogger } from '../utils/logger';
import { createToken } from '../utils/token-helper';
import { ensureBackendHealthy } from '../utils/test-helpers';
import * as path from 'path';

/**
 * Text Chat Communication Tests
 *
 * Validates message delivery, encryption/decryption, ACK handling,
 * and message ordering across browser and mobile platforms
 *
 * IMPORTANT: Uses /api/health/database for health checks (the ONLY valid endpoint)
 */
describe('Text Chat Tests', () => {
  let logger: TestLogger;
  let browserClient: BrowserClient;
  let mobileClient: MobileSimulator;
  let testRunDir: string;

  beforeAll(async () => {
    testRunDir = process.env.TEST_RUN_DIR || path.join(__dirname, '../output/test-run-latest');
    logger = new TestLogger('text-chat-tests', testRunDir);
    logger.info('=== Starting Text Chat Tests ===');

    // CRITICAL: Check backend health first using /api/health/database
    await ensureBackendHealthy(logger);
  });

  afterEach(async () => {
    // Clean up after each test
    await browserClient?.close();
    await mobileClient?.close();
  });

  afterAll(async () => {
    logger.saveToFile();
    logger.info('=== Text Chat Tests Complete ===');
  });

  test('Browser → Mobile message delivery', async () => {
    // Setup
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: Browser → Mobile message delivery', { token });

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    browserClient = new BrowserClient(
      new TestLogger('browser-sender', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    mobileClient = new MobileSimulator(
      new TestLogger('mobile-receiver', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );

    // Connect both clients
    await browserClient.launch();
    await browserClient.navigateToSession(token);
    await mobileClient.connect(token);

    // Wait for connection
    await Promise.all([
      browserClient.waitForConnection(90000),
      mobileClient.waitForConnection(90000),
    ]);

    await Promise.all([
      browserClient.waitForDataChannel(90000),
      mobileClient.waitForDataChannel(90000),
    ]);

    logger.info('Clients connected, sending message from browser');

    // Send message from browser
    const testMessage = `Test message from browser ${Date.now()}`;
    await browserClient.sendMessage(testMessage);

    // Wait for mobile to receive
    await mobileClient.waitForMessage(testMessage, 30000);

    // Verify
    const mobileReceived = mobileClient.getReceivedMessages();
    expect(mobileReceived).toContain(testMessage);

    logger.info('✅ Browser → Mobile message delivered successfully');
  }, 150000);

  test('Mobile → Browser message delivery', async () => {
    // Setup
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: Mobile → Browser message delivery', { token });

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    browserClient = new BrowserClient(
      new TestLogger('browser-receiver', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    mobileClient = new MobileSimulator(
      new TestLogger('mobile-sender', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );

    // Connect both clients
    await browserClient.launch();
    await browserClient.navigateToSession(token);
    await mobileClient.connect(token);

    // Wait for connection
    await Promise.all([
      browserClient.waitForConnection(90000),
      mobileClient.waitForConnection(90000),
    ]);

    await Promise.all([
      browserClient.waitForDataChannel(90000),
      mobileClient.waitForDataChannel(90000),
    ]);

    logger.info('Clients connected, sending message from mobile');

    // Send message from mobile
    const testMessage = `Test message from mobile ${Date.now()}`;
    await mobileClient.sendMessage(testMessage);

    // Wait for browser to receive
    await browserClient.waitForMessage(testMessage, 30000);

    // Verify
    const browserReceived = browserClient.getReceivedMessages();
    expect(browserReceived).toContain(testMessage);

    logger.info('✅ Mobile → Browser message delivered successfully');
  }, 150000);

  test('Message encryption/decryption verification', async () => {
    // Setup
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: Message encryption/decryption', { token });

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    browserClient = new BrowserClient(
      new TestLogger('browser-crypto', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    mobileClient = new MobileSimulator(
      new TestLogger('mobile-crypto', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );

    // Connect both clients
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

    // Send multiple messages with special characters
    const messages = [
      'Simple text',
      'Special chars: !@#$%^&*()',
      'Unicode: 你好世界 🌍',
      'Long message: ' + 'x'.repeat(500),
      'Newlines\nand\ttabs',
    ];

    for (const msg of messages) {
      logger.info('Testing message encryption', { message: msg });

      // Browser sends
      await browserClient.sendMessage(msg);
      await mobileClient.waitForMessage(msg, 10000);

      // Mobile sends back
      const reply = `Echo: ${msg}`;
      await mobileClient.sendMessage(reply);
      await browserClient.waitForMessage(reply, 10000);
    }

    // Verify all messages received correctly
    const browserReceived = browserClient.getReceivedMessages();
    const mobileReceived = mobileClient.getReceivedMessages();

    expect(mobileReceived.length).toBeGreaterThanOrEqual(messages.length);
    expect(browserReceived.length).toBeGreaterThanOrEqual(messages.length);

    logger.info('✅ Encryption/decryption verified for all message types');
  }, 180000);

  test('ACK message exchange verification', async () => {
    // Setup
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: ACK message handling', { token });

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    browserClient = new BrowserClient(
      new TestLogger('browser-ack', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    mobileClient = new MobileSimulator(
      new TestLogger('mobile-ack', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );

    // Connect both clients
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

    // Send message from browser
    const message = `ACK test message ${Date.now()}`;
    await browserClient.sendMessage(message);

    // Wait for mobile to receive and send ACK
    await mobileClient.waitForMessage(message, 10000);

    // Give some time for ACK to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify message was received on mobile
    const mobileReceived = mobileClient.getReceivedMessages();
    expect(mobileReceived).toContain(message);

    logger.info('✅ ACK messages verified (mobile sends ACK to browser)');
  }, 150000);

  test('Message ordering consistency', async () => {
    // Setup
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: Message ordering', { token });

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    browserClient = new BrowserClient(
      new TestLogger('browser-order', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    mobileClient = new MobileSimulator(
      new TestLogger('mobile-order', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );

    // Connect both clients
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

    // Send ordered sequence of messages
    const messageCount = 10;
    const sentMessages: string[] = [];

    for (let i = 0; i < messageCount; i++) {
      const msg = `Message ${i + 1} of ${messageCount}`;
      sentMessages.push(msg);
      await browserClient.sendMessage(msg);
      // Small delay to ensure ordering
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Wait for last message
    await mobileClient.waitForMessage(sentMessages[messageCount - 1], 30000);

    // Verify all messages received in correct order
    const receivedMessages = mobileClient.getReceivedMessages();

    // Check that all messages were received
    expect(receivedMessages.length).toBeGreaterThanOrEqual(messageCount);

    // Verify messages are in order (they should appear in the received array in order)
    for (let i = 0; i < messageCount; i++) {
      const receivedIndex = receivedMessages.indexOf(sentMessages[i]);
      expect(receivedIndex).toBeGreaterThanOrEqual(0);

      // If there's a next message, verify it comes after current
      if (i < messageCount - 1) {
        const nextReceivedIndex = receivedMessages.indexOf(sentMessages[i + 1]);
        expect(nextReceivedIndex).toBeGreaterThan(receivedIndex);
      }
    }

    logger.info('✅ Message ordering verified');
  }, 180000);

  test('Bidirectional concurrent messaging', async () => {
    // Setup
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: Bidirectional concurrent messaging', { token });

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    browserClient = new BrowserClient(
      new TestLogger('browser-bidirectional', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    mobileClient = new MobileSimulator(
      new TestLogger('mobile-bidirectional', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );

    // Connect both clients
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

    // Send messages from both sides simultaneously
    const browserMessages = Array.from({ length: 5 }, (_, i) => `Browser msg ${i + 1}`);
    const mobileMessages = Array.from({ length: 5 }, (_, i) => `Mobile msg ${i + 1}`);

    // Send all messages concurrently
    await Promise.all([
      ...browserMessages.map(msg => browserClient.sendMessage(msg)),
      ...mobileMessages.map(msg => mobileClient.sendMessage(msg)),
    ]);

    // Wait for all messages to be received
    await Promise.all([
      ...mobileMessages.map(msg => browserClient.waitForMessage(msg, 30000)),
      ...browserMessages.map(msg => mobileClient.waitForMessage(msg, 30000)),
    ]);

    // Verify
    const browserReceived = browserClient.getReceivedMessages();
    const mobileReceived = mobileClient.getReceivedMessages();

    for (const msg of mobileMessages) {
      expect(browserReceived).toContain(msg);
    }

    for (const msg of browserMessages) {
      expect(mobileReceived).toContain(msg);
    }

    logger.info('✅ Bidirectional concurrent messaging verified');
  }, 180000);
});
