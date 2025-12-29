# WebRTC E2E Test Suite - Comprehensive Guide

## Overview

This comprehensive E2E test suite validates WebRTC communication across ChatOrbit's browser and mobile platforms, ensuring cross-platform compatibility, error recovery, and protocol compliance based on the official WebRTC protocol specification.

## Test Coverage

### 1. Text Chat Tests (`text-chat.test.ts`)

**Purpose**: Validate message delivery, encryption/decryption, ACK handling, and message ordering.

**Test Cases**:
- ✅ Browser → Mobile message delivery
- ✅ Mobile → Browser message delivery
- ✅ Message encryption/decryption verification (AES-GCM)
- ✅ ACK message exchange verification
- ✅ Message ordering consistency
- ✅ Bidirectional concurrent messaging

**Key Validations**:
- End-to-end encryption (AES-GCM with session token as key)
- Special character handling (Unicode, emojis, newlines, tabs)
- Long message support (up to configured char limit)
- ACK protocol (browser sends, mobile sends per v2 spec)
- Message delivery order preservation

### 2. Video Call Tests (`video-calls.test.ts`)

**Purpose**: Test video call initiation, acceptance, rejection, renegotiation, and chat continuity.

**Test Cases**:
- ✅ Browser initiates → Mobile accepts
- ✅ Mobile initiates → Browser accepts
- ✅ Renegotiation after track changes (onnegotiationneeded)
- ✅ Stop video (keep text chat active)
- ✅ Text messaging during active video call
- ✅ Video call rejection handling

**Key Validations**:
- Perfect Negotiation Pattern implementation
- Video track addition triggers renegotiation
- DataChannel remains open during video
- Video can be stopped without disrupting text chat
- Browser: Automatic renegotiation via `onnegotiationneeded`
- Mobile: Explicit renegotiation via `handleVideoAccept()`

### 3. Connection Recovery Tests (`connection-recovery-comprehensive.test.ts`)

**Purpose**: Validate error recovery mechanisms and resilience.

**Test Cases**:
- ✅ DataChannel timeout recovery (mobile 15s timeout)
- ✅ ICE connection failure monitoring
- ✅ WebSocket disconnect → reconnection
- ✅ Offer collision handling (Perfect Negotiation)
- ✅ Stuck message resolution on WebSocket reconnect
- ✅ Connection state recovery after temporary network issue
- ✅ Progressive recovery: ICE restart → connection reset

**Key Validations**:
- Mobile: 15-second DataChannel timeout with recovery
- Browser: 10-20s adaptive timeout based on network speed
- ICE restart mechanism when connection fails
- WebSocket exponential backoff (1s → 30s, max 5 attempts)
- Offer collision uses rollback pattern
- Stuck "sending" messages resolved on reconnection

### 4. Cross-Platform Compatibility Tests (`cross-platform.test.ts`)

**Purpose**: Ensure seamless communication across all platform combinations.

**Test Cases**:
- ✅ Browser-to-Browser chat
- ✅ Mobile-to-Mobile chat
- ✅ Browser-to-Mobile chat (Browser as Host)
- ✅ Mobile-to-Browser chat (Mobile as Host)
- ✅ Message format compatibility
- ✅ ICE candidate format compatibility (camelCase vs kebab-case)
- ✅ Video call protocol compatibility

**Key Validations**:
- Browser sends `iceCandidate` (camelCase), mobile accepts both formats
- Mobile sends `ice-candidate` (kebab-case), browser accepts both formats
- Message format: Browser-compatible `{ type: 'message', message: {...} }`
- Call protocol: `{ type: 'call', action: 'request|accept|end', from: id }`
- Encryption key derivation: SHA-256 of session token (shared secret)

## Test Infrastructure

### Directory Structure

```
tests/e2e/
├── scenarios/                              # Test scenarios
│   ├── text-chat.test.ts                  # Message delivery tests
│   ├── video-calls.test.ts                # Video call flow tests
│   ├── connection-recovery-comprehensive.test.ts  # Error recovery tests
│   ├── cross-platform.test.ts             # Platform compatibility tests
│   ├── basic-connection.test.ts           # (Existing) Simple connection
│   └── browser-mobile-connection.test.ts  # (Existing) Browser-mobile
├── clients/
│   ├── browser-client.ts                  # Playwright browser automation
│   └── mobile-simulator.ts                # Node.js WebRTC simulator (wrtc)
├── utils/
│   ├── test-helpers.ts                    # Common test utilities
│   ├── token-helper.ts                    # Session token management
│   ├── logger.ts                          # Structured logging
│   └── webrtc-config.ts                   # WebRTC configuration
├── config/
│   └── test-config.ts                     # Centralized test config
└── setup/
    ├── global-setup.ts                    # Jest global setup
    ├── global-teardown.ts                 # Jest global teardown
    └── test-setup.ts                      # Per-test setup
```

### Test Helpers (`utils/test-helpers.ts`)

