module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/scenarios'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'clients/**/*.ts',
    'utils/**/*.ts',
    '!**/*.d.ts',
  ],
  coverageDirectory: 'output/coverage',
  testTimeout: 90000, // 90 seconds for WebRTC connection tests
  globalSetup: '<rootDir>/setup/global-setup.ts',
  globalTeardown: '<rootDir>/setup/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/setup/test-setup.ts'],
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: 'ChatOrbit WebRTC E2E Tests',
        outputPath: 'output/test-report.html',
        includeFailureMsg: true,
        includeConsoleLog: true,
        dateFormat: 'yyyy-mm-dd HH:MM:ss',
      },
    ],
  ],
  verbose: true,
};
