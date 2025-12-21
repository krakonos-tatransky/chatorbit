import { chromium, Browser, Page, ConsoleMessage } from 'playwright';
import { TestLogger } from '../utils/logger';
import * as path from 'path';

export interface WebRTCState {
  connectionState: string;
  iceConnectionState: string;
  signalingState: string;
  dataChannelState: string | null;
  hasLocalStream: boolean;
  hasRemoteStream: boolean;
}

export interface BrowserClientOptions {
  headless?: boolean;
  slowMo?: number;
  videosPath?: string;
  screenshotsPath?: string;
}

/**
 * Playwright-based browser client for WebRTC testing
 *
 * Automates browser interactions with the ChatOrbit frontend
 */
export class BrowserClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private logger: TestLogger;
  private options: BrowserClientOptions;
  private frontendUrl: string;
  private receivedMessages: string[] = [];
  private consoleMessages: ConsoleMessage[] = [];

  constructor(logger: TestLogger, options: BrowserClientOptions = {}) {
    this.logger = logger;
    this.options = {
      headless: options.headless ?? false,
      slowMo: options.slowMo ?? parseInt(process.env.TEST_SLOW_MO || '0'),
      videosPath: options.videosPath || process.env.TEST_VIDEO_DIR,
      screenshotsPath: options.screenshotsPath || process.env.TEST_SCREENSHOT_DIR,
    };
    this.frontendUrl = process.env.TEST_FRONTEND_URL || 'http://localhost:3003';
  }

  /**
   * Launch browser instance
   */
  async launch(): Promise<void> {
    this.logger.info('Launching browser', {
      headless: this.options.headless,
      slowMo: this.options.slowMo,
    });

    this.browser = await chromium.launch({
      headless: this.options.headless,
      slowMo: this.options.slowMo,
      args: [
        '--use-fake-ui-for-media-stream', // Auto-grant camera/mic permissions
        '--use-fake-device-for-media-stream', // Use fake video/audio
        '--disable-web-security', // Allow WebRTC in test environment
      ],
    });

    const context = await this.browser.newContext({
      // Grant media permissions
      permissions: ['camera', 'microphone'],
      // Record video if path provided
      ...(this.options.videosPath && {
        recordVideo: { dir: this.options.videosPath },
      }),
    });

    this.page = await context.newPage();

    // Capture console messages
    this.page.on('console', (msg) => {
      this.consoleMessages.push(msg);
      const text = msg.text();

      // Log browser console with appropriate level
      if (text.includes('[ERROR]') || msg.type() === 'error') {
        this.logger.error(`[Browser Console] ${text}`);
      } else if (text.includes('rn-webrtc') || text.includes('WebRTC')) {
        this.logger.webrtc('browser-event', { message: text });
      } else {
        this.logger.debug(`[Browser Console] ${text}`);
      }
    });

    // Capture page errors
    this.page.on('pageerror', (error) => {
      this.logger.error('[Browser Page Error]', error);
    });

    // Capture dialog events
    this.page.on('dialog', async (dialog) => {
      this.logger.info(`[Browser Dialog] ${dialog.type()}: ${dialog.message()}`);
      await dialog.accept();
    });

    this.logger.info('Browser launched successfully');
  }

  /**
   * Navigate to session with token
   */
  async navigateToSession(token: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }

    const landingUrl = `${this.frontendUrl}/`;
    this.logger.info(`Navigating to landing page to join session`, { landingUrl, token });

    await this.page.goto(landingUrl, { waitUntil: 'networkidle' });
    await this.page.waitForLoadState('domcontentloaded');

    // Pre-accept terms by setting the storage flag for this token
    await this.page.evaluate((tok) => {
      try {
        localStorage.setItem(`chatorbit:session:${tok}:termsAccepted`, 'true');
      } catch (e) {
        // ignore
      }
    }, token);

    // Click the "Have token" / "Got token" button to reveal the join form
    const haveTokenButton = this.page
      .getByRole('button', { name: /have token|got token/i })
      .first();
    await haveTokenButton.waitFor({ state: 'visible', timeout: 5000 });
    await haveTokenButton.click();

    // Fill the token input and submit the form
    const joinCard = this.page.locator('#join-session-card');
    const tokenInput = joinCard.locator('input.input--token').first();
    await tokenInput.waitFor({ state: 'visible', timeout: 5000 });
    await tokenInput.fill(token);

    const joinButton = joinCard.getByRole('button', { name: /enter session|join|connect/i });
    await joinButton.waitFor({ state: 'visible', timeout: 5000 });
    await joinButton.waitFor({ state: 'attached', timeout: 5000 });
    await joinButton.scrollIntoViewIfNeeded();
    await joinButton.click();

    // Wait for navigation to the session route
    await this.page.waitForURL(`**/session/${token}**`, { timeout: 10000 });

    // Set terms accepted in case the session view checks again after navigation
    await this.page.evaluate((tok) => {
      try {
        localStorage.setItem(`chatorbit:session:${tok}:termsAccepted`, 'true');
      } catch (e) {
        // ignore
      }
    }, token);

    await this.page.waitForLoadState('domcontentloaded');

    // Accept terms if modal appears on the session page
    await this.acceptTermsIfPresent();

    this.logger.info('Navigation complete');
  }

  /**
   * Accept terms modal if it appears
   */
  private async acceptTermsIfPresent(): Promise<void> {
    if (!this.page) return;

    try {
      // Wait briefly for terms modal
      const termsModal = this.page.locator('.terms-modal');
      const agreeButton = this.page.getByRole('button', { name: /agree|i understand and agree/i });

      if (await termsModal.isVisible({ timeout: 5000 })) {
        this.logger.info('Accepting terms modal (force)');

        // Directly enable and click the agree button via the DOM
        await this.page.evaluate(() => {
          const btn = document.querySelector('.terms-modal .terms-modal__agree') as HTMLButtonElement | null;
          if (btn) {
            btn.disabled = false;
            btn.click();
          }
        });

        // Wait for modal to disappear
        await termsModal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }
    } catch (e) {
      // Terms modal not present, continue
    }
  }

  /**
   * Wait for WebRTC connection to establish
   */
  async waitForConnection(timeout = 30000): Promise<void> {
    this.logger.info('Waiting for WebRTC connection');

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const state = await this.getWebRTCState();

      if (state.connectionState === 'connected' || state.connectionState === 'completed') {
        this.logger.info('WebRTC connection established', state);
        return;
      }

      if (state.connectionState === 'failed' || state.connectionState === 'closed') {
        throw new Error(`WebRTC connection failed: ${state.connectionState}`);
      }

      await this.page!.waitForTimeout(500);
    }

    throw new Error(`WebRTC connection timeout after ${timeout}ms`);
  }

  /**
   * Wait for data channel to open
   */
  async waitForDataChannel(timeout = 30000): Promise<void> {
    this.logger.info('Waiting for data channel to open');

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const state = await this.getWebRTCState();

      if (state.dataChannelState === 'open') {
        this.logger.info('Data channel opened');
        return;
      }

      if (state.dataChannelState === 'closed') {
        throw new Error('Data channel closed');
      }

      await this.page!.waitForTimeout(500);
    }

    throw new Error(`Data channel timeout after ${timeout}ms`);
  }

  /**
   * Send text message
   */
  async sendMessage(text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    this.logger.info(`Sending message`, { text });

    // Find message input (adjust selector based on your frontend)
    const input = this.page.locator('[data-testid="message-input"], textarea, input[type="text"]').first();
    await input.waitFor({ state: 'visible', timeout: 5000 });

    // Type message
    await input.fill(text);

    // Find and click send button
    const sendButton = this.page.locator('[data-testid="send-button"], button:has-text("Send")').first();
    await sendButton.click();

    this.logger.info('Message sent');

    // Wait briefly for message to appear in UI
    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for message to be received
   */
  async waitForMessage(expectedText: string, timeout = 10000): Promise<void> {
    this.logger.info(`Waiting for message`, { expectedText });

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Check console messages for received message events
      const consoleText = this.consoleMessages.map(m => m.text()).join('\n');

      if (consoleText.includes(expectedText)) {
        this.logger.info('Message found in console logs');
        this.receivedMessages.push(expectedText);
        return;
      }

      // Also check DOM for message
      try {
        await this.page!.locator(`text=${expectedText}`).waitFor({
          state: 'visible',
          timeout: 1000,
        });
        this.logger.info('Message found in DOM');
        this.receivedMessages.push(expectedText);
        return;
      } catch (e) {
        // Message not in DOM yet, continue
      }

      await this.page!.waitForTimeout(500);
    }

    throw new Error(`Message "${expectedText}" not received within ${timeout}ms`);
  }

  /**
   * Initiate video call
   */
  async initiateVideoCall(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    this.logger.info('Initiating video call');

    // Find video call button (adjust selector based on your frontend)
    const videoButton = this.page.locator(
      '[data-testid="video-call-button"], button:has-text("Video"), button[aria-label*="video"]'
    ).first();

    await videoButton.waitFor({ state: 'visible', timeout: 5000 });
    await videoButton.click();

    this.logger.info('Video call initiated');
  }

  /**
   * Accept incoming video call
   */
  async acceptVideoCall(timeout = 10000): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    this.logger.info('Waiting for video call invite');

    // Wait for accept button to appear
    const acceptButton = this.page.locator(
      '[data-testid="accept-call-button"], button:has-text("Accept"), button:has-text("Join")'
    ).first();

    await acceptButton.waitFor({ state: 'visible', timeout });
    await acceptButton.click();

    this.logger.info('Video call accepted');
  }

  /**
   * Get current WebRTC connection state
   */
  async getWebRTCState(): Promise<WebRTCState> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    // Execute JavaScript in browser context to get WebRTC state
    const state = await this.page.evaluate(() => {
      // Access global WebRTC state (you may need to expose this from your frontend)
      const peerConnection = (window as any).__peerConnection;

      if (!peerConnection) {
        return {
          connectionState: 'new',
          iceConnectionState: 'new',
          signalingState: 'stable',
          dataChannelState: null,
          hasLocalStream: false,
          hasRemoteStream: false,
        };
      }

      const dataChannel = (window as any).__dataChannel;

      return {
        connectionState: peerConnection.connectionState,
        iceConnectionState: peerConnection.iceConnectionState,
        signalingState: peerConnection.signalingState,
        dataChannelState: dataChannel?.readyState || null,
        hasLocalStream: peerConnection.getLocalStreams?.().length > 0 || false,
        hasRemoteStream: peerConnection.getRemoteStreams?.().length > 0 || false,
      };
    });

    return state;
  }

  /**
   * Take screenshot
   */
  async screenshot(name: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(
      this.options.screenshotsPath || './output/screenshots',
      filename
    );

    await this.page.screenshot({ path: filepath, fullPage: true });
    this.logger.info(`Screenshot saved`, { filepath });

    return filepath;
  }

  /**
   * Get all console messages
   */
  getConsoleMessages(): ConsoleMessage[] {
    return [...this.consoleMessages];
  }

  /**
   * Get received messages
   */
  getReceivedMessages(): string[] {
    return [...this.receivedMessages];
  }

  /**
   * Execute custom JavaScript in browser context
   */
  async evaluate<T>(fn: () => T): Promise<T> {
    if (!this.page) {
      throw new Error('Browser not launched');
    }

    return await this.page.evaluate(fn);
  }

  /**
   * Wait for specified time
   */
  async wait(ms: number): Promise<void> {
    await this.page?.waitForTimeout(ms);
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      this.logger.info('Closing browser');

      // Save video if recording
      if (this.page) {
        await this.page.close();
      }

      await this.browser.close();
      this.browser = null;
      this.page = null;

      this.logger.info('Browser closed');
    }
  }

  /**
   * Check if browser is launched
   */
  isLaunched(): boolean {
    return this.browser !== null && this.page !== null;
  }
}
