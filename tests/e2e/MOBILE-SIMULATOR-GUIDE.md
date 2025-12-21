# MobileSimulator Implementation Guide

## ✅ What's Implemented

The **MobileSimulator** is a Node.js-based WebRTC client that simulates a mobile app for E2E testing. It uses `wrtc` (node-webrtc) to create real WebRTC connections without a browser.

### Core Features

- ✅ WebSocket signaling connection
- ✅ WebRTC peer connection with ICE servers
- ✅ Automatic offer/answer negotiation
- ✅ ICE candidate buffering and flushing
- ✅ Data channel management
- ✅ Text message send/receive
- ✅ Fake media stream creation for testing
- ✅ Connection state monitoring
- ✅ Comprehensive logging with TestLogger
- ✅ Glare prevention (role-based negotiation)
- ✅ Duplicate offer prevention

---

## 📖 API Reference

### Constructor

```typescript
const client = new MobileSimulator(logger, options);
```

**Parameters**:
- `logger: TestLogger` - Logger instance
- `options?: MobileSimulatorOptions`
  - `role?: 'host' | 'guest'` - Connection role (default: 'guest')
  - `deviceName?: string` - Device identifier (default: 'MobileSimulator')
  - `autoConnect?: boolean` - Auto-create offer when session joined (default: true)

### Methods

#### `async connect(token: string): Promise<void>`
Connect to session via WebSocket.

```typescript
await client.connect('abc123def456');
```

Automatically:
- Establishes WebSocket connection
- Sends session-join message
- Initializes peer connection (if autoConnect enabled)

---

#### `async initializePeerConnection(): Promise<void>`
Manually initialize WebRTC peer connection.

```typescript
await client.initializePeerConnection();
```

Creates RTCPeerConnection with:
- ICE servers from environment variables
- Event handlers for connection state changes
- ICE candidate handlers
- Data channel handlers

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
Send a text message through the data channel.

```typescript
await client.sendMessage('Hello from mobile!');
```

---

#### `async waitForMessage(expectedText: string, timeout?: number): Promise<void>`
Wait for a message to be received.

```typescript
await client.waitForMessage('Hello back!', 10000);
```

---

#### `getWebRTCState(): WebRTCState`
Get current WebRTC connection state.

```typescript
const state = client.getWebRTCState();
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

#### `getReceivedMessages(): string[]`
Get all received messages.

```typescript
const messages = client.getReceivedMessages();
console.log(messages); // ['Hello from browser', 'How are you?']
```

---

#### `async close(): Promise<void>`
Close all connections.

```typescript
await client.close();
```

Closes:
- Data channel
- Peer connection
- WebSocket connection

---

#### `isConnected(): boolean`
Check if WebSocket is connected.

```typescript
if (client.isConnected()) {
  console.log('WebSocket is open');
}
```

---

## 🚀 Usage Examples

### Example 1: Basic Connection Test

```typescript
import { MobileSimulator } from '../clients/mobile-simulator';
import { TestLogger } from '../utils/logger';

const logger = new TestLogger('test', './output');
const client = new MobileSimulator(logger, {
  role: 'guest',
  deviceName: 'TestDevice',
});

// Connect to session
await client.connect('your-token-here');

// Wait for connection
await client.waitForConnection();
await client.waitForDataChannel();

// Verify state
const state = client.getWebRTCState();
expect(state.dataChannelState).toBe('open');

// Cleanup
await client.close();
```

---

### Example 2: Browser-Mobile Connection

```typescript
const browser = new BrowserClient(browserLogger);
const mobile = new MobileSimulator(mobileLogger, {
  role: 'guest',
});

// Browser joins as host
await browser.launch();
await browser.navigateToSession(token);

// Mobile joins as guest
await mobile.connect(token);

// Wait for connection
await Promise.all([
  browser.waitForConnection(),
  mobile.waitForConnection(),
]);

// Wait for data channel
await Promise.all([
  browser.waitForDataChannel(),
  mobile.waitForDataChannel(),
]);

// Both connected!
console.log('Browser and mobile connected');

