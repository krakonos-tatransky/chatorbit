import { describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { BrowserClient } from '../clients/browser-client';
import { MobileSimulator } from '../clients/mobile-simulator';
import { TestLogger } from '../utils/logger';
import { createToken } from '../utils/token-helper';
import { ensureBackendHealthy } from '../utils/test-helpers';
import * as path from 'path';

/**
 * Cross-Platform Compatibility Tests
 *
 * Validates communication between different platform combinations:
 * - Browser-to-Browser
 * - Mobile-to-Mobile
 * - Browser-to-Mobile
 * - Mobile-to-Browser
 * - Message format compatibility
 *
 * IMPORTANT: Uses /api/health/database for health checks (the ONLY valid endpoint)
 */
describe('Cross-Platform Compatibility Tests', () => {
  let logger: TestLogger;
  let testRunDir: string;

  beforeAll(async () => {
    testRunDir = process.env.TEST_RUN_DIR || path.join(__dirname, '../output/test-run-latest');
    logger = new TestLogger('cross-platform-tests', testRunDir);
    logger.info('=== Starting Cross-Platform Compatibility Tests ===');

    // CRITICAL: Check backend health first using /api/health/database
    await ensureBackendHealthy(logger);
  });

  afterAll(async () => {
    logger.saveToFile();
    logger.info('=== Cross-Platform Tests Complete ===');
  });

  test('Browser-to-Browser chat', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: Browser-to-Browser communication', { token });

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    const hostBrowser = new BrowserClient(
      new TestLogger('browser-host', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    const guestBrowser = new BrowserClient(
      new TestLogger('browser-guest', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    try {
      // Connect both browsers
      await hostBrowser.launch();
      await hostBrowser.navigateToSession(token);
      await guestBrowser.launch();
      await guestBrowser.navigateToSession(token);

      await Promise.all([
        hostBrowser.waitForConnection(90000),
        guestBrowser.waitForConnection(90000),
      ]);

      await Promise.all([
        hostBrowser.waitForDataChannel(90000),
        guestBrowser.waitForDataChannel(90000),
      ]);

      logger.info('Both browsers connected');

      // Exchange messages
      const hostMsg = `Host message ${Date.now()}`;
      const guestMsg = `Guest message ${Date.now()}`;

      await hostBrowser.sendMessage(hostMsg);
      await guestBrowser.waitForMessage(hostMsg, 10000);

      await guestBrowser.sendMessage(guestMsg);
      await hostBrowser.waitForMessage(guestMsg, 10000);

      // Verify
      const hostReceived = hostBrowser.getReceivedMessages();
      const guestReceived = guestBrowser.getReceivedMessages();

      expect(hostReceived).toContain(guestMsg);
      expect(guestReceived).toContain(hostMsg);

      logger.info('✅ Browser-to-Browser communication verified');
    } finally {
      await hostBrowser.close();
      await guestBrowser.close();
    }
  }, 180000);

  test('Mobile-to-Mobile chat', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: Mobile-to-Mobile communication', { token });

    const hostMobile = new MobileSimulator(
      new TestLogger('mobile-host', testRunDir),
      { role: 'host', deviceName: 'TestMobile1' }
    );

    const guestMobile = new MobileSimulator(
      new TestLogger('mobile-guest', testRunDir),
      { role: 'guest', deviceName: 'TestMobile2' }
    );

    try {
      // Connect both mobile clients
      await hostMobile.connect(token);
      await guestMobile.connect(token);

      await Promise.all([
        hostMobile.waitForConnection(90000),
        guestMobile.waitForConnection(90000),
      ]);

      await Promise.all([
        hostMobile.waitForDataChannel(90000),
        guestMobile.waitForDataChannel(90000),
      ]);

      logger.info('Both mobile clients connected');

      // Exchange messages
      const hostMsg = `Mobile host message ${Date.now()}`;
      const guestMsg = `Mobile guest message ${Date.now()}`;

      await hostMobile.sendMessage(hostMsg);
      await guestMobile.waitForMessage(hostMsg, 10000);

      await guestMobile.sendMessage(guestMsg);
      await hostMobile.waitForMessage(guestMsg, 10000);

      // Verify
      const hostReceived = hostMobile.getReceivedMessages();
      const guestReceived = guestMobile.getReceivedMessages();

      expect(hostReceived).toContain(guestMsg);
      expect(guestReceived).toContain(hostMsg);

      logger.info('✅ Mobile-to-Mobile communication verified');
    } finally {
      await hostMobile.close();
      await guestMobile.close();
    }
  }, 180000);

  test('Browser-to-Mobile chat (Browser as Host)', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: Browser (host) to Mobile (guest)', { token });

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    const browserHost = new BrowserClient(
      new TestLogger('browser-host-cross', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    const mobileGuest = new MobileSimulator(
      new TestLogger('mobile-guest-cross', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );

    try {
      // Connect
      await browserHost.launch();
      await browserHost.navigateToSession(token);
      await mobileGuest.connect(token);

      await Promise.all([
        browserHost.waitForConnection(90000),
        mobileGuest.waitForConnection(90000),
      ]);

      await Promise.all([
        browserHost.waitForDataChannel(90000),
        mobileGuest.waitForDataChannel(90000),
      ]);

      // Exchange messages
      const browserMsg = `Browser host message ${Date.now()}`;
      const mobileMsg = `Mobile guest message ${Date.now()}`;

      await browserHost.sendMessage(browserMsg);
      await mobileGuest.waitForMessage(browserMsg, 10000);

      await mobileGuest.sendMessage(mobileMsg);
      await browserHost.waitForMessage(mobileMsg, 10000);

      // Verify
      const browserReceived = browserHost.getReceivedMessages();
      const mobileReceived = mobileGuest.getReceivedMessages();

      expect(browserReceived).toContain(mobileMsg);
      expect(mobileReceived).toContain(browserMsg);

      logger.info('✅ Browser-to-Mobile (Browser as host) verified');
    } finally {
      await browserHost.close();
      await mobileGuest.close();
    }
  }, 180000);

  test('Mobile-to-Browser chat (Mobile as Host)', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: Mobile (host) to Browser (guest)', { token });

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    const mobileHost = new MobileSimulator(
      new TestLogger('mobile-host-cross', testRunDir),
      { role: 'host', deviceName: 'TestMobile' }
    );

    const browserGuest = new BrowserClient(
      new TestLogger('browser-guest-cross', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    try {
      // Mobile connects first as host
      await mobileHost.connect(token);
      await mobileHost.waitForConnection(90000);

      // Browser connects as guest
      await browserGuest.launch();
      await browserGuest.navigateToSession(token);
      await browserGuest.waitForConnection(90000);

      // Wait for data channels
      await Promise.all([
        mobileHost.waitForDataChannel(90000),
        browserGuest.waitForDataChannel(90000),
      ]);

      // Exchange messages
      const mobileMsg = `Mobile host message ${Date.now()}`;
      const browserMsg = `Browser guest message ${Date.now()}`;

      await mobileHost.sendMessage(mobileMsg);
      await browserGuest.waitForMessage(mobileMsg, 10000);

      await browserGuest.sendMessage(browserMsg);
      await mobileHost.waitForMessage(browserMsg, 10000);

      // Verify
      const mobileReceived = mobileHost.getReceivedMessages();
      const browserReceived = browserGuest.getReceivedMessages();

      expect(mobileReceived).toContain(browserMsg);
      expect(browserReceived).toContain(mobileMsg);

      logger.info('✅ Mobile-to-Browser (Mobile as host) verified');
    } finally {
      await mobileHost.close();
      await browserGuest.close();
    }
  }, 180000);

  test('Message format compatibility (Browser ↔ Mobile)', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: Message format compatibility', { token });

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    const browser = new BrowserClient(
      new TestLogger('browser-format', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    const mobile = new MobileSimulator(
      new TestLogger('mobile-format', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );

    try {
      // Connect
      await browser.launch();
      await browser.navigateToSession(token);
      await mobile.connect(token);

      await Promise.all([
        browser.waitForConnection(90000),
        mobile.waitForConnection(90000),
      ]);

      await Promise.all([
        browser.waitForDataChannel(90000),
        mobile.waitForDataChannel(90000),
      ]);

      logger.info('Testing various message formats');

      // Test different message types
      const testCases = [
        { desc: 'ASCII text', msg: 'Hello World' },
        { desc: 'Unicode', msg: '你好 🌍 Привет' },
        { desc: 'Special chars', msg: '!@#$%^&*()_+-=[]{}|;:,.<>?' },
        { desc: 'Newlines', msg: 'Line 1\nLine 2\nLine 3' },
        { desc: 'Tabs', msg: 'Col1\tCol2\tCol3' },
        { desc: 'Long text', msg: 'x'.repeat(500) },
        { desc: 'JSON-like', msg: '{"key":"value","num":123}' },
      ];

      for (const testCase of testCases) {
        logger.info(`Testing: ${testCase.desc}`, { message: testCase.msg });

        // Browser → Mobile
        await browser.sendMessage(testCase.msg);
        await mobile.waitForMessage(testCase.msg, 10000);

        // Mobile → Browser
        const reply = `Reply: ${testCase.msg}`;
        await mobile.sendMessage(reply);
        await browser.waitForMessage(reply, 10000);
      }

      // Verify all messages received
      const browserReceived = browser.getReceivedMessages();
      const mobileReceived = mobile.getReceivedMessages();

      expect(browserReceived.length).toBeGreaterThanOrEqual(testCases.length);
      expect(mobileReceived.length).toBeGreaterThanOrEqual(testCases.length);

      logger.info('✅ Message format compatibility verified');
    } finally {
      await browser.close();
      await mobile.close();
    }
  }, 180000);

  test('ICE candidate format compatibility', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: ICE candidate format compatibility (camelCase vs kebab-case)', { token });

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    const browser = new BrowserClient(
      new TestLogger('browser-ice-format', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    const mobile = new MobileSimulator(
      new TestLogger('mobile-ice-format', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );

    try {
      // Connect - this will trigger ICE candidate exchange
      await browser.launch();
      await browser.navigateToSession(token);
      await mobile.connect(token);

      // Wait for ICE candidates to be exchanged
      await Promise.all([
        browser.waitForConnection(90000),
        mobile.waitForConnection(90000),
      ]);

      // Verify connection is established (means ICE candidates were compatible)
      const browserState = await browser.getWebRTCState();
      const mobileState = mobile.getWebRTCState();

      logger.info('Connection states after ICE exchange', {
        browser: browserState,
        mobile: mobileState,
      });

      // Browser sends "iceCandidate" (camelCase)
      // Mobile sends "ice-candidate" (kebab-case)
      // Both should accept both formats

      expect(['connected', 'completed']).toContain(browserState.iceConnectionState);
      expect(['connected', 'completed']).toContain(mobileState.iceConnectionState);

      logger.info('✅ ICE candidate format compatibility verified');
    } finally {
      await browser.close();
      await mobile.close();
    }
  }, 180000);

  test('Video call protocol compatibility', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const { token } = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    logger.info('TEST: Video call protocol compatibility', { token });

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    const browser = new BrowserClient(
      new TestLogger('browser-video-protocol', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    const mobile = new MobileSimulator(
      new TestLogger('mobile-video-protocol', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );

    try {
      // Establish text chat
      await browser.launch();
      await browser.navigateToSession(token);
      await mobile.connect(token);

      await Promise.all([
        browser.waitForConnection(90000),
        mobile.waitForConnection(90000),
      ]);

      await Promise.all([
        browser.waitForDataChannel(90000),
        mobile.waitForDataChannel(90000),
      ]);

      // Browser initiates video call
      // Protocol: { type: 'call', action: 'request', from: participantId }
      await browser.initiateVideoCall();

      // Wait for renegotiation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify connection remains stable
      const browserState = await browser.getWebRTCState();
      const mobileState = mobile.getWebRTCState();

      expect(browserState.connectionState).toMatch(/connected|completed/);
      expect(mobileState.connectionState).toMatch(/connected|completed/);

      // Test text messaging during video
      const testMsg = `Text during video ${Date.now()}`;
      await browser.sendMessage(testMsg);
      await mobile.waitForMessage(testMsg, 10000);

      logger.info('✅ Video call protocol compatibility verified');
    } finally {
      await browser.close();
      await mobile.close();
    }
  }, 180000);
});
