# Quick Test Commands Reference

## 🚀 Getting Started (First Time)

```bash
# 1. Install dependencies (if not done)
npm install

# 2. Start Redis in background
redis-server &

# 3. Auto-fix pending() calls in tests
node src/test/fix-pending.js

# 4. Run validation tests (no auth needed)
npm test -- --testNamePattern="invalid|missing|reject|validate" --verbose

# 5. Setup test database (if needed)
npm run rbac:setup

# 6. Get a valid test token
npm run dev &
# Then login via API or UI to get token

# 7. Run all tests
TEST_AUTH_TOKEN=your_token npm test -- --coverage
```

---

## 📋 Common Commands

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- auth.test.js
npm test -- categories.test.js
npm test -- labs.test.js
npm test -- courses.test.js
npm test -- owner.test.js
npm test -- rbac.test.js
```

### Run Tests Matching Pattern
```bash
# Validation tests only
npm test -- --testNamePattern="invalid|missing|reject"

# Auth tests only
npm test -- --testNamePattern="auth|login|register|password"

# CRUD tests only
npm test -- --testNamePattern="create|update|delete|get"

# Search for specific test
npm test -- --testNamePattern="should register user with valid"
```

### Run with Coverage Report
```bash
npm test -- --coverage

# Generate HTML report
npm test -- --coverage
# Open: coverage/index.html
```

### Run in Watch Mode
```bash
# Auto-re-run tests when files change
npm test -- --watch

# Watch only one file
npm test -- --watch auth.test.js
```

### Run in Debug Mode
```bash
# Inspect with Chrome DevTools
node --inspect-brk node_modules/.bin/jest --runInBand

# Then open: chrome://inspect
```

### Run with Verbose Output
```bash
npm test -- --verbose

# Or specific file
npm test -- auth.test.js --verbose
```

### Skip Tests with .skip
```bash
# These will be skipped at runtime
it.skip('should test something', () => {
  // Test code
});

# Run everything except skipped
npm test
```

### Mark Tests as TODO
```bash
# These show in test output as pending
it.todo('should test something when API is ready');

# Run to see TODOs
npm test -- --verbose
```

---

## 🔍 Debugging Tests

### See What Tests Failed
```bash
npm test 2>&1 | grep "●"
```

### Run One Test and See Full Output
```bash
npm test -- --testNamePattern="exact test name" --verbose
```

### Check Test File Syntax
```bash
# Without running tests
node -c src/test/auth.test.js
```

### See All Test Names
```bash
npm test -- --listTests
```

---

## 🛠️ Fixing Common Issues

### Fix `pending()` Errors
```bash
# Auto-fix all pending() calls
node src/test/fix-pending.js
```

### Mock Redis for Tests
```javascript
// In jest.config.js
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.js'],
  testEnvironment: 'node',
};

// In src/test/setup.js
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  })),
}));
```

### Set Test Environment Variables
```bash
# Before running tests
export TEST_AUTH_TOKEN="your_jwt_token_here"
export NODE_ENV=test
export DB_NAME=crowd_deliver_test

npm test
```

### Clear Test Database
```bash
# SQLite
rm test.sqlite

# MySQL
npm run rbac:setup

# PostgreSQL
DROP DATABASE crowd_deliver_test;
CREATE DATABASE crowd_deliver_test;
```

---

## 📊 Analyzing Results

### See Coverage Report
```bash
npm test -- --coverage
# Check: coverage/index.html
```

### Get Summary Stats
```bash
npm test 2>&1 | tail -20
# Shows total tests, pass/fail count
```

### Find Most Failures
```bash
npm test 2>&1 | grep "●" | head -10
```

### Profile Slow Tests
```bash
npm test -- --verbose 2>&1 | grep "ms)" | sort -k2 -nr | head -10
```

---

## 🔐 Working with Authentication

### Get Valid Test Token
```bash
# Method 1: Manual login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!@#"}' \
  | jq '.data.accessToken'

# Method 2: From running app
npm run dev &
sleep 2
# Login via UI and copy token from localStorage
```

### Set Token in Tests
```bash
# In .env or environment
export TEST_AUTH_TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Then run tests
npm test
```

### Test Without Authentication
```bash
# Tests that don't need auth will pass
npm test -- --testNamePattern="public|validate|invalid"
```

---

## 📝 Test-Driven Development

### Run Failing Test First
```bash
npm test -- --testNamePattern="specific feature" --watch
```

### Write Test
```javascript
it('should do something', async () => {
  const response = await request(app)
    .get('/api/endpoint')
    .expect(200);

  expect(response.body.success).toBe(true);
});
```

### Implement Feature
Write code to make test pass

### Run Test Again
```bash
npm test -- --testNamePattern="specific feature" --watch
```

---

## 🚨 Common Errors & Fixes

### `Cannot find module 'supertest'`
```bash
npm install supertest
```

### `jest is not defined`
```bash
npm install --save-dev jest
```

### `Redis client not initialized`
```bash
# Start Redis
redis-server

# Or mock it (see jest.config.js section)
```

### `401 Unauthorized`
```bash
# Set valid token
export TEST_AUTH_TOKEN="your_valid_jwt"
npm test
```

### Tests Hanging/Timeout
```bash
# Increase timeout
npm test -- --testTimeout=30000

# Or update jest.config.js:
module.exports = {
  testTimeout: 30000,
};
```

### `Cannot read property 'body' of undefined`
```bash
# Response was null/undefined
# Check: Is server running? Is endpoint correct?
```

---

## 📈 Continuous Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test -- --coverage
```

---

## 🎯 Test Strategies

### Test Only New Code
```bash
# Run tests for files you changed
npm test -- --onlyChanged

# Run tests affected by changes
npm test -- --findRelatedTests src/controllers/authController.js
```

### Test By Feature
```bash
# All auth
npm test -- --testPathPattern="auth" --verbose

# All CRUD
npm test -- --testNamePattern="create|read|update|delete"

# All validation
npm test -- --testNamePattern="validate|invalid|reject"
```

### Test Coverage By Feature
```bash
# Check what's tested
npm test -- --coverage --collectCoverageFrom="src/controllers/**"

# See uncovered lines
# Open: coverage/lcov-report/index.html
```

---

## 💾 Saving Test Results

### Output to File
```bash
npm test > test-results.txt 2>&1

# View later
cat test-results.txt
```

### Generate Report
```bash
npm test -- --coverage --coverage Reporter=html

# View report
open coverage/index.html
```

### Archive Results
```bash
# Save timestamped results
npm test > "test-results-$(date +%Y-%m-%d-%H%M%S).txt" 2>&1
```

---

## 🔗 Useful Links

- **Jest Docs:** https://jestjs.io/docs/getting-started
- **Supertest Docs:** https://github.com/visionmedia/supertest
- **Testing Best Practices:** https://jestjs.io/docs/tutorial-react#setup

---

## 📞 Get Help

### View Test Documentation
```bash
# Main readme
cat src/test/README.md

# API Reference
cat src/test/API_REFERENCE.md

# Troubleshooting
cat src/test/TROUBLESHOOTING.md

# This quick reference
cat src/test/QUICK_COMMANDS.md
```

### Check Coverage
```bash
npm test -- --coverage
# Then: open coverage/index.html
```

### Debug Tests
```bash
npm test -- auth.test.js --verbose --detectOpenHandles
```

---

**Last Updated:** Feb 2026
**Quick Reference for:** Crowd Deliver API Tests
**Test Framework:** Jest + Supertest
