const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  testRegex: '\\.(spec|test)\\.(ts|tsx)$',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  collectCoverageFrom: [
    'src/application/**/*.{ts,tsx}',
    'src/infra/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
    '!src/**/index.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: './coverage',
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};

module.exports = createJestConfig(config);