**Utilities**:
- `waitFor()` - Wait for condition with timeout
- `waitForConnection()` - Wait for WebRTC connection with logging
- `waitForDataChannel()` - Wait for DataChannel with logging
- `createTestToken()` - Create session token with logging
- `verifyMessageDelivery()` - Assert message was delivered
- `verifyConnectionState()` - Assert connection state matches expected
- `verifyStableConnection()` - Assert all connection states are stable
- `cleanup()` - Clean up multiple clients
- `generateTestMessage()` - Generate unique test message
- `delay()` - Wait with logging
- `retry()` - Retry operation with exponential backoff
- `measureTime()` - Measure execution time
- `exchangeMessages()` - Bidirectional message exchange
- `getTestEnvironment()` - Get test environment config

**Constants**:
```typescript
TEST_DEFAULTS = {
  CONNECTION_TIMEOUT: 90000,
  DATACHANNEL_TIMEOUT: 90000,
  MESSAGE_TIMEOUT: 10000,
  VIDEO_NEGOTIATION_TIMEOUT: 5000,
  TOKEN_VALIDITY: '1_day',
  SESSION_TTL_MINUTES: 30,
  MESSAGE_CHAR_LIMIT: 2000,
}
```

### Test Configuration (`config/test-config.ts`)

**Configuration Sections**:
- **Backend**: API and WebSocket URLs
- **WebRTC**: STUN/TURN server configuration
- **Timeouts**: Connection, DataChannel, message, video negotiation
- **Browser**: Headless mode, slow motion, screenshot/video paths
- **Session**: Validity period, TTL, message char limit
- **Logging**: Log level, file output, output directory

**Environment Variables**:
```bash
# Backend
TEST_API_BASE_URL=http://localhost:50001
TEST_WS_BASE_URL=ws://localhost:50001

# WebRTC
TEST_WEBRTC_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
TEST_WEBRTC_TURN_URLS=turn:your-turn-server:3478
TEST_WEBRTC_TURN_USER=testuser
TEST_WEBRTC_TURN_PASSWORD=testpass

# Timeouts
TEST_TIMEOUT_CONNECTION=90000
TEST_TIMEOUT_DATACHANNEL=90000
TEST_TIMEOUT_MESSAGE=10000
TEST_TIMEOUT_VIDEO_NEGOTIATION=5000
TEST_TIMEOUT_ICE_GATHERING=30000
TEST_TIMEOUT_RECONNECTION=30000

# Browser
TEST_HEADLESS=false
TEST_SLOW_MO=100

# Session
TEST_SESSION_VALIDITY_PERIOD=1_day
TEST_SESSION_TTL_MINUTES=30
TEST_SESSION_MESSAGE_CHAR_LIMIT=2000

# Logging
TEST_LOG_LEVEL=debug
TEST_LOG_SAVE_TO_FILE=true
```

## Running Tests

### Prerequisites

1. **Backend running**:
   ```bash
   cd infra
   docker compose up backend
   ```

2. **Dependencies installed**:
   ```bash
   cd tests/e2e
   npm install
   ```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
# Text chat tests
npm test -- text-chat

# Video call tests
npm test -- video-calls

# Connection recovery tests
npm test -- connection-recovery-comprehensive

# Cross-platform compatibility tests
npm test -- cross-platform
```

### Run Single Test

```bash
# Run specific test by name
npm test -- -t "Browser → Mobile message delivery"
```

### Debugging Tests

```bash
# Run with visible browser
TEST_HEADLESS=false npm test

# Run with slow motion (100ms delay between actions)
TEST_SLOW_MO=100 npm test

# Run with debug logging
TEST_LOG_LEVEL=debug npm test

# Run single test in debug mode
npm run test:debug -- -t "Browser → Mobile message delivery"
```

### Watch Mode

```bash
npm run test:watch
```

## Test Output

### Directory Structure

```
output/
└── test-run-{timestamp}/
    ├── logs/
    │   ├── browser-sender.log
    │   ├── mobile-receiver.log
    │   ├── text-chat-tests.log
    │   └── ...
    ├── screenshots/
    │   ├── connection-success-host.png
    │   ├── connection-success-guest.png
    │   └── ...
    ├── videos/
    │   ├── browser-host.webm
    │   └── browser-guest.webm
    └── test-report.html
```

### HTML Report

After tests run, open `output/test-report.html` to view:
- Test results summary
- Pass/fail status for each test
- Execution time
- Console logs
- Failure messages with stack traces

## Protocol Compliance

### Message Formats

**Text Chat Message** (DataChannel):
```json
{
  "type": "message",
  "message": {
    "sessionId": "token_abc123",
    "messageId": "uuid-v4",
    "participantId": "participant_id",
    "role": "host" | "guest",
    "createdAt": "2024-12-28T10:30:00.000Z",
    "encryptedContent": "base64_encrypted_payload",
    "hash": "",
    "encryption": "aes-gcm"
  }
}
```

**ACK Message** (DataChannel):
```json
{
  "type": "ack",
  "messageId": "uuid-v4"
}
```

**Video Call Messages** (DataChannel):
```json
// Request
{ "type": "call", "action": "request", "from": "participant_id" }

