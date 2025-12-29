# WebRTC Refactoring Plan

**Status**: Planning Phase
**Created**: 2025-12-20
**Objective**: Extract WebRTC logic from `mobile/App.tsx` into reusable hooks and utilities

---

## Current State

The mobile WebRTC implementation is currently embedded in `mobile/App.tsx` (~2000 lines), making it:
- Difficult to test in isolation
- Hard to reuse across components
- Challenging to maintain and debug
- Tightly coupled to UI state

**Primary File**: `mobile/App.tsx` (lines ~148-2000+)

**Dependencies**:
- `react-native-webrtc` - Native WebRTC bindings
- `mobile/src/utils/webrtc.ts` - ICE server configuration
- `mobile/src/types/webrtc.ts` - TypeScript type definitions

---

## Refactoring Strategy

### Phase 1: Extract Utility Functions (Low Risk)

Move pure functions that don't depend on React hooks into utility modules.

#### 1.1 Create `mobile/src/utils/webrtc-signaling.ts`

**Functions to Extract**:
- `summarizeSignalPayload(signalType, payload)` - Log-friendly signal summaries
- `getCandidateKey(candidate)` - ICE candidate deduplication key
- `isDuplicateCandidate(candidate, seenSet)` - Duplicate detection

**Benefits**:
- Easier unit testing
- Reusable across frontend and mobile
- No breaking changes to App.tsx

**Estimated Effort**: 2 hours

---

#### 1.2 Create `mobile/src/utils/webrtc-state-machine.ts`

**Exports**:
```typescript
export type SignalingState = 'stable' | 'have-local-offer' | 'have-remote-offer' | 'closed';

export function canCreateOffer(state: SignalingState): boolean {
  return state === 'stable';
}

export function shouldDeferNegotiation(state: SignalingState): boolean {
  return state !== 'stable';
}

export class NegotiationStateMachine {
  private pendingNegotiation: boolean = false;

  shouldDefer(state: SignalingState): boolean {
    if (shouldDeferNegotiation(state)) {
      this.pendingNegotiation = true;
      return true;
    }
    this.pendingNegotiation = false;
    return false;
  }

  hasPendingNegotiation(): boolean {
    return this.pendingNegotiation;
  }

  clearPending(): void {
    this.pendingNegotiation = false;
  }

  reset(): void {
    this.pendingNegotiation = false;
  }
}
```

**Benefits**:
- Encapsulates negotiation state logic
- Documents state machine rules
- Easier to test state transitions

**Estimated Effort**: 3 hours

---

### Phase 2: Extract ICE Candidate Management (Medium Risk)

Create a class or hook to manage ICE candidate buffering and deduplication.

#### 2.1 Create `mobile/src/hooks/useIceCandidateBuffer.ts`

```typescript
import { useRef, useCallback } from 'react';

export interface IceCandidate {
  candidate: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
}

export function useIceCandidateBuffer() {
  const pendingCandidatesRef = useRef<IceCandidate[]>([]);
  const seenCandidatesRef = useRef<Set<string>>(new Set());

  const getCandidateKey = useCallback((candidate: IceCandidate): string => {
    return `${candidate.candidate}|${candidate.sdpMid}|${candidate.sdpMLineIndex}`;
  }, []);

  const isDuplicate = useCallback((candidate: IceCandidate): boolean => {
    const key = getCandidateKey(candidate);
    return seenCandidatesRef.current.has(key);
  }, [getCandidateKey]);

  const addCandidate = useCallback((candidate: IceCandidate): boolean => {
    if (isDuplicate(candidate)) {
      return false; // Already seen
    }

    const key = getCandidateKey(candidate);
    seenCandidatesRef.current.add(key);
    pendingCandidatesRef.current.push(candidate);
    return true; // Added
  }, [isDuplicate, getCandidateKey]);

  const getPending = useCallback((): IceCandidate[] => {
    return [...pendingCandidatesRef.current];
  }, []);

  const clearPending = useCallback((): IceCandidate[] => {
    return pendingCandidatesRef.current.splice(0);
  }, []);

  const reset = useCallback(() => {
    pendingCandidatesRef.current = [];
    seenCandidatesRef.current.clear();
  }, []);

  return {
    addCandidate,
    isDuplicate,
    getPending,
    clearPending,
    reset,
    count: pendingCandidatesRef.current.length,
  };
}
```

