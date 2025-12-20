# Session Flow Testing

## Description
Test the complete ChatOrbit session lifecycle including token creation, host/guest joining, session activation, message exchange, and session expiration. Verifies both backend API and frontend/mobile integration.

## Invocation
Use this skill when:
- User wants to test the complete session flow
- Verifying token system functionality
- Testing session state transitions
- Debugging session lifecycle issues
- Validating WebSocket message exchange
- Testing session expiration and cleanup
- User mentions "test session", "session flow", "token test", or "end-to-end test"

## Instructions

You are a session flow testing specialist for ChatOrbit. Your goal is to systematically test the entire session lifecycle and identify any issues.

### 1. Understand Session Flow

The ChatOrbit session lifecycle:

1. **Token Minting**: First user requests a token with parameters (validity, TTL, char limit)
2. **Host Join**: First device joins session, becomes host, session enters "waiting" state
3. **Guest Join**: Second device joins, session becomes "active", countdown starts
4. **Active Session**: Both participants exchange messages via WebSocket, optional video/audio
5. **Session End**: Timer expires OR manual closure, backend notifies peers, session closes

### 2. Prepare Test Environment

Check that services are running:

```bash
# Check if backend is running
curl http://localhost:50001/health 2>/dev/null || echo "Backend not running"

# Check if frontend is running (if testing locally)
curl http://localhost:3000 2>/dev/null || echo "Frontend not running"
```

Verify environment configuration:
```bash
# Backend config
grep -E "CHAT_" backend/.env.local

# Frontend config
grep -E "NEXT_PUBLIC" frontend/.env.local
```

### 3. Test Token Creation (Backend API)

**Create a test token:**

```bash
# Request a token with specific parameters
curl -X POST http://localhost:50001/api/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "validity_window": "day",
    "active_ttl_minutes": 5,
    "char_limit": 1000
  }' | jq
```

Expected response:
```json
{
  "token": "abc123...",
  "valid_until": "2025-12-21T...",
  "active_ttl_minutes": 5,
  "char_limit": 1000
}
```

**Verify token in database:**

```bash
# Check SQLite database
sqlite3 backend/chat.db "SELECT token, state, valid_until, active_ttl_minutes, char_limit FROM sessions ORDER BY created_at DESC LIMIT 1;"
```

**Test rate limiting:**

```bash
# Try to create 11 tokens rapidly (should fail on 11th)
for i in {1..11}; do
  echo "Request $i:"
  curl -X POST http://localhost:50001/api/tokens \
    -H "Content-Type: application/json" \
    -d '{"validity_window": "day"}' | jq -c
  sleep 0.5
done
```

### 4. Test Host Join (First Peer)

**Simulate host joining:**

```bash
# Use the token from step 3
TOKEN="your-token-here"

# Check session state before join
curl http://localhost:50001/api/sessions/$TOKEN | jq

# WebSocket connection simulation (use websocat or similar)
# This would be done via frontend/mobile in real scenario
```

**Verify session state:**
```bash
# Should show state="waiting", host_joined=true
curl http://localhost:50001/api/sessions/$TOKEN | jq '.state, .host_joined, .guest_joined'
```

### 5. Test Guest Join (Second Peer)

**Simulate guest joining:**

The second peer should:
1. Connect with same token
2. Trigger session activation
3. Start countdown timer

**Verify session activated:**
```bash
# Should show state="active", both host_joined and guest_joined=true
curl http://localhost:50001/api/sessions/$TOKEN | jq '.state, .host_joined, .guest_joined, .started_at'
```

### 6. Test Message Exchange

**Send messages via WebSocket:**

If testing manually, use browser console or websocat:
```javascript
// In browser console (requires WebSocket connection)
ws.send(JSON.stringify({
  type: 'message',
  content: 'Hello from host!',
  sender: 'host'
}));
```

**Backend verification:**
```bash
# Check messages table
sqlite3 backend/chat.db "SELECT sender, content, created_at FROM messages WHERE session_token='$TOKEN' ORDER BY created_at;"
```

**Test message deletion:**
```javascript
// Delete a specific message
ws.send(JSON.stringify({
  type: 'delete_message',
  message_id: 123
}));
```

### 7. Test Session Expiration

**Option A: Wait for natural expiration**
- If TTL is short (e.g., 5 minutes), wait and monitor

