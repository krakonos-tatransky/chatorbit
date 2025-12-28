import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { BrowserClient } from '../clients/browser-client';
import { TestLogger } from '../utils/logger';
import { createToken } from '../utils/token-helper';
import * as path from 'path';

/**
 * Browser ↔ Browser Video Invite Test
 *
 * Tests that the video invite button is visible when two browsers are connected
 * and that messages can be exchanged properly.
 *
 * This test was created to verify that recent WebRTC updates haven't broken
 * the video invite button visibility.
 */
describe('Browser ↔ Browser Video Invite Visibility', () => {
  let logger: TestLogger;
  let hostBrowser: BrowserClient;
  let guestBrowser: BrowserClient;
  let token: string;
  let testRunDir: string;

  beforeAll(async () => {
    testRunDir = process.env.TEST_RUN_DIR || path.join(__dirname, '../output/test-run-latest');
    logger = new TestLogger('browser-video-invite', testRunDir);
    logger.info('=== Starting Browser Video Invite Test ===');

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

  test('should establish connection and show video invite button', async () => {
    logger.info('TEST: Establishing connection and checking video button');

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

    expect(hostState.connectionState).toMatch(/connected|completed/);
    expect(hostState.dataChannelState).toBe('open');
    expect(guestState.connectionState).toMatch(/connected|completed/);
    expect(guestState.dataChannelState).toBe('open');

    // Step 6: Check video invite button visibility
    logger.info('Step 6: Checking video invite button');
    await hostBrowser.waitForVideoInviteButton(30000);
    const hostHasButton = await hostBrowser.isVideoInviteButtonVisible();
    await guestBrowser.waitForVideoInviteButton(30000);
    const guestHasButton = await guestBrowser.isVideoInviteButtonVisible();

    logger.info('Video button visibility', { host: hostHasButton, guest: guestHasButton });

    expect(hostHasButton).toBe(true);
    expect(guestHasButton).toBe(true);

    // Take success screenshots
    await hostBrowser.screenshot('video-button-visible-host');
    await guestBrowser.screenshot('video-button-visible-guest');

    logger.info('✅ Connection and video button test passed');
  }, 180000);

  test('should exchange messages and maintain video button', async () => {
    logger.info('TEST: Exchanging messages');

    const hostMessage1 = `Hello from host ${Date.now()}`;
    const guestMessage1 = `Hello from guest ${Date.now()}`;
    const hostMessage2 = `Second message from host ${Date.now()}`;
    const guestMessage2 = `Second message from guest ${Date.now()}`;

    // Step 1: Host sends first message
    logger.info('Step 1: Host sending message', { text: hostMessage1 });
    await hostBrowser.sendMessage(hostMessage1);

    // Step 2: Guest waits for message and replies
    logger.info('Step 2: Guest waiting for message');
    await guestBrowser.waitForMessage(hostMessage1, 15000);
    logger.info('Guest received message, sending reply');
    await guestBrowser.sendMessage(guestMessage1);

    // Step 3: Host waits for reply
    logger.info('Step 3: Host waiting for reply');
    await hostBrowser.waitForMessage(guestMessage1, 15000);
    logger.info('Host received reply');

    // Step 4: Exchange second round
    logger.info('Step 4: Second round of messages');
    await hostBrowser.sendMessage(hostMessage2);
    await guestBrowser.waitForMessage(hostMessage2, 15000);
    await guestBrowser.sendMessage(guestMessage2);
    await hostBrowser.waitForMessage(guestMessage2, 15000);

    // Verify messages
    const hostReceived = hostBrowser.getReceivedMessages();
    const guestReceived = guestBrowser.getReceivedMessages();

    expect(hostReceived).toContain(guestMessage1);
    expect(hostReceived).toContain(guestMessage2);
    expect(guestReceived).toContain(hostMessage1);
    expect(guestReceived).toContain(hostMessage2);

    // Check video button still visible after messaging
    const hostHasButton = await hostBrowser.isVideoInviteButtonVisible();
    const guestHasButton = await guestBrowser.isVideoInviteButtonVisible();

    logger.info('Video button after messaging', { host: hostHasButton, guest: guestHasButton });

    expect(hostHasButton).toBe(true);
    expect(guestHasButton).toBe(true);

    // Take screenshots
    await hostBrowser.screenshot('messages-success-host');
    await guestBrowser.screenshot('messages-success-guest');

    logger.info('✅ Message exchange test passed');
  }, 90000);

  test('should initiate and accept video call between browsers', async () => {
    logger.info('TEST: Browser to browser video call');

    // Step 1: Verify both browsers are still connected
    logger.info('Step 1: Verifying connection states');
    const hostState = await hostBrowser.getWebRTCState();
    const guestState = await guestBrowser.getWebRTCState();

    expect(hostState.connectionState).toMatch(/connected|completed/);
    expect(guestState.connectionState).toMatch(/connected|completed/);
    logger.info('Both browsers connected', { host: hostState.connectionState, guest: guestState.connectionState });

    // Step 2: Host initiates video call
    logger.info('Step 2: Host initiating video call');
    await hostBrowser.initiateVideoCall();
    await hostBrowser.screenshot('host-initiated-call');

    // Step 3: Guest waits for and accepts incoming call
    logger.info('Step 3: Guest waiting for incoming call dialog');
    await guestBrowser.waitForIncomingCallDialog(30000);
    await guestBrowser.screenshot('guest-incoming-call-dialog');

    logger.info('Step 4: Guest accepting video call');
    await guestBrowser.acceptVideoCall();

    // Step 5: Wait for video call to become active on both sides
    logger.info('Step 5: Waiting for video call to become active');

    // Give some time for media streams to establish
    await hostBrowser.wait(3000);
    await guestBrowser.wait(3000);

    // Check WebRTC states after call
    const hostStateAfter = await hostBrowser.getWebRTCState();
    const guestStateAfter = await guestBrowser.getWebRTCState();

    logger.info('Host state after call', hostStateAfter);
    logger.info('Guest state after call', guestStateAfter);

    // Take screenshots of active video call
    await hostBrowser.screenshot('host-video-call-active');
    await guestBrowser.screenshot('guest-video-call-active');

    // Step 6: Verify video elements are visible
    logger.info('Step 6: Checking video visibility');
    const hostHasVideo = await hostBrowser.isRemoteVideoVisible();
    const guestHasVideo = await guestBrowser.isRemoteVideoVisible();

    logger.info('Video visibility', { host: hostHasVideo, guest: guestHasVideo });

    // At least one side should have video visible
    expect(hostHasVideo || guestHasVideo).toBe(true);

    // Step 7: End the call from host
    logger.info('Step 7: Host ending video call');
    await hostBrowser.endVideoCall();
    await hostBrowser.wait(1000);

    // Take final screenshots
    await hostBrowser.screenshot('host-after-call-ended');
    await guestBrowser.screenshot('guest-after-call-ended');

    logger.info('✅ Video call test passed');
  }, 120000);
});