**Migration Path**:
1. Import `useIceCandidateBuffer` in App.tsx
2. Replace `pendingCandidatesRef` and `seenCandidatesRef` with hook
3. Update all usages to call hook methods
4. Test thoroughly with real WebRTC connections

**Estimated Effort**: 4 hours

---

### Phase 3: Extract Peer Connection Hook (High Risk)

This is the largest refactoring and should be done incrementally.

#### 3.1 Create `mobile/src/hooks/useWebRtcPeerConnection.ts`

**Responsibilities**:
- Manage `RTCPeerConnection` lifecycle
- Handle signaling state machine
- Coordinate ICE candidate management
- Trigger renegotiation when needed

**Interface**:
```typescript
export interface WebRtcPeerConnectionHookParams {
  iceServers: IceServer[];
  participantRole: 'host' | 'guest';
  onSignal: (signalType: string, payload: unknown) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
  onDataChannel?: (channel: RTCDataChannel) => void;
  onTrack?: (event: RTCTrackEvent) => void;
}

export interface WebRtcPeerConnectionHook {
  // State
  peerConnection: RTCPeerConnection | null;
  signalingState: RTCSignalingState;
  iceConnectionState: RTCIceConnectionState;

  // Actions
  createOffer: () => Promise<void>;
  handleRemoteOffer: (offer: RTCSessionDescriptionInit) => Promise<void>;
  handleRemoteAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
  handleIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  addTrack: (track: MediaStreamTrack, stream: MediaStream) => void;
  removeTrack: (sender: RTCRtpSender) => void;
  reset: () => void;

  // Metadata
  hasPendingNegotiation: boolean;
  pendingIceCandidatesCount: number;
}

export function useWebRtcPeerConnection(
  params: WebRtcPeerConnectionHookParams
): WebRtcPeerConnectionHook {
  // Implementation follows the patterns in App.tsx
  // with proper separation of concerns
}
```

**Benefits**:
- Encapsulates all WebRTC peer connection logic
- Reusable across different components
- Easier to test in isolation
- Clear interface contract

**Migration Strategy**:
1. Create hook with minimal functionality first
2. Gradually move logic from App.tsx to hook
3. Keep both implementations running in parallel
4. Add feature flag to switch between implementations
5. Test extensively before removing old code

**Estimated Effort**: 16-20 hours

---

### Phase 4: Extract Signaling Hook (Medium Risk)

#### 4.1 Create `mobile/src/hooks/useWebRtcSignaling.ts`

**Responsibilities**:
- Queue outgoing signals when socket disconnected
- Process incoming signal messages
- Coordinate with peer connection hook

**Interface**:
```typescript
export interface WebRtcSignalingHookParams {
  socket: WebSocket | null;
  participantId: string;
  onRemoteOffer: (offer: RTCSessionDescriptionInit) => Promise<void>;
  onRemoteAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
  onIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
}

export interface WebRtcSignalingHook {
  sendSignal: (signalType: string, payload: unknown) => void;
  processSignal: (message: any) => Promise<void>;
  flushQueue: () => void;
  pendingSignalsCount: number;
}

export function useWebRtcSignaling(
  params: WebRtcSignalingHookParams
): WebRtcSignalingHook {
  // Manages signal queuing and processing
}
```

**Estimated Effort**: 6 hours

---

### Phase 5: Extract Media Stream Hook (Low-Medium Risk)

#### 5.1 Create `mobile/src/hooks/useWebRtcMediaStreams.ts`

**Responsibilities**:
- Request camera/microphone permissions
- Manage local media stream lifecycle
- Handle track muting/unmuting
- Switch camera facing direction

