# WebRTC E2E Tests - Quick Start Guide

## Prerequisites

1. **Docker** - For running the backend
2. **Node.js 18+** - For running tests
3. **npm** - Package manager

## Setup (First Time Only)

### 1. Start the Backend

```bash
cd /Users/erozloznik/Projects/chatorbit-mobile/infra
docker compose up -d backend

# Verify backend is running
docker compose ps
# Should show backend container running on port 50001

# Check logs
docker compose logs -f backend
```

### 2. Install Test Dependencies

```bash
cd /Users/erozloznik/Projects/chatorbit-mobile/tests/e2e
npm install
```

### 3. Configure Environment (Optional)

Create `.env.test` file (or use defaults):

```bash
# Backend URLs (defaults work if backend is on localhost:50001)
TEST_API_BASE_URL=http://localhost:50001
TEST_WS_BASE_URL=ws://localhost:50001

# Test behavior
TEST_HEADLESS=true              # Set to 'false' to see browser
TEST_LOG_LEVEL=debug            # debug | info | warn | error
TEST_TIMEOUT_CONNECTION=90000   # Connection timeout in ms
```

## Running Tests

### Run All Tests

```bash
cd /Users/erozloznik/Projects/chatorbit-mobile/tests/e2e
npm test
```

**Expected Output**:
```
PASS scenarios/text-chat.test.ts (60s)
  ✓ Browser → Mobile message delivery (12s)
  ✓ Mobile → Browser message delivery (11s)
  ✓ Message encryption/decryption verification (18s)
  ...

PASS scenarios/video-calls.test.ts (72s)
  ✓ Browser initiates → Mobile accepts (15s)
  ...

PASS scenarios/connection-recovery-comprehensive.test.ts (84s)
  ✓ DataChannel timeout recovery (18s)
  ...

PASS scenarios/cross-platform.test.ts (63s)
  ✓ Browser-to-Browser chat (9s)
  ...

Test Suites: 4 passed, 4 total
Tests:       26 passed, 26 total
Time:        279s
```

### Run Specific Test Suite

```bash
# Text chat tests only
npm test -- text-chat

# Video call tests only
npm test -- video-calls

# Connection recovery tests only
npm test -- connection-recovery-comprehensive

# Cross-platform tests only
npm test -- cross-platform
```

### Run Single Test

```bash
# Run by test name (use -t flag)
npm test -- -t "Browser → Mobile message delivery"

# Run specific file + specific test
npm test -- text-chat -t "Message encryption"
```

### Debugging Mode

```bash
# Run with visible browser (headless=false)
TEST_HEADLESS=false npm test

# Run with slow motion (100ms delay between actions)
TEST_HEADLESS=false TEST_SLOW_MO=100 npm test

# Run with maximum logging
TEST_LOG_LEVEL=debug npm test

# Debug single test with visible browser
TEST_HEADLESS=false npm test -- -t "Browser → Mobile message delivery"
```

## Understanding Test Output

### Console Output

```
PASS scenarios/text-chat.test.ts
  Text Chat Tests
    ✓ Browser → Mobile message delivery (12345ms)
    ✓ Mobile → Browser message delivery (11234ms)
    ...
```

- ✓ = Test passed
- ✗ = Test failed
- Time in parentheses = execution time

### Detailed Logs

After tests run, logs are saved to:

```
tests/e2e/output/test-run-{timestamp}/
├── logs/
│   ├── text-chat-tests.log      # Main test log
│   ├── browser-sender.log        # Browser client logs
│   ├── mobile-receiver.log       # Mobile client logs
│   └── ...
├── screenshots/
│   ├── connection-success-host.png
│   └── ...
└── test-report.html              # HTML summary
```

Open `test-report.html` in a browser to see:
- Test results summary
- Pass/fail status
- Execution times
- Failure details
- Console logs

### Reading Logs

