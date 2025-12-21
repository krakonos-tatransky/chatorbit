# WebRTC E2E Tests - Implementation Guide

## Created Files

### ✅ Configuration & Setup
- [x] `package.json` - Dependencies and scripts
- [x] `jest.config.js` - Jest configuration
- [x] `tsconfig.json` - TypeScript configuration
- [x] `.env.test.example` - Environment variables template
- [x] `setup/global-setup.ts` - Start Docker backend
- [x] `setup/global-teardown.ts` - Stop Docker backend
- [x] `setup/test-setup.ts` - Custom matchers

### 🚧 To Be Implemented

#### 1. Utility Files (`utils/`)

**`utils/logger.ts`** - Structured logging
```typescript
export class TestLogger {
  constructor(name: string, outputDir: string);
  info(message: string, meta?: object): void;
  error(message: string, error?: Error): void;
  webrtc(event: string, data: object): void; // WebRTC-specific events
  saveToFile(): void;
}
```

**`utils/token-helper.ts`** - Token management
```typescript
export async function createToken(apiBaseUrl: string, params: {
  ttl_days?: number;
  duration_minutes?: number;
}): Promise<{ token: string }>;
```

#### 2. Client Files (`clients/`)

**`clients/browser-client.ts`** - Playwright browser automation
```typescript
export class BrowserClient {
  constructor(logger: TestLogger);
  async launch(headless: boolean): Promise<void>;
  async navigateToSession(token: string): Promise<void>;
  async sendMessage(text: string): Promise<void>;
  async waitForMessage(text: string): Promise<void>;
  async initiateVideoCall(): Promise<void>;
  async acceptVideoCall(): Promise<void>;
  async getWebRTCState(): Promise<WebRTCState>;
  async close(): Promise<void>;
}
```

**`clients/mobile-simulator.ts`** - WebSocket mobile simulator
```typescript
export class MobileSimulator {
  constructor(logger: TestLogger);
  async connect(wsUrl: string, token: string): Promise<void>;
  async sendMessage(text: string): Promise<void>;
  async waitForMessage(text: string): Promise<void>;
  async createOffer(): Promise<RTCSessionDescriptionInit>;
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void>;
  async getConnectionState(): Promise<string>;
  async disconnect(): Promise<void>;
}
```

**`clients/webrtc-logger.ts`** - WebRTC event capture
```typescript
export class WebRTCLogger {
  captureSignaling(pc: RTCPeerConnection): void;
  captureICE(pc: RTCPeerConnection): void;
  captureDataChannel(dc: RTCDataChannel): void;
  getSummary(): WebRTCEventSummary;
}
```

#### 3. Test Scenarios (`scenarios/`)

**`scenarios/basic-connection.test.ts`**
- Create token
- Host connects (browser)
- Guest connects (mobile simulator)
- Verify data channel opens
- Close connections

**`scenarios/message-exchange.test.ts`**
- Establish connection
- Host sends message
- Guest receives message
- Guest sends reply
- Host receives reply
- Verify message integrity

**`scenarios/video-call.test.ts`**
- Establish data channel
- Host initiates video call
- Guest receives invite
- Guest accepts
- Verify media tracks
- End call

**`scenarios/error-recovery.test.ts`**
- Simulate network interruption
- Verify reconnection
- Simulate ICE failure
- Verify fallback to TURN

## Quick Start Implementation

### Step 1: Install Dependencies
```bash
cd tests/e2e
npm install
```

### Step 2: Configure Environment
```bash
cp .env.test.example .env.test
# Edit .env.test with your STUN/TURN servers
```

### Step 3: Implement Core Utilities
Create `utils/logger.ts` first (see template above)

### Step 4: Implement Browser Client
Create `clients/browser-client.ts` (see template below)

### Step 5: Implement Mobile Simulator
Create `clients/mobile-simulator.ts` (see template below)

### Step 6: Write First Test
Create `scenarios/basic-connection.test.ts`

### Step 7: Run Test
```bash
npm test -- basic-connection
```

## Browser Client Template

```typescript
// clients/browser-client.ts
import { chromium, Browser, Page } from 'playwright';
import { TestLogger } from '../utils/logger';

export class BrowserClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private logger: TestLogger;

  constructor(logger: TestLogger) {
    this.logger = logger;
  }

  async launch(headless = false) {
    this.logger.info('Launching browser');
    this.browser = await chromium.launch({ headless });
    this.page = await this.browser.newPage();

    // Capture console logs
    this.page.on('console', msg => {
      this.logger.info(`[Browser Console] ${msg.text()}`);
    });
  }

  async navigateToSession(token: string) {
    const url = `${process.env.TEST_FRONTEND_URL}/session/${token}`;
    this.logger.info(`Navigating to ${url}`);
    await this.page!.goto(url);
    await this.page!.waitForLoadState('networkidle');
  }

  async sendMessage(text: string) {
    await this.page!.fill('[data-testid="message-input"]', text);
    await this.page!.click('[data-testid="send-button"]');
    this.logger.info(`Sent message: ${text}`);
  }

  async waitForMessage(text: string, timeout = 30000) {
    await this.page!.waitForSelector(`text=${text}`, { timeout });
    this.logger.info(`Received message: ${text}`);
  }

  async close() {
    await this.browser?.close();
    this.logger.info('Browser closed');
  }
}
```

