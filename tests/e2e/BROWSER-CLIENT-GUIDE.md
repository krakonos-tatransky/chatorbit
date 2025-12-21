# BrowserClient Implementation Guide

## ✅ What's Implemented

The **BrowserClient** is a fully-featured Playwright-based automation client for testing ChatOrbit's WebRTC functionality in the browser.

### Core Features

- ✅ Browser launch with WebRTC permissions
- ✅ Navigate to session with token
- ✅ Auto-accept terms modal
- ✅ Wait for WebRTC connection
- ✅ Wait for data channel to open
- ✅ Send text messages
- ✅ Wait for received messages
- ✅ Initiate video calls
- ✅ Accept video calls
- ✅ Get WebRTC connection state
- ✅ Take screenshots
- ✅ Record videos
- ✅ Capture console logs
- ✅ Execute custom JavaScript

---

## 📖 API Reference

### Constructor

```typescript
const client = new BrowserClient(logger, options);
```

**Parameters**:
- `logger: TestLogger` - Logger instance
- `options?: BrowserClientOptions`
  - `headless?: boolean` - Run in headless mode (default: false)
  - `slowMo?: number` - Slow down operations (ms)
  - `videosPath?: string` - Directory for video recordings
  - `screenshotsPath?: string` - Directory for screenshots

### Methods

#### `async launch(): Promise<void>`
Launch browser with WebRTC permissions enabled.

```typescript
await client.launch();
```

Automatically grants camera/microphone permissions and uses fake media devices for testing.

---

#### `async navigateToSession(token: string): Promise<void>`
Navigate to session page and auto-accept terms if present.

```typescript
await client.navigateToSession('abc123def456');
```

---

#### `async waitForConnection(timeout?: number): Promise<void>`
Wait for WebRTC peer connection to establish.

```typescript
await client.waitForConnection(30000); // 30 second timeout
```

Throws if connection fails or times out.

---

#### `async waitForDataChannel(timeout?: number): Promise<void>`
Wait for data channel to open.

```typescript
await client.waitForDataChannel(30000);
```

---

#### `async sendMessage(text: string): Promise<void>`
Send a text message through the chat interface.

```typescript
await client.sendMessage('Hello from test!');
```

---

#### `async waitForMessage(expectedText: string, timeout?: number): Promise<void>`
Wait for a message to be received (checks console logs and DOM).

```typescript
await client.waitForMessage('Hello back!', 10000);
```

---

#### `async initiateVideoCall(): Promise<void>`
Click the video call button to start a call.

```typescript
await client.initiateVideoCall();
```

---

#### `async acceptVideoCall(timeout?: number): Promise<void>`
Wait for and accept an incoming video call.

```typescript
await client.acceptVideoCall(10000);
```

---

#### `async getWebRTCState(): Promise<WebRTCState>`
Get current WebRTC connection state.

```typescript
const state = await client.getWebRTCState();
console.log(state.connectionState); // 'connected'
console.log(state.dataChannelState); // 'open'
```

**Returns**:
```typescript
{
  connectionState: string;        // 'new', 'connecting', 'connected', 'disconnected', 'failed', 'closed'
  iceConnectionState: string;     // ICE connection state
  signalingState: string;         // 'stable', 'have-local-offer', etc.
  dataChannelState: string | null; // 'connecting', 'open', 'closing', 'closed'
  hasLocalStream: boolean;        // Has local video/audio
  hasRemoteStream: boolean;       // Has remote video/audio
}
```

---

#### `async screenshot(name: string): Promise<string>`
Take a screenshot and save to configured directory.

```typescript
const path = await client.screenshot('error-state');
// Returns: '/path/to/screenshots/error-state-1234567890.png'
```

---

#### `async evaluate<T>(fn: () => T): Promise<T>`
Execute custom JavaScript in browser context.

```typescript
const title = await client.evaluate(() => document.title);
```

---

#### `async close(): Promise<void>`
Close the browser instance.

```typescript
await client.close();
```

---

## 🚀 Usage Examples

### Example 1: Basic Connection Test

```typescript
import { BrowserClient } from '../clients/browser-client';
import { TestLogger } from '../utils/logger';

const logger = new TestLogger('test', './output');
const client = new BrowserClient(logger);

// Launch and connect
await client.launch();
await client.navigateToSession('your-token-here');

// Wait for connection
await client.waitForConnection();
await client.waitForDataChannel();

// Verify state
const state = await client.getWebRTCState();
expect(state.dataChannelState).toBe('open');

// Cleanup
await client.close();
```

---

### Example 2: Message Exchange

```typescript
const host = new BrowserClient(hostLogger);
const guest = new BrowserClient(guestLogger);

// Both connect to same token
await host.launch();
await guest.launch();
await host.navigateToSession(token);
await guest.navigateToSession(token);

// Wait for connection
await host.waitForDataChannel();
await guest.waitForDataChannel();

// Exchange messages
await host.sendMessage('Hello from host!');
await guest.waitForMessage('Hello from host!');

await guest.sendMessage('Hello back!');
await host.waitForMessage('Hello back!');

// Cleanup
await host.close();
await guest.close();
```

---

### Example 3: Video Call