**Example log file** (`browser-sender.log`):
```
[2024-12-28T10:30:15.123Z] [INFO] Launching browser
[2024-12-28T10:30:16.456Z] [INFO] Navigating to session {token: "abc123..."}
[2024-12-28T10:30:18.789Z] [DEBUG] [WebRTC] Connection state changed {state: "connected"}
[2024-12-28T10:30:19.012Z] [DEBUG] [WebRTC] DataChannel opened
[2024-12-28T10:30:20.345Z] [INFO] Sending message {text: "Test message..."}
```

## Troubleshooting

### Problem: "Connection to localhost:50001 refused"

**Solution**: Backend is not running
```bash
cd infra
docker compose up -d backend
docker compose ps  # Verify it's running
```

### Problem: "Timeout waiting for connection"

**Solutions**:
1. Check backend logs:
   ```bash
   docker compose logs backend
   ```

2. Increase timeout:
   ```bash
   TEST_TIMEOUT_CONNECTION=120000 npm test
   ```

3. Check STUN servers are accessible:
   ```bash
   # Test STUN connectivity
   nc -u -v stun.l.google.com 19302
   ```

### Problem: "DataChannel failed to open within timeout"

**Solutions**:
1. Run with visible browser to see what's happening:
   ```bash
   TEST_HEADLESS=false npm test -- -t "specific test name"
   ```

2. Check browser console in screenshots/logs

3. Verify ICE candidates are being exchanged:
   - Look for "ICE candidate" in logs

### Problem: "Tests pass locally but fail in CI"

**Solutions**:
1. Ensure `TEST_HEADLESS=true` in CI
2. Use longer timeouts in CI (slower environment)
3. Check Docker container has enough resources
4. Verify network connectivity in CI environment

### Problem: All tests fail

**Checklist**:
- ✅ Backend is running (`docker compose ps`)
- ✅ Backend is accessible (`curl $TEST_API_BASE_URL/api/health/database`)
- ✅ Dependencies are installed (`npm install`)
- ✅ Environment variables are set correctly
- ✅ No firewall blocking WebRTC ports

## Test Coverage Summary

| Test Suite | Tests | Focus |
|------------|-------|-------|
| **text-chat.test.ts** | 6 | Message delivery, encryption, ACK, ordering |
| **video-calls.test.ts** | 6 | Video initiation, renegotiation, stop video |
| **connection-recovery-comprehensive.test.ts** | 7 | Error recovery, timeouts, reconnection |
| **cross-platform.test.ts** | 7 | Platform compatibility, message formats |
| **Total** | **26** | **Comprehensive WebRTC validation** |

## Expected Test Duration

- **Full suite**: ~75 minutes
- **Single suite**: ~15-20 minutes
- **Single test**: ~10-15 seconds

*Note: First run may be slower due to browser downloads*

## Next Steps

1. **Run tests**: `npm test`
2. **Review results**: Open `output/test-report.html`
3. **Fix failures**: Check logs in `output/test-run-*/logs/`
4. **Iterate**: Re-run specific failing tests

## Need Help?

- **Protocol Reference**: `/docs/WEBRTC_PROTOCOL.md`
- **Comprehensive Guide**: `/tests/e2e/README-COMPREHENSIVE.md`
- **Test Summary**: `/tests/e2e/TEST-SCENARIOS-SUMMARY.md`
- **Platform Comparison**: `/docs/WEBRTC_PLATFORM_COMPARISON.md`

## Advanced Usage

### Watch Mode

```bash
# Re-run tests on file changes
npm run test:watch
```

### Coverage Report

```bash
# Generate code coverage report
npm run test:coverage

# Open coverage report
open output/coverage/index.html
```

### Filtering Tests

```bash
# Run only tests matching pattern
npm test -- --testNamePattern="Browser.*Mobile"

# Skip tests matching pattern
npm test -- --testNamePattern="^(?!.*Mobile).*$"
```

### Verbose Output

```bash
# Show all console logs
npm test -- --verbose

# Show test titles as they run
npm test -- --verbose --silent=false
```

---

**Quick Reference**:
- Start backend: `cd infra && docker compose up -d backend`
- Run all tests: `cd tests/e2e && npm test`
- Debug single test: `TEST_HEADLESS=false npm test -- -t "test name"`
- View results: `open output/test-report.html`
