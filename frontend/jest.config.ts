import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Adjust if you use aliases (e.g., @/components)
  },
  testMatch: [
    '**/?(*.)+(test|spec).[tj]s?(x)', // Matches .test.tsx, .spec.tsx, etc.
  ],
};

export default config;