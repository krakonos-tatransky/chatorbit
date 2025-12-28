import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { BrowserClient } from '../clients/browser-client';
import { MobileSimulator } from '../clients/mobile-simulator';
import { TestLogger } from '../utils/logger';
import { createToken } from '../utils/token-helper';
import * as path from 'path';

/**
 * Browser <-> Mobile Video Call Test
 *
 * Tests video call functionality between a browser and a mobile simulator.
 * The mobile simulator uses wrtc (node-webrtc) to simulate a mobile device.
 */
describe('Browser <-> Mobile Video Call', () => {
  let logger: TestLogger;
  let browser: BrowserClient;
  let mobile: MobileSimulator;
  let token: string;
  let testRunDir: string;

  beforeAll(async () => {
    testRunDir = process.env.TEST_RUN_DIR || path.join(__dirname, '../output/test-run-latest');
    logger = new TestLogger('browser-mobile-video', testRunDir);
    logger.info('=== Starting Browser-Mobile Video Call Test ===');

    // Create session token
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    logger.info('Creating session token', { apiBaseUrl });

    const response = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    token = response.token;
    logger.info('Token created', { token });

    // Initialize clients
    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    browser = new BrowserClient(
      new TestLogger('browser', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    mobile = new MobileSimulator(
      new TestLogger('mobile-sim', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );
  });

  afterAll(async () => {
    await browser?.close();
    await mobile?.close();
    logger.saveToFile();
    logger.info('=== Test Complete ===');
  });

  test('should establish connection between browser and mobile', async () => {
    logger.info('TEST: Establishing browser-mobile connection');

    // Step 1: Browser joins as host
    logger.info('Step 1: Browser joining as host');
    await browser.launch();
    await browser.navigateToSession(token);
    logger.info('Browser joined session');

    // Step 2: Mobile joins as guest
    logger.info('Step 2: Mobile joining as guest');
    await mobile.connect(token);
    logger.info('Mobile connected to session');

    // Step 3: Wait for WebRTC connection on both sides
    logger.info('Step 3: Waiting for WebRTC connection');
    await Promise.all([
      browser.waitForConnection(60000),
      mobile.waitForConnection(60000),
    ]);
    logger.info('WebRTC connections established');

    // Step 4: Wait for data channel
    logger.info('Step 4: Waiting for data channel');
    await Promise.all([
      browser.waitForDataChannel(30000),
      mobile.waitForDataChannel(30000),
    ]);
    logger.info('Data channels opened');

    // Step 5: Verify connection states
    const browserState = await browser.getWebRTCState();
    const mobileState = mobile.getWebRTCState();

    logger.info('Browser state', browserState);
    logger.info('Mobile state', mobileState);

    expect(browserState.connectionState).toMatch(/connected|completed/);
    expect(browserState.dataChannelState).toBe('open');
    expect(mobileState.connectionState).toMatch(/connected|completed/);
    expect(mobileState.dataChannelState).toBe('open');

    await browser.screenshot('browser-mobile-connected');
    logger.info('Connection test passed');
  }, 120000);

  test('should send video invite from browser to mobile', async () => {
    logger.info('TEST: Browser to Mobile video invite');

    // Step 1: Browser initiates video call
    logger.info('Step 1: Browser initiating video call');
    await browser.initiateVideoCall();
    await browser.screenshot('browser-initiated-video');

    // Step 2: Mobile waits for video invite
    logger.info('Step 2: Mobile waiting for video invite');
    await mobile.waitForVideoInvite(30000);
    logger.info('Mobile received video invite');

    expect(mobile.hasPendingVideoInvite()).toBe(true);

    // Step 3: Mobile accepts video invite
    logger.info('Step 3: Mobile accepting video invite');
    mobile.acceptVideoInvite();

    // Step 4: Wait for video call to be active
    logger.info('Step 4: Waiting for video call to become active');

    // Give time for media streams to establish
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check states
    const browserState = await browser.getWebRTCState();
    const mobileState = mobile.getWebRTCState();

    logger.info('Browser state after video accept', browserState);
    logger.info('Mobile state after video accept', mobileState);

    await browser.screenshot('browser-video-active');

    // Mobile should have marked video as active
    expect(mobile.isVideoCallActive()).toBe(true);

    logger.info('Browser to mobile video invite test passed');
  }, 90000);

  test('should send video invite from mobile to browser', async () => {
    logger.info('TEST: Mobile to Browser video invite');

    // First, end any existing video call
    if (mobile.isVideoCallActive()) {
      logger.info('Ending existing video call');
      mobile.endVideoCall();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Step 1: Mobile sends video invite
    logger.info('Step 1: Mobile sending video invite');
    mobile.sendVideoInvite();

    // Step 2: Browser should receive incoming call dialog
    logger.info('Step 2: Browser waiting for incoming call dialog');
    await browser.waitForIncomingCallDialog(30000);
    await browser.screenshot('browser-incoming-from-mobile');

    // Step 3: Browser accepts video call
    logger.info('Step 3: Browser accepting video call');
    await browser.acceptVideoCall();

    // Step 4: Wait for video call to become active on mobile
    logger.info('Step 4: Waiting for mobile video call to become active');
    await mobile.waitForVideoCallActive(30000);

    // Check states
    const browserState = await browser.getWebRTCState();
    const mobileState = mobile.getWebRTCState();

    logger.info('Browser state after mobile invite', browserState);
    logger.info('Mobile state after mobile invite', mobileState);

    await browser.screenshot('mobile-to-browser-video-active');

    expect(mobile.isVideoCallActive()).toBe(true);

    logger.info('Mobile to browser video invite test passed');
  }, 90000);

  test('should exchange messages while video is active', async () => {
    logger.info('TEST: Message exchange during video call');

    const browserMessage = `Browser says hi ${Date.now()}`;
    const mobileMessage = `Mobile says hello ${Date.now()}`;

    // Step 1: Browser sends message
    logger.info('Step 1: Browser sending message');
    await browser.sendMessage(browserMessage);

    // Step 2: Mobile waits for message
    logger.info('Step 2: Mobile waiting for message');
    await mobile.waitForMessage(browserMessage, 15000);

    // Step 3: Mobile sends reply
    logger.info('Step 3: Mobile sending reply');
    await mobile.sendMessage(mobileMessage);

    // Step 4: Browser waits for message
    logger.info('Step 4: Browser waiting for reply');
    await browser.waitForMessage(mobileMessage, 15000);

    // Verify messages received
    const mobileReceived = mobile.getReceivedMessages();
    const browserReceived = browser.getReceivedMessages();

    expect(mobileReceived.some(m => m.includes(browserMessage))).toBe(true);
    expect(browserReceived.some(m => m.includes(mobileMessage))).toBe(true);

    await browser.screenshot('messages-during-video');

    logger.info('Message exchange during video call passed');
  }, 60000);

  test('should end video call from mobile', async () => {
    logger.info('TEST: Ending video call from mobile');

    // Mobile ends video call
    logger.info('Mobile ending video call');
    mobile.endVideoCall();

    // Wait for state to update
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify video call is no longer active
    expect(mobile.isVideoCallActive()).toBe(false);

    // Connection should still be open for text chat
    const browserState = await browser.getWebRTCState();
    const mobileState = mobile.getWebRTCState();

    logger.info('Browser state after video end', browserState);
    logger.info('Mobile state after video end', mobileState);

    // Data channel should still be open
    expect(browserState.dataChannelState).toBe('open');
    expect(mobileState.dataChannelState).toBe('open');

    await browser.screenshot('after-video-ended');

    logger.info('End video call test passed');
  }, 30000);
});
