/**
 * Test setup - runs before each test file
 *
 * Sets up custom matchers and test utilities
 */

// Extend Jest matchers
expect.extend({
  toBeWebRTCConnected(received: string) {
    const pass = received === 'connected' || received === 'completed';
    return {
      pass,
      message: () =>
        pass
          ? `Expected connection state not to be connected, but got ${received}`
          : `Expected connection state to be connected, but got ${received}`,
    };
  },

  toHaveDataChannelOpen(received: { readyState: string }) {
    const pass = received.readyState === 'open';
    return {
      pass,
      message: () =>
        pass
          ? `Expected data channel not to be open`
          : `Expected data channel to be open, but got state: ${received.readyState}`,
    };
  },
});

// Global test timeout warning
const originalTimeout = 10000;
console.log(`Test timeout: ${originalTimeout}ms`);
