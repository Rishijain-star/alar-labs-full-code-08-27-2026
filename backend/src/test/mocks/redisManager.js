/**
 * Jest Mock for Redis Manager
 * Provides a mock redisManager singleton for tests
 */

const { mockRedisClient } = require('./redis');

const mockRedisManager = {
  initialized: true,
  initPromise: null,

  // Mock methods
  initialize: jest.fn().mockResolvedValue(true),

  getClient: jest.fn().mockResolvedValue(mockRedisClient),

  getClientSafe: jest.fn().mockResolvedValue(mockRedisClient),

  isReady: jest.fn().mockReturnValue(true),

  disconnect: jest.fn().mockResolvedValue(true),

  healthCheck: jest.fn().mockResolvedValue({
    status: 'connected',
    message: 'Redis is healthy (mocked)',
  }),
};

module.exports = mockRedisManager;