// Cleanup
await browser.close();
await mobile.close();
```

---

### Example 3: Message Exchange

```typescript
const host = new MobileSimulator(hostLogger, {
  role: 'host',
  autoConnect: true,
});
const guest = new MobileSimulator(guestLogger, {
  role: 'guest',
  autoConnect: false, // Guest responds to offer
});

// Both connect to same token
await host.connect(token);
await guest.connect(token);

// Wait for data channels
await host.waitForDataChannel();
await guest.waitForDataChannel();

// Exchange messages
await host.sendMessage('Hello from host!');
await guest.waitForMessage('Hello from host!');

await guest.sendMessage('Hello back!');
await host.waitForMessage('Hello back!');

// Verify messages
const hostMessages = host.getReceivedMessages();
const guestMessages = guest.getReceivedMessages();

expect(hostMessages).toContain('Hello back!');
expect(guestMessages).toContain('Hello from host!');
```

---

### Example 4: Error Handling

```typescript
try {
  await client.waitForConnection(30000);
} catch (error) {
  // Connection failed
  console.error('Connection failed:', error.message);

  // Check state for debugging
  const state = client.getWebRTCState();
  console.log('Final state:', state);

  // Logs are automatically saved by TestLogger
}
```

---

### Example 5: Custom Role Configuration

```typescript
// Host that creates offers
const host = new MobileSimulator(logger, {
  role: 'host',
  autoConnect: true,  // Auto-create offer after session joined
});

// Guest that waits for offers
const guest = new MobileSimulator(logger, {
  role: 'guest',
  autoConnect: false, // Wait for offer, then answer
});
```

---

## 🔧 Configuration

### Environment Variables

Create `tests/e2e/.env`:

```bash
# WebSocket server
TEST_WS_BASE_URL=ws://localhost:50001

# ICE servers (STUN)
TEST_WEBRTC_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302

# ICE servers (TURN) - Optional
TEST_WEBRTC_TURN_URLS=turn:your-turn-server.com:3478
TEST_WEBRTC_TURN_USER=username
TEST_WEBRTC_TURN_PASSWORD=password

# Or use JSON configuration
TEST_WEBRTC_ICE_SERVERS='[{"urls":["stun:stun.l.google.com:19302"]},{"urls":["turn:turn.example.com:3478"],"username":"user","credential":"pass"}]'
```

### Role-Based Behavior

**Host** (`role: 'host'`):
- Creates data channel
- Sends offer after session joined
- Waits for answer from guest

**Guest** (`role: 'guest'`):
- Waits for data channel from host
- Receives offer
- Sends answer

---

## 🐛 Troubleshooting

### "wrtc module not found" Error

**Problem**: `wrtc` package not installed

**Solution**:
```bash
cd tests/e2e
npm install wrtc
```

**Note**: `wrtc` requires native compilation. On some systems you may need:
- Node.js 16 or later
- Build tools (python, make, g++)

**macOS**:
```bash
xcode-select --install
```

**Ubuntu**:
```bash
sudo apt-get install build-essential
```

---

### Connection Timeout

**Problem**: WebRTC connection not establishing

**Solution**:
1. Verify WebSocket server is running
2. Check ICE servers are configured correctly
3. Ensure both clients using same token
4. Review logs for errors:
   ```typescript
   const state = client.getWebRTCState();
   console.log(state);
   ```

---

### "Cannot add ICE candidate" Errors

**Problem**: ICE candidates being added before remote description

**Solution**: This is handled automatically by the ICE candidate buffer. Candidates are buffered until `setRemoteDescription` is called.

---

### Signaling State Errors

**Problem**: Receiving answer in wrong signaling state

**Solution**: This is the duplicate offer bug fix. The simulator now:
1. Checks `hasSentOffer` flag before creating offers
2. Validates signaling state before applying answers
3. Prevents duplicate offer/answer cycles

---

### Data Channel Not Opening

**Problem**: Data channel stuck in 'connecting' state

**Solution**:
1. Ensure host creates data channel (`role: 'host'`)
2. Verify offer/answer exchange completed
3. Check ICE candidates are being exchanged
4. Review connection state:
   ```typescript
   const state = client.getWebRTCState();
   console.log('Connection:', state.connectionState);
   console.log('ICE:', state.iceConnectionState);
   ```

---

## 📊 Logging

All WebRTC events are automatically logged:

```typescript
const logger = new TestLogger('mobile', './output');
const client = new MobileSimulator(logger);