**Option B: Manually expire session**
```bash
# Update session to expired state
sqlite3 backend/chat.db "UPDATE sessions SET state='expired', ended_at=datetime('now') WHERE token='$TOKEN';"
```

**Verify cleanup:**
- WebSocket connections closed
- Both peers notified
- Session state = "expired"
- No new messages accepted

### 8. Test Edge Cases

**Invalid token:**
```bash
curl http://localhost:50001/api/sessions/invalid-token-123
# Should return 404
```

**Expired token:**
```bash
# Try to join session with expired token
# Should reject join attempt
```

**Third peer attempt:**
```bash
# Try to join already-full session (2 peers already connected)
# Should reject with appropriate error
```

**Message over char limit:**
```javascript
// Send message exceeding session's char_limit
ws.send(JSON.stringify({
  type: 'message',
  content: 'x'.repeat(10000), // If char_limit is 1000
  sender: 'host'
}));
// Should be rejected
```

**Session after expiration:**
```bash
# Try to send message after session expired
# Should fail gracefully
```

### 9. Frontend/Mobile Integration Testing

**Manual browser test:**
1. Open frontend: http://localhost:3000
2. Create token via UI
3. Open session page in first browser tab (host)
4. Copy token, open in second tab/browser (guest)
5. Verify connection, countdown, message exchange
6. Test video/audio chat (requires WebRTC)

**Mobile app test:**
1. Start mobile app
2. Enter token from backend
3. Connect and test session flow
4. Verify mobile-to-browser compatibility

### 10. Automated Test Suite

**Run backend tests:**
```bash
cd backend
pytest tests/test_sessions.py -v
```

**Check test coverage:**
```bash
cd backend
pytest --cov=app tests/ --cov-report=html
```

**Review test results:**
- All tests passing?
- Any flaky tests?
- Coverage of session lifecycle?

### 11. Generate Test Report

Create a comprehensive report:

**Session Flow Test Report**
- ✅/❌ Token creation
- ✅/❌ Rate limiting
- ✅/❌ Host join
- ✅/❌ Guest join
- ✅/❌ Session activation
- ✅/❌ Message exchange
- ✅/❌ Message deletion
- ✅/❌ Session expiration
- ✅/❌ Cleanup after expiration
- ✅/❌ Edge case handling
- ✅/❌ Frontend integration
- ✅/❌ Mobile integration

**Issues Found:**
- List any failures, bugs, or unexpected behavior
- Include error messages, logs, stack traces

**Recommendations:**
- Suggested fixes
- Code improvements
- Additional test coverage needed

### 12. Fix Issues

Based on test results:
- Fix backend API issues (`backend/app/main.py`, `backend/app/models.py`)
- Fix WebSocket handling issues
- Update frontend session logic (`frontend/components/session-view.tsx`)
- Fix mobile app issues (`mobile/src/utils/webrtc.ts`)
- Add missing error handling
- Improve validation

### 13. Regression Testing

After fixes:
1. Re-run all tests
2. Verify fixes don't break existing functionality
3. Test cross-platform compatibility
4. Update documentation if behavior changed

## Tools to Use

- `Bash`: Run curl commands, database queries, pytest
- `Read`: Examine backend/frontend code, test files, logs
- `Grep`: Search for session-related code, error patterns
- `Edit`: Fix issues found during testing
- `Write`: Create test scripts or documentation
- `mcp__plugin_compound-engineering_pw__*`: Browser automation for frontend testing

## Key Files

- `backend/app/main.py` - Session API endpoints, WebSocket handling
- `backend/app/models.py` - Session and Message models
- `backend/app/schemas.py` - Request/response validation
- `backend/tests/test_sessions.py` - Existing test suite
- `frontend/components/session-view.tsx` - Frontend session UI
- `frontend/lib/api.ts` - Frontend API client
- `mobile/App.tsx` - Mobile app session logic

## Success Criteria

- All session lifecycle stages work correctly
- Rate limiting enforced properly
- WebSocket messages exchanged successfully
- Sessions expire and clean up properly
- Edge cases handled gracefully
- Frontend and mobile apps integrate correctly
- All automated tests pass
- No regressions introduced

## Notes

- Test with actual WebSocket connections when possible (not just API calls)
- Consider testing with slow networks or connection interruptions
- Verify email notifications work (if configured)
- Test abuse reporting flow (separate skill or manual test)
- Document any environment-specific requirements
- Keep test tokens for debugging (mark them for cleanup)
