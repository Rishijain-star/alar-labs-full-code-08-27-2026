/**
 * Jest Setup File
 * Runs before tests to configure mocks and environment
 * IMPORTANT: This runs BEFORE any modules are imported
 */

// Set test environment variables FIRST (before any modules load)
process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.LOG_LEVEL = 'error'; // Suppress log output in tests

// Mock Redis library BEFORE it's required by anything
jest.mock('redis', () => require('./mocks/redis'));

// Mock the app's RedisClient singleton
jest.mock('../lib/redis', () => {
  const redisMock = require('./mocks/redis');
  return new redisMock.RedisClient();
});

// Mock the new redisManager singleton
jest.mock('../lib/redisManager', () => require('./mocks/redisManager'));

// Clear any cached modules to ensure fresh load with mocks
jest.resetModules();

// Suppress Redis connection warnings in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress specific errors during tests
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    if (
      message.includes('Redis') ||
      message.includes('redis') ||
      message.includes('not connected') ||
      message.includes('rate limiter')
    ) {
      // Skip Redis-related errors in test output
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    const message = args[0]?.toString() || '';
    if (message.includes('Redis')) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Extend Jest timeout for API calls
jest.setTimeout(15000);


