import { describe, test, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import { BrowserClient } from '../clients/browser-client';
import { MobileSimulator } from '../clients/mobile-simulator';
import { TestLogger } from '../utils/logger';
import { createToken } from '../utils/token-helper';
import * as path from 'path';

/**
 * Performance Metrics Test
 *
 * Measures and validates WebRTC connection performance
 */
describe('WebRTC Performance Metrics', () => {
  let logger: TestLogger;
  let browserClient: BrowserClient;
  let mobileClient: MobileSimulator;
  let testRunDir: string;

  beforeAll(async () => {
    testRunDir = process.env.TEST_RUN_DIR || path.join(__dirname, '../output/test-run-latest');
    logger = new TestLogger('performance-metrics', testRunDir);
    logger.info('=== Starting Performance Metrics Tests ===');

    const headless = process.env.TEST_HEADLESS === 'true';
    const screenshotsPath = path.join(testRunDir, 'screenshots');
    const videosPath = path.join(testRunDir, 'videos');

    browserClient = new BrowserClient(
      new TestLogger('browser-perf', testRunDir),
      { headless, screenshotsPath, videosPath }
    );

    mobileClient = new MobileSimulator(
      new TestLogger('mobile-perf', testRunDir),
      { role: 'guest', deviceName: 'TestMobile' }
    );
  });

  afterEach(async () => {
    await browserClient?.close();
    await mobileClient?.close();
  });

  afterAll(async () => {
    logger.saveToFile();
    logger.info('=== Performance Metrics Tests Complete ===');
  });

  test('should establish connection within acceptable time limits', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const response = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    const token = response.token;

    // Measure browser launch time
    const browserLaunchStart = Date.now();
    await browserClient.launch();
    const browserLaunchTime = Date.now() - browserLaunchStart;
    logger.info('Browser launch time', { ms: browserLaunchTime });

    // Measure session navigation time
    const navigationStart = Date.now();
    await browserClient.navigateToSession(token);
    const navigationTime = Date.now() - navigationStart;
    logger.info('Session navigation time', { ms: navigationTime });

    // Measure mobile connection time
    const mobileConnectStart = Date.now();
    await mobileClient.connect(token);
    const mobileConnectTime = Date.now() - mobileConnectStart;
    logger.info('Mobile connection time', { ms: mobileConnectTime });

    // Measure WebRTC peer connection time
    const peerConnectionStart = Date.now();
    await Promise.all([
      browserClient.waitForConnection(90000),
      mobileClient.waitForConnection(90000),
    ]);
    const peerConnectionTime = Date.now() - peerConnectionStart;
    logger.info('Peer connection establishment time', { ms: peerConnectionTime });

    // Measure data channel opening time
    const dataChannelStart = Date.now();
    await Promise.all([
      browserClient.waitForDataChannel(90000),
      mobileClient.waitForDataChannel(90000),
    ]);
    const dataChannelTime = Date.now() - dataChannelStart;
    logger.info('Data channel opening time', { ms: dataChannelTime });

    // Total connection time (from mobile connect to data channel open)
    const totalConnectionTime = Date.now() - mobileConnectStart;
    logger.info('Total connection time', { ms: totalConnectionTime });

    // Performance assertions
    expect(peerConnectionTime).toBeLessThan(15000); // Peer connection < 15s
    expect(dataChannelTime).toBeLessThan(5000); // Data channel < 5s
    expect(totalConnectionTime).toBeLessThan(20000); // Total < 20s

    logger.info('✅ Connection timing test passed', {
      browserLaunch: browserLaunchTime,
      navigation: navigationTime,
      mobileConnect: mobileConnectTime,
      peerConnection: peerConnectionTime,
      dataChannel: dataChannelTime,
      total: totalConnectionTime,
    });
  }, 150000);

  test('should measure message delivery latency', async () => {
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

    // Measure message round-trip times
    const roundTripCount = 10;
    const roundTripTimes: number[] = [];

    logger.info(`Step 1: Measuring ${roundTripCount} round-trip times`);

    for (let i = 0; i < roundTripCount; i++) {
      const roundTripStart = Date.now();
      const msg = `RTT-test-${i}-${roundTripStart}`;

      // Browser sends
      await browserClient.sendMessage(msg);

      // Mobile receives and sends back
      await mobileClient.waitForMessage(msg, 10000);
      const replyMsg = `RTT-reply-${i}-${Date.now()}`;
      await mobileClient.sendMessage(replyMsg);

      // Browser receives reply
      await browserClient.waitForMessage(replyMsg, 10000);

      const roundTripTime = Date.now() - roundTripStart;
      roundTripTimes.push(roundTripTime);

      logger.info(`Round-trip ${i + 1}/${roundTripCount}`, { ms: roundTripTime });

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Calculate statistics
    const avgRTT = roundTripTimes.reduce((a, b) => a + b, 0) / roundTripTimes.length;
    const minRTT = Math.min(...roundTripTimes);
    const maxRTT = Math.max(...roundTripTimes);

    logger.info('Round-trip time statistics', {
      average: avgRTT,
      min: minRTT,
      max: maxRTT,
      count: roundTripCount,
    });

    // Performance assertions
    expect(avgRTT).toBeLessThan(2000); // Average RTT < 2s
    expect(minRTT).toBeLessThan(1000); // Best case < 1s
    expect(maxRTT).toBeLessThan(5000); // Worst case < 5s

    logger.info('✅ Message latency test passed');
  }, 150000);

  test('should measure message throughput', async () => {
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

    // Measure throughput
    const messageCount = 50;
    const messageSize = 100; // bytes
    const throughputStart = Date.now();

    logger.info(`Step 1: Sending ${messageCount} messages`);

    const messages: string[] = [];
    for (let i = 0; i < messageCount; i++) {
      const msg = `Throughput-${i}-${'x'.repeat(messageSize - 20)}-${Date.now()}`;
      messages.push(msg);
      await browserClient.sendMessage(msg);
    }

    logger.info('All messages sent, waiting for delivery');

    // Wait for all messages to be received
    for (const msg of messages) {
      const uniquePart = msg.split('-')[1];
      await mobileClient.waitForMessage(uniquePart, 15000);
    }

    const throughputTime = Date.now() - throughputStart;
    const throughputRate = (messageCount * messageSize) / (throughputTime / 1000); // bytes per second

    logger.info('Throughput test complete', {
      messageCount,
      messageSize,
      totalTime: throughputTime,
      throughputRate: `${throughputRate.toFixed(2)} bytes/sec`,
      messagesPerSecond: (messageCount / (throughputTime / 1000)).toFixed(2),
    });

    // Performance assertions
    const messagesPerSecond = messageCount / (throughputTime / 1000);
    expect(messagesPerSecond).toBeGreaterThan(1); // At least 1 msg/sec
    expect(throughputTime).toBeLessThan(60000); // Complete within 60s

    logger.info('✅ Throughput test passed');
  }, 150000);

  test('should track ICE candidate gathering performance', async () => {
    const apiBaseUrl = process.env.TEST_API_BASE_URL!;
    const response = await createToken(apiBaseUrl, {
      validity_period: '1_day',
      session_ttl_minutes: 30,
      message_char_limit: 2000,
    });

    const token = response.token;

    // Measure ICE gathering time
    await browserClient.launch();
    await browserClient.navigateToSession(token);

    const iceGatheringStart = Date.now();
    await mobileClient.connect(token);

    // Wait for connection (includes ICE gathering)
    await Promise.all([
      browserClient.waitForConnection(90000),
      mobileClient.waitForConnection(90000),
    ]);

    const iceGatheringTime = Date.now() - iceGatheringStart;

    logger.info('ICE gathering completed', { ms: iceGatheringTime });

    // Get final connection states
    const browserState = await browserClient.getWebRTCState();
    const mobileState = mobileClient.getWebRTCState();

    logger.info('Final connection states', {
      browser: browserState,
      mobile: mobileState,
    });

    // Performance assertions
    expect(iceGatheringTime).toBeLessThan(15000); // ICE gathering < 15s
    expect(browserState.iceConnectionState).toMatch(/connected|completed/);
    expect(mobileState.iceConnectionState).toMatch(/connected|completed/);

    logger.info('✅ ICE gathering performance test passed', {
      gatheringTime: iceGatheringTime,
    });
  }, 120000);
});
