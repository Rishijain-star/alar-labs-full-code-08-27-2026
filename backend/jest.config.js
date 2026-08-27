/**
 * Jest Configuration
 * Configures test environment for API testing
 */

module.exports = {
  testEnvironment: 'node',

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/test/**',
    '!src/lib/**',
    '!src/config/**'
  ],

  // Coverage thresholds
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/src/test/',
    '/src/migrations/'
  ],

  // Test timeout (useful for API calls)
  testTimeout: 10000,

  // Setup files - Order matters! Jest setup first, then test setup
  setupFilesAfterEnv: [
    '<rootDir>/src/test/jest.setup.js',
    '<rootDir>/src/test/setup.js'
  ],

  // Test patterns
  testMatch: [
    '<rootDir>/src/test/**/*.test.js'
  ],

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Verbose output
  verbose: true,

  // Test output
  testPathIgnorePatterns: ['/node_modules/'],

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};
