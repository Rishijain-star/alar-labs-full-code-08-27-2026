/**
 * Test Setup and Utilities
 * Common test configuration and helper functions
 */

const request = require('supertest');
const app = require('../../app');

/**
 * JWT token storage for authenticated requests
 */
let authToken = null;
let refreshToken = null;
let userId = null;

/**
 * Set authentication token
 */
function setAuthToken(token, refresh = null, uId = null) {
  authToken = token;
  refreshToken = refresh;
  userId = uId;
}

/**
 * Get authentication token
 */
function getAuthToken() {
  return authToken;
}

/**
 * Make authenticated request
 */
function authenticatedRequest(method = 'get', endpoint = '') {
  const baseRequest = request(app)[method](endpoint);
  if (authToken) {
    baseRequest.set('Authorization', `Bearer ${authToken}`);
  }
  return baseRequest;
}

/**
 * Test user data
 */
const testUsers = {
  valid: {
    email: `test_${Date.now()}@example.com`,
    phone: '9876543210',
    password: 'SecurePass123!@#',
    full_name: 'Test User'
  },
  invalidEmail: {
    email: 'invalid-email',
    phone: '9876543210',
    password: 'SecurePass123!@#',
    full_name: 'Test User'
  },
  weakPassword: {
    email: `test_${Date.now()}@example.com`,
    phone: '9876543210',
    password: 'weak',
    full_name: 'Test User'
  },
  missingRequired: {
    email: `test_${Date.now()}@example.com`,
    // missing phone, password, full_name
  }
};

/**
 * Test category data
 */
const testCategory = {
  valid: {
    name: `Test Category ${Date.now()}`,
    slug: `test-category-${Date.now()}`,
    description: 'Test category description',
    is_active: true
  },
  invalid: {
    name: '', // Empty name
    slug: `test-slug-${Date.now()}`
  }
};

/**
 * Test lab data
 */
const testLab = {
  valid: {
    title: `Test Lab ${Date.now()}`,
    slug: `test-lab-${Date.now()}`,
    description: 'Test lab description',
    difficulty: 'beginner',
    estimated_time: 30,
    is_active: true
  },
  invalid: {
    title: '', // Empty title
  }
};

/**
 * Test course data
 */
const testCourse = {
  valid: {
    title: `Test Course ${Date.now()}`,
    slug: `test-course-${Date.now()}`,
    description: 'Test course description',
    duration: 60,
    level: 'beginner',
    is_published: false
  },
  invalid: {
    title: '', // Empty title
  }
};

/**
 * Expect success response
 */
function expectSuccessResponse(response, statusCode = 200) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success');
  expect(response.body.success).toBe(true);
  return response.body;
}

/**
 * Expect error response
 */
function expectErrorResponse(response, statusCode = 400) {
  const codes = Array.isArray(statusCode) ? statusCode : [statusCode];
  expect(codes).toContain(response.status);
  if (response.body) {
    expect(response.body).toHaveProperty('success');
    expect(response.body.success).toBe(false);
  }
  return response.body;
}

/**
 * Log test result (simplified - no logger)
 */
function logTest(name, result) {
  console.log(`[TEST] ${name}: ${result ? 'PASSED' : 'FAILED'}`);
}

/**
 * Validate response structure
 */
function validateResponseStructure(body, hasData = false) {
  expect(body).toHaveProperty('success');
  expect(body).toHaveProperty('message');
  if (hasData) {
    expect(body).toHaveProperty('data');
  }
  return true;
}

module.exports = {
  request,
  app,
  setAuthToken,
  getAuthToken,
  authenticatedRequest,
  testUsers,
  testCategory,
  testLab,
  testCourse,
  expectSuccessResponse,
  expectErrorResponse,
  logTest,
  validateResponseStructure
};
