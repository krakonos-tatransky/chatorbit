/**
 * Next.js Instrumentation Hook
 *
 * This file provides diagnostic logging for unhandled rejections and exceptions
 * to help identify code paths that throw null/undefined or non-Error values.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * Related Issue: docs/issues.md - "Cannot read properties of null (reading 'digest')"
 */

export async function register() {
  // Only run in Node.js runtime (not Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Track unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      if (reason === null) {
        console.error('[INSTRUMENTATION] ⚠️  Promise rejected with null reason');
        console.error('[INSTRUMENTATION] Promise:', promise);
        console.error('[INSTRUMENTATION] Stack trace:');
        console.trace();
      } else if (reason === undefined) {
        console.error('[INSTRUMENTATION] ⚠️  Promise rejected with undefined reason');
        console.error('[INSTRUMENTATION] Promise:', promise);
        console.error('[INSTRUMENTATION] Stack trace:');
        console.trace();
      } else if (!(reason instanceof Error)) {
        console.error('[INSTRUMENTATION] ⚠️  Promise rejected with non-Error reason:', reason);
        console.error('[INSTRUMENTATION] Type:', typeof reason);
        console.error('[INSTRUMENTATION] Promise:', promise);
        console.error('[INSTRUMENTATION] Stack trace:');
        console.trace();
      } else {
        // Normal Error object - log for completeness but don't highlight
        console.error('[INSTRUMENTATION] Promise rejected with Error:', reason.message);
        if (reason.stack) {
          console.error(reason.stack);
        }
      }
    });

    // Track uncaught exceptions
    process.on('uncaughtException', (error, origin) => {
      if (error === null) {
        console.error('[INSTRUMENTATION] ⚠️  Uncaught exception: null');
        console.error('[INSTRUMENTATION] Origin:', origin);
        console.error('[INSTRUMENTATION] Stack trace:');
        console.trace();
      } else if (error === undefined) {
        console.error('[INSTRUMENTATION] ⚠️  Uncaught exception: undefined');
        console.error('[INSTRUMENTATION] Origin:', origin);
        console.error('[INSTRUMENTATION] Stack trace:');
        console.trace();
      } else if (!(error instanceof Error)) {
        console.error('[INSTRUMENTATION] ⚠️  Uncaught exception with non-Error value:', error);
        console.error('[INSTRUMENTATION] Type:', typeof error);
        console.error('[INSTRUMENTATION] Origin:', origin);
        console.error('[INSTRUMENTATION] Stack trace:');
        console.trace();
      } else {
        // Normal Error object
        console.error('[INSTRUMENTATION] Uncaught exception:', error.message);
        console.error('[INSTRUMENTATION] Origin:', origin);
        if (error.stack) {
          console.error(error.stack);
        }
      }
    });

    console.log('[INSTRUMENTATION] Error monitoring initialized for Node.js runtime');
  }
}