**Interface**:
```typescript
export interface WebRtcMediaStreamsHook {
  localAudioStream: MediaStream | null;
  localVideoStream: MediaStream | null;
  remoteVideoStream: MediaStream | null;

  requestCamera: (facing: 'user' | 'environment') => Promise<MediaStream>;
  requestMicrophone: () => Promise<MediaStream>;
  stopLocalTracks: () => void;
  muteAudio: (muted: boolean) => void;
  muteVideo: (muted: boolean) => void;
  switchCamera: () => Promise<void>;

  isLocalAudioMuted: boolean;
  isLocalVideoMuted: boolean;
  preferredCameraFacing: 'user' | 'environment';
}

export function useWebRtcMediaStreams(): WebRtcMediaStreamsHook {
  // Manages getUserMedia and media tracks
}
```

**Estimated Effort**: 8 hours

---

## Proposed File Structure

After refactoring:

```
mobile/
├── src/
│   ├── hooks/
│   │   ├── useWebRtcPeerConnection.ts      # Main peer connection hook
│   │   ├── useWebRtcSignaling.ts           # Signaling logic
│   │   ├── useWebRtcMediaStreams.ts        # Media stream management
│   │   ├── useIceCandidateBuffer.ts        # ICE candidate buffering
│   │   └── useWebRtcSession.ts             # High-level session orchestrator
│   │
│   ├── utils/
│   │   ├── webrtc.ts                       # Existing ICE config (keep)
│   │   ├── webrtc-signaling.ts             # Signaling utilities
│   │   └── webrtc-state-machine.ts         # State machine logic
│   │
│   ├── types/
│   │   └── webrtc.ts                       # Existing types (keep)
│   │
│   └── App.tsx                             # Simplified, uses hooks
```

---

## Testing Strategy

### Unit Tests

Create tests for each new module:

1. **webrtc-signaling.ts**:
   - Test `summarizeSignalPayload` for all signal types
   - Test candidate key generation
   - Test duplicate detection

2. **webrtc-state-machine.ts**:
   - Test state transition rules
   - Test deferred negotiation logic
   - Test reset behavior

3. **useIceCandidateBuffer.ts**:
   - Test candidate buffering
   - Test deduplication
   - Test flush and reset

4. **useWebRtcPeerConnection.ts**:
   - Mock RTCPeerConnection
   - Test offer/answer exchange
   - Test signaling state transitions
   - Test error recovery

### Integration Tests

1. **Browser ↔ Mobile Connection**:
   - Test initial connection establishment
   - Test media track renegotiation
   - Test ICE candidate exchange
   - Test glare condition handling

2. **Error Recovery**:
   - Test ICE failure retry
   - Test setRemoteDescription errors
   - Test socket disconnection recovery

3. **Performance**:
   - Measure connection establishment time
   - Monitor memory usage
   - Check for WebRTC resource leaks

---

## Migration Checklist

### Phase 1 (Utilities)
- [ ] Create `webrtc-signaling.ts` utility
- [ ] Create `webrtc-state-machine.ts` utility
- [ ] Write unit tests for utilities
- [ ] Update App.tsx to import utilities
- [ ] Verify no regression in functionality

### Phase 2 (ICE Buffer)
- [ ] Create `useIceCandidateBuffer.ts` hook
- [ ] Write unit tests for hook
- [ ] Integrate hook into App.tsx
- [ ] Test with real WebRTC connections
- [ ] Verify ICE candidates are properly buffered

### Phase 3 (Peer Connection)
- [ ] Create `useWebRtcPeerConnection.ts` hook skeleton
- [ ] Implement basic offer/answer logic
- [ ] Add signaling state management
- [ ] Add ICE candidate handling
- [ ] Add track management
- [ ] Write comprehensive tests
- [ ] Create feature flag for new implementation
- [ ] Test alongside old implementation
- [ ] Migrate production to new hook
- [ ] Remove old implementation

### Phase 4 (Signaling)
- [ ] Create `useWebRtcSignaling.ts` hook
- [ ] Implement signal queuing
- [ ] Implement signal processing
- [ ] Write tests
- [ ] Integrate into App.tsx
- [ ] Verify signal flow