// Accept
{ "type": "call", "action": "accept", "from": "participant_id" }

// Reject
{ "type": "call", "action": "reject", "from": "participant_id" }

// End
{ "type": "call", "action": "end", "from": "participant_id" }

// Renegotiate (mobile guest → browser host)
{ "type": "call", "action": "renegotiate" }
```

**Signaling Messages** (WebSocket):
```json
// Offer/Answer
{
  "type": "signal",
  "signalType": "offer" | "answer",
  "payload": { "type": "offer|answer", "sdp": "..." }
}

// ICE Candidate (browser: camelCase)
{
  "type": "signal",
  "signalType": "iceCandidate",
  "payload": { "candidate": "...", "sdpMLineIndex": 0, "sdpMid": "0" }
}

// ICE Candidate (mobile: kebab-case)
{
  "type": "signal",
  "signalType": "ice-candidate",
  "payload": { "candidate": "...", "sdpMLineIndex": 0, "sdpMid": "0" }
}
```

### Encryption

- **Algorithm**: AES-GCM (256-bit)
- **Key Derivation**: SHA-256 hash of session token
- **IV**: Random 12 bytes per message
- **Format**: `base64(IV (12 bytes) + Ciphertext + Auth Tag (16 bytes))`

## Test Best Practices

### 1. Always Clean Up

```typescript
afterEach(async () => {
  await browserClient?.close();
  await mobileClient?.close();
});
```

### 2. Use Descriptive Test Names

```typescript
test('Browser → Mobile message delivery with special characters', async () => {
  // ...
});
```

### 3. Log Important Events

```typescript
logger.info('Sending message from browser', { message: testMessage });
await browserClient.sendMessage(testMessage);
logger.info('Message sent successfully');
```

### 4. Use Helpers for Common Operations

```typescript
import { exchangeMessages, verifyStableConnection } from '../utils/test-helpers';

// Exchange messages
await exchangeMessages(browserClient, mobileClient, 'Hello', 'Hi', logger);

// Verify connection
const state = await browserClient.getWebRTCState();
verifyStableConnection(state, logger);
```

### 5. Set Appropriate Timeouts

```typescript
test('Connection establishment', async () => {
  // ...
}, 150000); // 150 seconds for complex scenarios
```

## Troubleshooting

### Tests Timeout

**Symptom**: Tests fail with "Timeout waiting for connection"

**Solutions**:
- Check backend is running: `docker compose ps`
- Verify STUN servers are accessible
- Check firewall settings
- Increase timeout: `TEST_TIMEOUT_CONNECTION=120000 npm test`

### DataChannel Doesn't Open

**Symptom**: "DataChannel failed to open within timeout"

**Solutions**:
- Check ICE candidate exchange in logs
- Verify TURN server credentials if behind restrictive NAT
- Check for offer collision in logs
- Verify signaling messages are being exchanged

### Messages Not Received

**Symptom**: "Message not found in received messages"

**Solutions**:
- Check DataChannel is open: verify `dataChannelState === 'open'`
- Check encryption key derivation (should be same session token)
- Verify message format matches protocol spec
- Check for ACK messages in logs

### Video Renegotiation Fails

**Symptom**: Connection drops after adding video tracks

**Solutions**:
- Verify `onnegotiationneeded` listener is registered
- Check signaling state before creating offer
- Verify offer/answer exchange completes
- Check for ICE restart events

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E WebRTC Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Start backend
        run: |
          cd infra
          docker compose up -d backend
          sleep 5

      - name: Install dependencies
        run: |
          cd tests/e2e
          npm install

      - name: Run tests
        env:
          TEST_HEADLESS: true
          TEST_LOG_LEVEL: info
        run: |
          cd tests/e2e
          npm test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: tests/e2e/output/

      - name: Stop backend
        if: always()
        run: |
          cd infra
          docker compose down
```

## Known Limitations

1. **Video Simulation**: MobileSimulator doesn't fully simulate video tracks (uses wrtc library which has limited media support)
2. **Network Simulation**: Cannot easily simulate network failures without additional tooling
3. **Mobile Platform**: Tests use Node.js WebRTC implementation, not actual React Native
4. **Browser Automation**: Limited to Chromium-based browsers via Playwright

## Future Enhancements

- [ ] Real device testing (iOS/Android via Appium)
- [ ] Network condition simulation (latency, packet loss)
- [ ] Performance benchmarking
- [ ] Video quality testing
- [ ] Screen sharing tests
- [ ] Multiple participant support (when implemented)
- [ ] Stress testing (many concurrent sessions)

---

**Last Updated**: December 2024
**Test Suite Version**: 2.0
**Protocol Version**: 1.0