## Mobile Simulator Template

```typescript
// clients/mobile-simulator.ts
import WebSocket from 'ws';
import { TestLogger } from '../utils/logger';

export class MobileSimulator {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private logger: TestLogger;
  private participantId: string;

  constructor(logger: TestLogger) {
    this.logger = logger;
    this.participantId = this.generateId();
  }

  async connect(wsUrl: string, token: string) {
    const url = `${wsUrl}/api/ws/${token}/${this.participantId}`;
    this.logger.info(`Connecting to ${url}`);

    this.ws = new WebSocket(url);

    return new Promise((resolve, reject) => {
      this.ws!.on('open', () => {
        this.logger.info('WebSocket connected');
        this.setupPeerConnection();
        resolve(undefined);
      });

      this.ws!.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      });

      this.ws!.on('error', reject);
    });
  }

  private setupPeerConnection() {
    const config = {
      iceServers: [
        { urls: process.env.NEXT_PUBLIC_WEBRTC_STUN_URLS!.split(',') }
      ]
    };

    this.pc = new RTCPeerConnection(config);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal('iceCandidate', event.candidate);
      }
    };

    this.pc.ondatachannel = (event) => {
      this.logger.info('Data channel received');
      event.channel.onopen = () => {
        this.logger.info('Data channel open');
      };
    };
  }

  private sendSignal(signalType: string, payload: any) {
    this.ws!.send(JSON.stringify({
      type: 'signal',
      signalType,
      payload
    }));
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

## Test Scenario Template

```typescript
// scenarios/basic-connection.test.ts
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { BrowserClient } from '../clients/browser-client';
import { MobileSimulator } from '../clients/mobile-simulator';
import { TestLogger } from '../utils/logger';
import { createToken } from '../utils/token-helper';

describe('Basic WebRTC Connection', () => {
  let logger: TestLogger;
  let browser: BrowserClient;
  let mobile: MobileSimulator;
  let token: string;

  beforeAll(async () => {
    logger = new TestLogger('basic-connection', process.env.TEST_RUN_DIR!);

    // Create token
    const response = await createToken(process.env.TEST_API_BASE_URL!, {
      ttl_days: 1,
      duration_minutes: 30
    });
    token = response.token;
    logger.info(`Created token: ${token}`);

    // Initialize clients
    browser = new BrowserClient(logger);
    mobile = new MobileSimulator(logger);
  });

  afterAll(async () => {
    await browser?.close();
    await mobile?.disconnect();
    logger.saveToFile();
  });

  test('should establish WebRTC connection', async () => {
    // Browser joins as host
    await browser.launch(process.env.TEST_HEADLESS === 'true');
    await browser.navigateToSession(token);

    // Mobile joins as guest
    await mobile.connect(process.env.TEST_WS_BASE_URL!, token);

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify connection state
    const browserState = await browser.getWebRTCState();
    expect(browserState.connectionState).toBeWebRTCConnected();

    const mobileState = await mobile.getConnectionState();
    expect(mobileState).toBe('connected');

    logger.info('✅ Connection established successfully');
  });
});
```

## Next Steps

1. **Implement logger** (`utils/logger.ts`)
2. **Implement token helper** (`utils/token-helper.ts`)
3. **Implement browser client** (`clients/browser-client.ts`)
4. **Implement mobile simulator** (`clients/mobile-simulator.ts`)
5. **Write basic connection test** (`scenarios/basic-connection.test.ts`)
6. **Run test and debug**
7. **Expand to message exchange test**
8. **Expand to video call test**

## Running Tests

```bash
# Run all tests
npm test

# Run specific test
npm test -- basic-connection

# Run with verbose output
npm test:verbose

# Debug test
npm test:debug
```

## Troubleshooting

### Docker backend won't start
```bash
cd ../../infra
docker-compose logs backend
```

### Tests timeout
- Increase `TEST_TIMEOUT` in `.env.test`
- Check if TURN servers are reachable
- Verify backend is running

### WebRTC connection fails
- Check STUN/TURN configuration
- Review logs in `output/test-run-*/logs/`
- Check browser console logs

---

**Status**: Infrastructure complete, clients need implementation
**Last Updated**: 2025-12-20
