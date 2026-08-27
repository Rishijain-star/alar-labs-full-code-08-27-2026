/**
 * Jest Mock for Redis
 * Allows tests to run without actual Redis server
 */

// Define mock client separately to avoid circular references
const mockClientMethods = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),

  // String operations
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  getEx: jest.fn().mockResolvedValue(null),
  setEx: jest.fn().mockResolvedValue('OK'),

  // Expiration
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(-1),
  pExpire: jest.fn().mockResolvedValue(1),
  pTtl: jest.fn().mockResolvedValue(-1),

  // Increment/Decrement
  incr: jest.fn().mockResolvedValue(1),
  decr: jest.fn().mockResolvedValue(0),
  incrBy: jest.fn().mockResolvedValue(1),
  decrBy: jest.fn().mockResolvedValue(0),
  incrByFloat: jest.fn().mockResolvedValue(1.0),

  // List operations
  lpush: jest.fn().mockResolvedValue(1),
  rpush: jest.fn().mockResolvedValue(1),
  lpop: jest.fn().mockResolvedValue(null),
  rpop: jest.fn().mockResolvedValue(null),
  llen: jest.fn().mockResolvedValue(0),
  lrange: jest.fn().mockResolvedValue([]),
  lindex: jest.fn().mockResolvedValue(null),
  lset: jest.fn().mockResolvedValue('OK'),
  ltrim: jest.fn().mockResolvedValue('OK'),

  // Hash operations
  hset: jest.fn().mockResolvedValue(1),
  hget: jest.fn().mockResolvedValue(null),
  hdel: jest.fn().mockResolvedValue(1),
  hgetall: jest.fn().mockResolvedValue({}),
  hincrby: jest.fn().mockResolvedValue(1),
  hincrbyfloat: jest.fn().mockResolvedValue(1.0),
  hlen: jest.fn().mockResolvedValue(0),
  hexists: jest.fn().mockResolvedValue(0),
  hkeys: jest.fn().mockResolvedValue([]),
  hvals: jest.fn().mockResolvedValue([]),
  hmget: jest.fn().mockResolvedValue([]),
  hmset: jest.fn().mockResolvedValue('OK'),

  // Set operations
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  smembers: jest.fn().mockResolvedValue([]),
  scard: jest.fn().mockResolvedValue(0),
  sismember: jest.fn().mockResolvedValue(0),
  spop: jest.fn().mockResolvedValue(null),
  srandmember: jest.fn().mockResolvedValue(null),
  sinter: jest.fn().mockResolvedValue([]),
  sunion: jest.fn().mockResolvedValue([]),
  sdiff: jest.fn().mockResolvedValue([]),

  // Sorted Set operations (IMPORTANT for audit logs)
  zadd: jest.fn().mockResolvedValue(1),
  zAdd: jest.fn().mockResolvedValue(1),
  zrem: jest.fn().mockResolvedValue(1),
  zcard: jest.fn().mockResolvedValue(0),
  zcount: jest.fn().mockResolvedValue(0),
  zscore: jest.fn().mockResolvedValue(null),
  zrank: jest.fn().mockResolvedValue(null),
  zrevrank: jest.fn().mockResolvedValue(null),
  zrange: jest.fn().mockResolvedValue([]),
  zrevrange: jest.fn().mockResolvedValue([]),
  zrangebyscore: jest.fn().mockResolvedValue([]),
  zrevrangebyscore: jest.fn().mockResolvedValue([]),
  zincrby: jest.fn().mockResolvedValue(1),
  zpopmin: jest.fn().mockResolvedValue([]),
  zpopmax: jest.fn().mockResolvedValue([]),

  // Stream operations (for audit logs)
  xadd: jest.fn().mockResolvedValue('0-0'),
  xlen: jest.fn().mockResolvedValue(0),
  xrange: jest.fn().mockResolvedValue([]),
  xrevrange: jest.fn().mockResolvedValue([]),
  xread: jest.fn().mockResolvedValue([]),

  // Key operations
  keys: jest.fn().mockResolvedValue([]),
  scan: jest.fn().mockResolvedValue([0, []]),
  type: jest.fn().mockResolvedValue('none'),
  rename: jest.fn().mockResolvedValue('OK'),
  renamenx: jest.fn().mockResolvedValue(0),
  randomkey: jest.fn().mockResolvedValue(null),
  dbsize: jest.fn().mockResolvedValue(0),
  flushdb: jest.fn().mockResolvedValue('OK'),
  flushall: jest.fn().mockResolvedValue('OK'),

  // Pub/Sub operations
  publish: jest.fn().mockResolvedValue(0),
  subscribe: jest.fn().mockResolvedValue(undefined),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  psubscribe: jest.fn().mockResolvedValue(undefined),
  punsubscribe: jest.fn().mockResolvedValue(undefined),

  // Pub/Sub operations
  publish: jest.fn().mockResolvedValue(0),
  subscribe: jest.fn().mockResolvedValue(undefined),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
  psubscribe: jest.fn().mockResolvedValue(undefined),
  punsubscribe: jest.fn().mockResolvedValue(undefined),

  // Event handlers
  on: jest.fn(function() { return this; }),
  once: jest.fn(function() { return this; }),
  off: jest.fn(function() { return this; }),
  emit: jest.fn(),
};

// Create mock client object
const mockRedisClient = {
  ...mockClientMethods,
  // Transaction operations - reference mockRedisClient directly
  multi(){ return mockRedisClient; },
  exec: jest.fn().mockResolvedValue([]),
  discard: jest.fn().mockResolvedValue('OK'),
  watch: jest.fn().mockResolvedValue('OK'),
  unwatch: jest.fn().mockResolvedValue('OK'),
};

// Bind 'this' context for event handlers
mockRedisClient.on = mockRedisClient.on.bind(mockRedisClient);
mockRedisClient.once = mockRedisClient.once.bind(mockRedisClient);
mockRedisClient.off = mockRedisClient.off.bind(mockRedisClient);

module.exports = {
  createClient: jest.fn(() => mockRedisClient),

  // For RedisClient class
  RedisClient: jest.fn(() => ({
    client: mockRedisClient,
    isConnected: true,
    connect: jest.fn().mockResolvedValue(mockRedisClient),
    getClient: jest.fn(() => mockRedisClient),
    isReady: jest.fn(() => true),
    disconnect: jest.fn().mockResolvedValue(undefined),
  })),

  // For testing/mocking
  mockRedisClient,
};