```typescript
// Establish data channel first
await host.waitForDataChannel();
await guest.waitForDataChannel();

// Host initiates video call
await host.initiateVideoCall();

// Guest accepts
await guest.acceptVideoCall();

// Wait a moment for media negotiation
await host.wait(2000);

// Verify media streams
const hostState = await host.getWebRTCState();
const guestState = await guest.getWebRTCState();

expect(hostState.hasLocalStream).toBe(true);
expect(guestState.hasRemoteStream).toBe(true);
```

---

### Example 4: Error Handling with Screenshots

```typescript
try {
  await client.waitForConnection(30000);
} catch (error) {
  // Take screenshot on failure
  await client.screenshot('connection-failed');

  // Log console messages
  const consoleLogs = client.getConsoleMessages();
  console.error('Console logs:', consoleLogs.map(m => m.text()));

  throw error;
}
```

---

### Example 5: Custom JavaScript Execution

```typescript
// Get all WebRTC stats
const stats = await client.evaluate(() => {
  const pc = (window as any).__peerConnection;
  return pc?.getStats();
});

// Check if element exists
const hasButton = await client.evaluate(() => {
  return !!document.querySelector('[data-testid="video-call-button"]');
});
```

---

## 🔧 Configuration

### Environment Variables

```bash
# .env.test
TEST_FRONTEND_URL=http://localhost:3000
TEST_HEADLESS=false
TEST_SLOW_MO=100
TEST_VIDEO_DIR=output/videos
TEST_SCREENSHOT_DIR=output/screenshots
```

### Browser Launch Options

```typescript
const client = new BrowserClient(logger, {
  headless: true,           // Run without UI
  slowMo: 100,             // Slow down by 100ms per action
  videosPath: './videos',  // Record videos here
  screenshotsPath: './screenshots',
});
```

---

## 🐛 Troubleshooting

### "Browser not launched" Error

**Problem**: Called a method before `launch()`

**Solution**:
```typescript
await client.launch();  // Always call this first!
await client.navigateToSession(token);
```

---

### WebRTC State Returns Nulls

**Problem**: Frontend hasn't exposed `__peerConnection` to window

**Solution**: Follow `FRONTEND-INTEGRATION.md` to expose WebRTC state

---

### "Element not found" Errors

**Problem**: Selectors don't match frontend elements

**Solution**: Add test IDs to frontend (see `FRONTEND-INTEGRATION.md`):
```typescript
<button data-testid="send-button">Send</button>
```

Or use alternative selectors:
```typescript
// In BrowserClient, change:
const button = this.page.locator('button:has-text("Send")').first();
```

---

### Messages Not Detected

**Problem**: `waitForMessage()` timing out

**Solution**:
1. Check console logs are being captured
2. Verify message appears in DOM
3. Increase timeout:
   ```typescript
   await client.waitForMessage('text', 30000); // 30 seconds
   ```

---

### Connection Timeout

**Problem**: WebRTC connection not establishing

**Solution**:
1. Check STUN/TURN servers configured
2. Verify backend is running
3. Check both clients using same token
4. Review browser console logs:
   ```typescript
   const logs = client.getConsoleMessages();
   console.log(logs.filter(m => m.text().includes('WebRTC')));
   ```

---

## 📸 Screenshots & Videos

### Automatic Screenshots

Screenshots are saved to `TEST_SCREENSHOT_DIR` or `options.screenshotsPath`:

```typescript
await client.screenshot('my-test-state');
// Saves: screenshots/my-test-state-1234567890.png
```

### Automatic Video Recording

Videos are recorded automatically if `videosPath` is set:

```typescript
const client = new BrowserClient(logger, {
  videosPath: './output/videos',
});

await client.launch(); // Starts recording
// ... perform actions ...
await client.close();  // Saves video
```

Videos saved as: `videos/test-{timestamp}.webm`

---

## 📊 Console Log Capture

All browser console messages are automatically captured:

```typescript
// Get all console messages
const messages = client.getConsoleMessages();

// Filter for errors
const errors = messages.filter(m => m.type() === 'error');

// Filter for WebRTC events
const webrtcLogs = messages.filter(m =>
  m.text().includes('rn-webrtc') || m.text().includes('[TEST_EVENT]')
);

// Print all
messages.forEach(m => {
  console.log(`[${m.type()}]`, m.text());
});
```

---

## 🧪 Testing Best Practices

### 1. Always Launch Before Use
```typescript
beforeAll(async () => {
  await client.launch();
});
```

### 2. Always Cleanup
```typescript
afterAll(async () => {
  await client.close();
});
```

### 3. Take Screenshots on Failure
```typescript
afterEach(async () => {
  if (testFailed) {
    await client.screenshot('test-failed');
  }
});
```

### 4. Use Appropriate Timeouts
```typescript
// Connection can take time
await client.waitForConnection(30000);

// Messages should be fast
await client.waitForMessage('text', 5000);
```

### 5. Check State Before Actions
```typescript
const state = await client.getWebRTCState();
if (state.dataChannelState !== 'open') {
  throw new Error('Data channel not ready');
}
```

---

## 🎯 Next Steps

1. **Add test IDs to frontend** (see `FRONTEND-INTEGRATION.md`)
2. **Expose WebRTC state** (see `FRONTEND-INTEGRATION.md`)
3. **Run the basic connection test**:
   ```bash
   cd tests/e2e
   npm install
   npm test -- basic-connection
   ```
4. **Implement mobile simulator** or create second browser for full test
5. **Expand test scenarios** (message exchange, video calls, error recovery)

---

**The BrowserClient is production-ready and waiting for you to write tests!** 🚀
