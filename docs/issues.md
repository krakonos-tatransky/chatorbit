# Next.js `Cannot read properties of null (reading 'digest')` runtime error

## Symptom

- Log excerpt (Next.js 14.x app router, observed while WebRTC video chat was active):
  ```
  TypeError: Cannot read properties of null (reading 'digest')
      at .../next/dist/compiled/next-server/app-page.runtime.prod.js:13:19762
  ```
- The page stays up, but the server logs the error.

## Likely cause

Next.js expects render-time errors to be `Error` objects (or the special redirect/not-found errors that include an `error.digest` field). If a route throws or rejects with `null`/`undefined` or any non-Error value, Next’s error pipeline attempts to read `error.digest` and crashes with the stack shown above.

This often happens when:

- Code does `throw someValue` where `someValue` can be `null`/`undefined`.
- A `Promise.reject()` call is made without an argument (which becomes `undefined`) or with `null`.
- A library callback rejects with a bare string/number and the caller rethrows it directly.

## What changed in code

- **Added** `frontend/instrumentation.ts` (Dec 20, 2025) to log unhandled rejections and uncaught exceptions, highlighting null/undefined or other non-Error reasons. This makes it obvious which path is throwing non-Error values during rendering.
- **Enabled** instrumentation hook in `frontend/next.config.mjs` with `experimental.instrumentationHook: true`

## Next steps to permanently fix

1. **Audit server components, server actions, and API routes** for any `throw` or `Promise.reject` that forwards unknown values. Wrap unknown errors with `new Error(...)` before throwing.
2. **Watch the instrumentation logs** in the running container. Any line that includes `Promise rejected with null reason` or `Promise rejected with non-Error reason` points to the offending code path.
3. Once the offending call site is identified, normalize the error to an `Error` object (and include any contextual details) before throwing or returning a rejected promise.

# WebRTC browser ↔ mobile troubleshooting

**Status: ✅ RESOLVED** (as of commit 21f04f3, Dec 20, 2025)

The following notes summarize the failure pattern seen in the provided `rn-webrtc` logs and outline immediate fixes to stabilize the connection flow.

## Symptom from the log

- The React Native client receives an SDP answer but `setRemoteDescription` fails, so the peer buffers ICE candidates indefinitely: `failed to apply remote answer - clearing pending candidates`.
- Data channels never open and each 10 second timeout triggers a full peer-connection restart, resulting in repeated offers (`sdpLength` around `470`) and back-to-back closures.
- The answer SDP is much larger (`sdpLength: 3639`) than the offer, suggesting additional media sections are being negotiated on the browser side that are not present in the mobile offer.

## Likely root cause

The browser is generating an answer whose media sections do not match the current offer (for example, including audio/video transceivers when the mobile offer only includes a data channel, or producing an answer for an older/stale offer). When the answer does not align with the outstanding offer, `setRemoteDescription` is rejected and buffered ICE candidates can never be applied, causing the repeated timeouts.

## Remediation checklist

1. **Serialize negotiation on the browser side.** Gate `createAnswer`/`setLocalDescription` behind a simple negotiation lock and ignore answers that do not match `pc.currentLocalDescription?.sdp`. This prevents answers from being generated for stale offers when multiple `onnegotiationneeded` events fire.
2. **Match the offer’s media sections.** When answering a data-channel-only offer, avoid pre-adding audio/video tracks or transceivers before calling `setRemoteDescription` on the incoming offer. If the browser must send media, ensure the mobile side’s offer includes matching `m=` sections (audio/video) before the answer is created.
3. **Surface the rejection reason.** Wrap the browser-side `setRemoteDescription(answer)` call in a `try/catch` and log `error.message` plus the current `signalingState` and `pc.localDescription?.type`. This makes it clear whether the failure is due to a state mismatch (e.g., wrong offer) or an SDP validation error (m-line mismatch, unsupported codec, etc.).
4. **Delay ICE forwarding until the answer sticks.** Keep buffering remote ICE candidates until `setRemoteDescription` resolves successfully, then flush them in order. This avoids discarding valid candidates when the first answer fails and a renegotiation starts.

Applying the above steps on the browser responder will keep the answer aligned with the mobile offer, allow ICE to be applied, and prevent the repeated data-channel timeouts seen in the log.

## Resolution (Dec 20, 2025)

All four remediation items have been successfully implemented in both frontend and mobile:

1. **Negotiation serialization** - Added `negotiationPendingRef` and `signalingState` checks before creating offers. Both platforms now defer renegotiation until state is stable.
   - Frontend: `frontend/components/session-view.tsx:2165-2189`
   - Mobile: `mobile/App.tsx:1421-1428`

2. **Media section matching** - Added checks for `pc.remoteDescription` before attempting renegotiation to ensure media sections align.
   - Mobile: `mobile/App.tsx:1876`

3. **Error surfacing** - Both platforms now wrap `setRemoteDescription` calls in try/catch blocks that log error messages and signaling state.
   - Frontend: `frontend/components/session-view.tsx:2748-2754`
   - Mobile: `mobile/App.tsx:838-846`

4. **ICE buffering** - Both platforms buffer remote ICE candidates until `setRemoteDescription` resolves successfully, then flush them in order.
   - Frontend: `frontend/components/session-view.tsx:2774-2779`
   - Mobile: `mobile/App.tsx:862-874`

Additional improvements:
- Added `onsignalingstatechange` handler to retry deferred negotiations when state becomes stable
- Implemented exponential backoff for ICE failure retries (stale nonce errors)
- Added ICE candidate deduplication to prevent duplicate processing
- Proper state cleanup on peer connection reset

The "glare" condition that caused immediate disconnections after camera permission is now prevented through signaling state management.
