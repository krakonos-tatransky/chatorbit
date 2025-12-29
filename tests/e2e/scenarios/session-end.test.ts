import { describe, test, expect, beforeAll, afterEach, afterAll } from '@jest/globals';
import { BrowserClient } from '../clients/browser-client';
import { MobileSimulator } from '../clients/mobile-simulator';
import { TestLogger } from '../utils/logger';
import { createToken } from '../utils/token-helper';
import * as path from 'path';

/**
 * Session End Notification Tests
 *
 * Tests that when one participant ends a session, the other participant
 * is properly notified via WebSocket (session_deleted message).
 *
 * Scenarios:
 * - B2B: Browser ends → Browser notified
 * - B2M: Browser ends → Mobile notified (and vice versa)
 * - M2M: Mobile ends → Mobile notified
 */
describe('Session End Notifications', () => {
  let logger: TestLogger;
  let testRunDir: string;

  beforeAll(async () => {
    testRunDir = process.env.TEST_RUN_DIR || path.join(__dirname, '../output/test-run-latest');
    logger = new TestLogger('session-end', testRunDir);
    logger.info('=== Starting Session End Notification Tests ===');
  });

  afterAll(async () => {
    logger.saveToFile();
    logger.info('=== Session End Tests Complete ===');
  });

  describe('Browser-to-Browser (B2B)', () => {
    let browserHost: BrowserClient;
    let browserGuest: BrowserClient;

    afterEach(async () => {
      await browserHost?.close();
      await browserGuest?.close();
    });

    test('should notify guest browser when host browser ends session', async () => {
      const headless = process.env.TEST_HEADLESS === 'true';
      const screenshotsPath = path.join(testRunDir, 'screenshots');
      const videosPath = path.join(testRunDir, 'videos');

      browserHost = new BrowserClient(
        new TestLogger('browser-host-b2b', testRunDir),
        { headless, screenshotsPath, videosPath }
      );

      browserGuest = new BrowserClient(
        new TestLogger('browser-guest-b2b', testRunDir),
        { headless, screenshotsPath, videosPath }
      );

      // Create session token
      const apiBaseUrl = process.env.TEST_API_BASE_URL!;
      logger.info('Creating session token for B2B test', { apiBaseUrl });

      const response = await createToken(apiBaseUrl, {
        validity_period: '1_day',
        session_ttl_minutes: 30,
        message_char_limit: 2000,
      });
      const token = response.token;
      logger.info('Token created', { token });

      // Step 1: Both browsers join session
      logger.info('Step 1: Both browsers joining session');
      await browserHost.launch();
      await browserHost.navigateToSession(token);

      await browserGuest.launch();
      await browserGuest.navigateToSession(token);

      // Step 2: Wait for WebRTC connections
      logger.info('Step 2: Waiting for WebRTC connections');
      await Promise.all([
        browserHost.waitForConnection(90000),
        browserGuest.waitForConnection(90000),
      ]);
      await Promise.all([
        browserHost.waitForDataChannel(90000),
        browserGuest.waitForDataChannel(90000),
      ]);
      logger.info('Both browsers connected');

      // Verify both are connected
      const hostState = await browserHost.getWebRTCState();
      const guestState = await browserGuest.getWebRTCState();
      expect(hostState.connectionState).toMatch(/connected|completed/);
      expect(guestState.connectionState).toMatch(/connected|completed/);

      // Step 3: Host ends session
      logger.info('Step 3: Host browser ending session');
      await browserHost.endSession();

      // Step 4: Guest should receive notification and show session ended
      logger.info('Step 4: Waiting for guest to receive session end notification');
      await browserGuest.waitForSessionEnded(15000);

      // Verify guest sees session ended
      const guestSessionEnded = await browserGuest.isSessionEnded();
      expect(guestSessionEnded).toBe(true);

      logger.info('✅ B2B session end test passed - guest notified when host ends session');
      await browserGuest.screenshot('b2b-session-ended-guest');
    }, 120000);
  });

  describe('Browser-to-Mobile (B2M)', () => {
    let browserClient: BrowserClient;
    let mobileClient: MobileSimulator;

    afterEach(async () => {
      await browserClient?.close();
      await mobileClient?.close();
    });

    test('should notify mobile when browser ends session', async () => {
      const headless = process.env.TEST_HEADLESS === 'true';
      const screenshotsPath = path.join(testRunDir, 'screenshots');
      const videosPath = path.join(testRunDir, 'videos');

      browserClient = new BrowserClient(
        new TestLogger('browser-host-b2m', testRunDir),
        { headless, screenshotsPath, videosPath }
      );

      mobileClient = new MobileSimulator(
        new TestLogger('mobile-guest-b2m', testRunDir),
        { role: 'guest', deviceName: 'TestMobile-B2M' }
      );

      // Create session token
      const apiBaseUrl = process.env.TEST_API_BASE_URL!;
      logger.info('Creating session token for B2M test (browser ends)', { apiBaseUrl });

      const response = await createToken(apiBaseUrl, {
        validity_period: '1_day',
        session_ttl_minutes: 30,
        message_char_limit: 2000,
      });
      const token = response.token;
      logger.info('Token created', { token });

      // Step 1: Browser joins as host, mobile joins as guest
      logger.info('Step 1: Browser and mobile joining session');
      await browserClient.launch();
      await browserClient.navigateToSession(token);
      await mobileClient.connect(token);

      // Step 2: Wait for WebRTC connections
      logger.info('Step 2: Waiting for WebRTC connections');
      await Promise.all([
        browserClient.waitForConnection(90000),
        mobileClient.waitForConnection(90000),
      ]);
      await Promise.all([
        browserClient.waitForDataChannel(90000),
        mobileClient.waitForDataChannel(90000),
      ]);
      logger.info('Browser and mobile connected');

      // Verify both are connected
      const browserState = await browserClient.getWebRTCState();
      const mobileState = mobileClient.getWebRTCState();
      expect(browserState.connectionState).toMatch(/connected|completed/);
      expect(mobileState.connectionState).toMatch(/connected|completed/);

      // Step 3: Browser ends session
      logger.info('Step 3: Browser ending session');
      await browserClient.endSession();

      // Step 4: Mobile should receive notification
      logger.info('Step 4: Waiting for mobile to receive session end notification');
      await mobileClient.waitForSessionEnded(15000);

      // Verify mobile received the notification
      expect(mobileClient.isSessionEnded()).toBe(true);
      logger.info('Mobile session ended reason:', { reason: mobileClient.getSessionEndedReason() });

      logger.info('✅ B2M session end test passed - mobile notified when browser ends session');
    }, 120000);

    test('should notify browser when mobile ends session', async () => {
      const headless = process.env.TEST_HEADLESS === 'true';
      const screenshotsPath = path.join(testRunDir, 'screenshots');
      const videosPath = path.join(testRunDir, 'videos');

      browserClient = new BrowserClient(
        new TestLogger('browser-host-m2b', testRunDir),
        { headless, screenshotsPath, videosPath }
      );

      mobileClient = new MobileSimulator(
        new TestLogger('mobile-guest-m2b', testRunDir),
        { role: 'guest', deviceName: 'TestMobile-M2B' }
      );

      // Create session token
      const apiBaseUrl = process.env.TEST_API_BASE_URL!;
      logger.info('Creating session token for B2M test (mobile ends)', { apiBaseUrl });

      const response = await createToken(apiBaseUrl, {
        validity_period: '1_day',
        session_ttl_minutes: 30,
        message_char_limit: 2000,
      });
      const token = response.token;
      logger.info('Token created', { token });

      // Step 1: Browser joins as host, mobile joins as guest
      logger.info('Step 1: Browser and mobile joining session');
      await browserClient.launch();
      await browserClient.navigateToSession(token);
      await mobileClient.connect(token);

      // Step 2: Wait for WebRTC connections
      logger.info('Step 2: Waiting for WebRTC connections');
      await Promise.all([
        browserClient.waitForConnection(90000),
        mobileClient.waitForConnection(90000),
      ]);
      await Promise.all([
        browserClient.waitForDataChannel(90000),
        mobileClient.waitForDataChannel(90000),
      ]);
      logger.info('Browser and mobile connected');

      // Verify both are connected
      const browserState = await browserClient.getWebRTCState();
      const mobileState = mobileClient.getWebRTCState();
      expect(browserState.connectionState).toMatch(/connected|completed/);
      expect(mobileState.connectionState).toMatch(/connected|completed/);

      // Step 3: Mobile ends session via API
      logger.info('Step 3: Mobile ending session via API');
      await mobileClient.endSession();

      // Step 4: Browser should receive notification
      logger.info('Step 4: Waiting for browser to receive session end notification');
      await browserClient.waitForSessionEnded(15000);

      // Verify browser sees session ended
      const browserSessionEnded = await browserClient.isSessionEnded();
      expect(browserSessionEnded).toBe(true);

      logger.info('✅ M2B session end test passed - browser notified when mobile ends session');
      await browserClient.screenshot('m2b-session-ended-browser');
    }, 120000);
  });

  describe('Mobile-to-Mobile (M2M)', () => {
    let mobileHost: MobileSimulator;
    let mobileGuest: MobileSimulator;

    afterEach(async () => {
      await mobileHost?.close();
      await mobileGuest?.close();
    });

    test('should notify guest mobile when host mobile ends session', async () => {
      mobileHost = new MobileSimulator(
        new TestLogger('mobile-host-m2m', testRunDir),
        { role: 'host', deviceName: 'TestMobile-Host-M2M' }
      );

      mobileGuest = new MobileSimulator(
        new TestLogger('mobile-guest-m2m', testRunDir),
        { role: 'guest', deviceName: 'TestMobile-Guest-M2M' }
      );

      // Create session token
      const apiBaseUrl = process.env.TEST_API_BASE_URL!;
      logger.info('Creating session token for M2M test', { apiBaseUrl });

      const response = await createToken(apiBaseUrl, {
        validity_period: '1_day',
        session_ttl_minutes: 30,
        message_char_limit: 2000,
      });
      const token = response.token;
      logger.info('Token created', { token });

      // Step 1: Both mobiles join session
      logger.info('Step 1: Both mobile simulators joining session');
      await mobileHost.connect(token);
      await mobileGuest.connect(token);

      // Step 2: Wait for WebRTC connections
      logger.info('Step 2: Waiting for WebRTC connections');
      await Promise.all([
        mobileHost.waitForConnection(90000),
        mobileGuest.waitForConnection(90000),
      ]);
      await Promise.all([
        mobileHost.waitForDataChannel(90000),
        mobileGuest.waitForDataChannel(90000),
      ]);
      logger.info('Both mobile simulators connected');

      // Verify both are connected
      const hostState = mobileHost.getWebRTCState();
      const guestState = mobileGuest.getWebRTCState();
      expect(hostState.connectionState).toMatch(/connected|completed/);
      expect(guestState.connectionState).toMatch(/connected|completed/);

      // Step 3: Host mobile ends session via API
      logger.info('Step 3: Host mobile ending session via API');
      await mobileHost.endSession();

      // Step 4: Guest mobile should receive notification
      logger.info('Step 4: Waiting for guest mobile to receive session end notification');
      await mobileGuest.waitForSessionEnded(15000);

      // Verify guest received the notification
      expect(mobileGuest.isSessionEnded()).toBe(true);
      logger.info('Guest mobile session ended reason:', { reason: mobileGuest.getSessionEndedReason() });

      logger.info('✅ M2M session end test passed - guest mobile notified when host mobile ends session');
    }, 120000);
  });
});