// Logs include:
// - WebSocket connection events
// - Signaling messages (offer/answer/candidate)
// - WebRTC state changes
// - ICE candidate events
// - Data channel events
// - Messages sent/received

// Save logs to file
logger.saveToFile(); // Creates: output/mobile-{timestamp}.log
```

Log levels:
- `info`: Major events (connection, disconnection)
- `webrtc`: WebRTC-specific events
- `signal`: Signaling messages
- `debug`: Detailed debugging info
- `error`: Errors and failures

---

## 🧪 Testing Best Practices

### 1. Always Close Connections
```typescript
afterAll(async () => {
  await client.close();
});
```

### 2. Use Appropriate Timeouts
```typescript
// Connection can take time
await client.waitForConnection(30000);

// Messages should be fast
await client.waitForMessage('text', 5000);
```

### 3. Check State Before Actions
```typescript
const state = client.getWebRTCState();
if (state.dataChannelState !== 'open') {
  throw new Error('Data channel not ready');
}
```

### 4. Role Assignment
- **Browser tests**: Browser = host, Mobile = guest
- **Mobile-mobile tests**: First = host, Second = guest

### 5. Error Recovery
```typescript
try {
  await client.waitForConnection();
} catch (error) {
  // Log state for debugging
  console.log('State:', client.getWebRTCState());
  // Logs automatically saved by TestLogger
  throw error;
}
```

---

## 🎯 Implementation Details

### Signaling Flow

1. **Session Join**:
   ```
   Mobile → Server: WebSocket connect
   Mobile → Server: session-joined message
   Server → Mobile: session-joined confirmation
   ```

2. **Offer/Answer** (Host creates offer):
   ```
   Host: Create offer → Set local description
   Host → Server → Guest: offer
   Guest: Set remote description → Create answer → Set local description
   Guest → Server → Host: answer
   Host: Set remote description
   ```

3. **ICE Candidates**:
   ```
   Both peers:
     onicecandidate → Send to server → Remote peer
     Buffer candidates until remote description set
     Flush buffer after setRemoteDescription
   ```

### Duplicate Offer Prevention

The simulator implements the fix for the duplicate offer bug:

```typescript
// Check before creating offer
if (this.hasSentOffer) {
  this.logger.warn('Skipping offer creation - already sent');
  return;
}

// Create and send offer
await this.createAndSendOffer();
this.hasSentOffer = true;
```

This prevents:
- Multiple offers from `onnegotiationneeded` + `setTimeout`
- Invalid state transitions
- Connection failures

---

## 📚 Comparison: Browser vs Mobile Simulator

| Feature | BrowserClient | MobileSimulator |
|---------|---------------|-----------------|
| Platform | Playwright (Chromium) | Node.js (wrtc) |
| UI | Real browser UI | No UI |
| Media | Fake devices (video/audio) | Fake MediaStream |
| Control | DOM selectors, clicks | Direct API calls |
| Screenshots | ✅ Yes | ❌ No |
| Console logs | ✅ Captured | N/A |
| WebRTC | Browser native | wrtc library |
| Performance | Slower (full browser) | Faster (headless) |
| Best for | Frontend testing | Backend/API testing |

---

## 🎯 Next Steps

1. **Install dependencies**:
   ```bash
   cd tests/e2e
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Run browser-mobile test**:
   ```bash
   npm test -- browser-mobile-connection
   ```

4. **Review logs**:
   ```bash
   cat output/test-run-latest/mobile-guest-*.log
   ```

---

**The MobileSimulator is production-ready for cross-platform WebRTC testing!** 🚀