### Phase 5 (Media Streams)
- [ ] Create `useWebRtcMediaStreams.ts` hook
- [ ] Implement getUserMedia logic
- [ ] Implement muting/unmuting
- [ ] Implement camera switching
- [ ] Write tests
- [ ] Integrate into App.tsx
- [ ] Test on iOS and Android

### Final Steps
- [ ] Create `useWebRtcSession.ts` orchestrator hook
- [ ] Simplify App.tsx to use orchestrator
- [ ] Update documentation
- [ ] Update CHANGELOG.md
- [ ] Create PR with full refactoring

---

## Risk Mitigation

### High-Risk Areas

1. **Peer Connection Lifecycle**:
   - Risk: Hooks recreating peer connection unnecessarily
   - Mitigation: Use stable refs, careful dependency arrays
   - Testing: Monitor connection reset count

2. **State Synchronization**:
   - Risk: React state updates racing with WebRTC callbacks
   - Mitigation: Use refs for critical state, setState only for UI
   - Testing: Stress test with rapid state changes

3. **Memory Leaks**:
   - Risk: Event listeners not cleaned up
   - Mitigation: Proper useEffect cleanup functions
   - Testing: Profile memory usage over time

4. **Mobile Platform Differences**:
   - Risk: iOS/Android WebRTC quirks
   - Mitigation: Test on both platforms throughout
   - Testing: Automated tests on both platforms

### Rollback Plan

If issues arise after deployment:

1. Feature flag allows instant rollback to old implementation
2. Keep old code in commented sections until stable
3. Monitor error logs for WebRTC-specific issues
4. Be prepared to revert PR if critical bugs found

---

## Timeline Estimate

| Phase | Description | Effort | Dependencies |
|-------|-------------|--------|--------------|
| 1 | Extract utilities | 5 hours | None |
| 2 | Extract ICE buffer hook | 4 hours | Phase 1 |
| 3 | Extract peer connection hook | 20 hours | Phase 1, 2 |
| 4 | Extract signaling hook | 6 hours | Phase 3 |
| 5 | Extract media streams hook | 8 hours | None |
| 6 | Testing & integration | 12 hours | All phases |
| 7 | Documentation & cleanup | 4 hours | All phases |

**Total Estimated Effort**: ~59 hours (~7-8 working days)

---

## Success Criteria

Refactoring is successful when:

1. ✅ All WebRTC functionality works identically to current implementation
2. ✅ Browser-mobile connections establish reliably
3. ✅ Media track renegotiation works without glare conditions
4. ✅ ICE candidates are properly buffered and deduplicated
5. ✅ Error recovery mechanisms function correctly
6. ✅ No memory leaks detected
7. ✅ Code is more maintainable (reduced complexity)
8. ✅ Unit test coverage > 80% for new hooks
9. ✅ Documentation updated to reflect new architecture
10. ✅ Performance is equal or better than before

---

## Alternative Approach: Gradual Extraction

Instead of full refactoring, consider:

1. **Start with new features only**: Build new WebRTC features using hooks
2. **Dual implementation**: Run old and new side-by-side
3. **Progressive migration**: Move one piece at a time
4. **Feature parity**: Only remove old code when new is proven

This reduces risk but takes longer to realize benefits.

---

## Recommendation

**Recommended Approach**: Phase 1 + Phase 2 First

Start with low-risk utility extraction and ICE buffer hook:
- Immediate benefits (better testability)
- Low regression risk
- Builds confidence for larger refactoring
- Can stop after Phase 2 if needed

Then evaluate:
- If team velocity is high: Continue to Phase 3
- If stability concerns: Keep current architecture, document well
- If new features planned: Extract as needed incrementally

---

## References

- Current implementation: `mobile/App.tsx:148-2000+`
- Architecture documentation: `docs/architecture.md:1270-1537`
- Resolved issue: `docs/issues.md` (WebRTC browser ↔ mobile troubleshooting)
- Key commits: `21f04f3`, `18171dd`

---

**Next Steps**:
1. Review this plan with team
2. Decide on approach (full refactoring vs. gradual)
3. If approved, start with Phase 1
4. Schedule regular checkpoints to evaluate progress

**Maintainer**: To be assigned
**Last Updated**: 2025-12-20
