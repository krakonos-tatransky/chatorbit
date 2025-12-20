# WebRTC Debugging and Connection Troubleshooting

## Description
Diagnose and troubleshoot WebRTC connection issues in ChatOrbit, including ICE candidate gathering, STUN/TURN configuration, peer connection states, and browser-mobile compatibility problems.

## Invocation
Use this skill when:
- User reports WebRTC connection failures
- Video/audio chat not establishing
- ICE connection errors appear
- Browser-to-mobile connectivity issues
- Need to verify STUN/TURN configuration
- Debugging peer connection states
- User mentions "WebRTC", "video chat", "connection", "ICE", or "TURN"

## Instructions

You are a WebRTC debugging specialist for ChatOrbit. Your goal is to systematically diagnose and resolve WebRTC connection issues.

### 1. Gather Context

First, understand the problem:
- Which platforms are involved? (browser-to-browser, browser-to-mobile, mobile-to-mobile)
- What error messages appear in console?
- At what stage does connection fail? (ICE gathering, connection, media streaming)
- Are both peers experiencing issues or just one?

### 2. Check Environment Configuration

Verify WebRTC configuration in the frontend:

```bash
# Check environment variables
grep -E "NEXT_PUBLIC_WEBRTC" frontend/.env.local
```

Common issues:
- **Wildcard hosts (0.0.0.0, localhost)**: These cause ICE errors. STUN/TURN URLs must use specific IPs or domain names
- **Missing TURN credentials**: Required for restrictive NAT environments
- **Invalid URL format**: Must be `stun:host:port` or `turn:host:port`

Expected format:
```
NEXT_PUBLIC_WEBRTC_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
NEXT_PUBLIC_WEBRTC_TURN_URLS=turn:your-turn-server.com:3478
NEXT_PUBLIC_WEBRTC_TURN_USER=username
NEXT_PUBLIC_WEBRTC_TURN_PASSWORD=password
```

### 3. Inspect WebRTC Code

Check the WebRTC implementation files:
- `frontend/lib/webrtc.ts` - Browser WebRTC logic
- `mobile/src/utils/webrtc.ts` - Mobile WebRTC logic
- `frontend/components/session-view.tsx` - UI integration

Look for:
- ICE server configuration
- Peer connection initialization
- ICE candidate handling
- Offer/answer exchange logic
- Media stream management

### 4. Live Debugging (if session is running)

If you have access to a running session, use browser tools:

**Console inspection:**
```javascript
// Check ICE connection state
peerConnection.iceConnectionState
peerConnection.connectionState

// Monitor ICE candidates
peerConnection.onicecandidate = (event) => {
  console.log('ICE candidate:', event.candidate);
};

// Check gathered candidates
peerConnection.getStats().then(stats => {
  stats.forEach(report => {
    if (report.type === 'local-candidate') {
      console.log('Local candidate:', report);
    }
  });
});
```

**Network inspection:**
- Check WebSocket messages for offer/answer/candidate exchange
- Verify STUN/TURN server reachability (use browser DevTools Network tab)
- Look for UDP/TCP port blocking issues

### 5. Common Issues and Fixes

#### Issue: ICE gathering fails with "Invalid host candidate"
**Cause**: Wildcard hosts (0.0.0.0, localhost) in ICE configuration
**Fix**: Update STUN/TURN URLs to use specific IPs or domain names

#### Issue: Connection works browser-to-browser but fails browser-to-mobile
**Cause**: Mobile network NAT/firewall restrictions
**Fix**: Configure TURN server with TCP fallback

#### Issue: ICE connection stays in "checking" state
**Cause**: No viable candidate pair found
**Fix**:
1. Verify TURN server is accessible
2. Check TURN credentials are correct
3. Ensure both peers are sending candidates via WebSocket

#### Issue: Media streams not displaying
**Cause**: Track/stream not properly attached
**Fix**: Verify `ontrack` event handler and media element srcObject assignment

### 6. Test STUN/TURN Connectivity

Create a simple test to verify STUN/TURN servers:

```javascript
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-server.com:3478',
      username: 'user',
      credential: 'pass'
    }
  ]
});

pc.createDataChannel('test');
pc.createOffer().then(offer => pc.setLocalDescription(offer));

pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('Candidate type:', event.candidate.type);
    console.log('Candidate:', event.candidate.candidate);
  } else {
    console.log('ICE gathering complete');
  }
};
```

### 7. Generate Diagnostic Report

Create a summary with:
- Environment configuration status
- Identified issues
- Recommended fixes
- Code changes needed (if any)
- Testing steps to verify fixes

### 8. Implement Fixes

Based on findings:
- Update environment variables
- Fix code issues in webrtc.ts files
- Add error handling or fallbacks
- Update documentation

### 9. Verification

After fixes:
- Test browser-to-browser connection
- Test browser-to-mobile connection
- Test mobile-to-mobile connection (if applicable)
- Verify ICE candidates are being gathered
- Confirm media streams work correctly

## Tools to Use

- `Read`: Examine webrtc.ts, session-view.tsx, environment files
- `Grep`: Search for WebRTC-related code, error patterns
- `Edit`: Fix configuration or code issues
- `Bash`: Check environment variables, run test scripts
- `mcp__plugin_compound-engineering_pw__*`: Browser automation for live testing (if available)

## Success Criteria

- WebRTC connections establish successfully
- ICE candidates gather without errors
- Media streams work on all platform combinations
- Clear documentation of any environment requirements
- User can successfully initiate video/audio chat

## Notes

- Always check recent commits for WebRTC-related changes
- Refer to README.md "Troubleshooting WebRTC ICE errors" section
- Consider mobile network restrictions (carrier NAT, firewall)
- TURN server is critical for mobile and restrictive networks
