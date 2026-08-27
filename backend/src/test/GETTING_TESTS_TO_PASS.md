# Getting Tests to Pass - Complete Guide

## ⚡ Quick Start (3 Steps)

### Step 1: Fix Pending Calls
```bash
node src/test/fix-pending.js
```

### Step 2: Run Diagnostic Tests
```bash
npm test -- diagnostic.test.js --verbose
```

This will show you:
- ✅ What your API actually returns
- ✅ What validation rules are enforced
- ✅ What fields are required
- ✅ What status codes you're getting

### Step 3: Fix Issues Based on Output
See "Fixing Common Failures" below

---

## 🔴 Current Issues & Fixes

### Issue 1: Redis Not Connected

**Error:**
```
❌ Rate limiter error: Redis client not initialized or not connected
```

**Why It Happens:**
- Redis isn't running on your machine
- Rate limiter tries to connect at startup
- Middleware blocks requests before they reach controller

**Fix Option A: Use Mocked Redis** ✅ RECOMMENDED FOR TESTS
```bash
# This is already set up! Just run:
npm test

# Redis is automatically mocked for all tests
```

**Fix Option B: Use Real Redis**
```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Run tests
npm test
```

**Fix Option C: Disable Rate Limiting for Tests**
```bash
# In src/middleware/rateLimit.js:
if (process.env.NODE_ENV === 'test') {
  module.exports.createRateLimiter = (name) => (req, res, next) => next();
}
```

---

### Issue 2: Registration Returns 400 Bad Request

**Error:**
```
Expected: 200 OK
Got:      400 Bad Request
```

**Root Cause:** Validator rejects your request data

**Diagnose with:**
```bash
npm test -- diagnostic.test.js --testNamePattern="Registration Endpoint Debug" --verbose
```

**Common Causes & Fixes:**

#### 2a. Password Doesn't Meet Requirements
```javascript
// ❌ WRONG (from error log)
password: 'weak'

// ✅ CORRECT (must have ALL of these)
password: 'SecurePass123!@#'
// Minimum 12 characters
// At least 1 uppercase (A-Z)
// At least 1 lowercase (a-z)
// At least 1 number (0-9)
// At least 1 special character (!@#$%^&*)
```

**Test it:**
```bash
npm test -- diagnostic.test.js --testNamePattern="password validation" --verbose
```

#### 2b. Phone Format Invalid
```javascript
// ❌ WRONG
phone: 'invalid-phone'    // Letters not allowed
phone: '123'              // Too short
phone: ''                 // Empty

// ✅ CORRECT (10-15 digits, with optional + prefix)
phone: '9876543210'
phone: '+19876543210'
phone: '+1-987-654-3210'  // Formatting accepted
```

**Test it:**
```bash
npm test -- diagnostic.test.js --testNamePattern="phone validation" --verbose
```

#### 2c. Email Format Invalid
```javascript
// ❌ WRONG
email: 'invalid-email'    // No @ symbol
email: 'user@'            // No domain
email: '@example.com'     // No local part

// ✅ CORRECT
email: 'user@example.com'
email: 'test.user@example.co.uk'
```

#### 2d. Missing Required Fields
```javascript
// ❌ WRONG - Missing fields
{
  email: 'user@example.com'
  // Missing: phone, password, full_name
}

// ✅ CORRECT - All required fields
{
  email: 'user@example.com',
  phone: '9876543210',
  password: 'SecurePass123!@#',
  full_name: 'John Doe'
}
```

#### 2e. Field Type Wrong
```javascript
// ❌ WRONG - phone should be string
{
  phone: 9876543210  // Number instead of string
}

// ✅ CORRECT
{
  phone: '9876543210'  // String
}
```

---

### Issue 3: 401 Unauthorized on Protected Routes

**Error:**
```
Status: 401
Message: "Unauthorized"
```

**Cause:** No valid auth token provided

**Fix:**
```bash
# Step 1: Get a valid token
npm test -- diagnostic.test.js --testNamePattern="login response" --verbose

# This will show:
# 1. Whether login works
# 2. The access token (if successful)
# 3. How to format authenticated requests

# Step 2: Use the token
export TEST_AUTH_TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Step 3: Run tests with token
npm test

# OR set in test file (src/test/setup.js):
// beforeAll
const response = await request(app)
  .post('/api/auth/login')
  .send({
    email: 'your-test-user@example.com',
    password: 'YourPassword123!@#'
  });

if (response.body.data?.accessToken) {
  setAuthToken(response.body.data.accessToken);
}
```

---

## 🔧 Step-by-Step Fixes

### Step 1: Understand Your API

Run diagnostics to see what your API actually expects:

```bash
npm test -- diagnostic.test.js --verbose

# Look for:
# ✓ Registration response format
# ✓ Required fields
# ✓ Validation error messages
# ✓ Login response format
```

### Step 2: Create Valid Test Data

Based on diagnostic output, create test data that matches:

```javascript
// In src/test/setup.js:

const testUsers = {
  valid: {
    email: `test_${Date.now()}@example.com`,
    phone: '9876543210',  // Must be valid format
    password: 'SecurePass123!@#',  // Must meet requirements
    full_name: 'Test User'  // 2-100 characters
  }
};
```

### Step 3: Get Auth Token

```bash
# Run diagnostic to see login working:
npm test -- diagnostic.test.js --testNamePattern="login response" --verbose

# Then manually test:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "YourPassword123!@#"
  }'

# Copy the accessToken from response
```

### Step 4: Configure Tests with Token

```bash
# Option A: Environment variable
export TEST_AUTH_TOKEN="your_token_here"
npm test

# Option B: In .env.test file
echo "TEST_AUTH_TOKEN=your_token_here" > .env.test
npm test

# Option C: In test setup file
# See src/test/setup.js beforeAll() hook
```

### Step 5: Run Tests

```bash
# Run just validation tests (no auth needed)
npm test -- --testNamePattern="invalid|missing|reject" --verbose

# Run everything
npm test -- --coverage

# Run one file
npm test -- auth.test.js --verbose
```

---

## 📊 Testing Strategy

### Phase 1: Validation Testing (30 seconds)
```bash
# These don't need auth or database
npm test -- --testNamePattern="invalid|missing|reject|validate" --verbose

# Expected: 70-80 passing, 0 failing
# These test that your validators work correctly
```

### Phase 2: Diagnostic Testing (1 minute)
```bash
# See what your API actually does
npm test -- diagnostic.test.js --verbose

# Look for:
# - Status codes
# - Error messages
# - Required fields
# - Token format
```

### Phase 3: Auth Testing (2 minutes)
```bash
# Test authentication flow
npm test -- auth.test.js --verbose

# If failing:
# 1. Get valid token
# 2. Update TEST_AUTH_TOKEN env var
# 3. Re-run tests
```

### Phase 4: Full Test Suite (5 minutes)
```bash
# Run everything
npm test -- --coverage

# Check coverage report
open coverage/index.html
```

---

## ✅ Validation Rules Reference

### Password Requirements (MUST HAVE ALL)
- ✅ Minimum 12 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 lowercase letter (a-z)
- ✅ At least 1 digit (0-9)
- ✅ At least 1 special character (!@#$%^&*)

### Phone Requirements
- ✅ 10-15 digits
- ✅ Optional + prefix for country code
- ✅ Optional spacing/dashes allowed
- ❌ Letters not allowed
- ❌ Cannot be empty

### Email Requirements
- ✅ Valid email format (user@domain.com)
- ✅ Must be unique in system
- ❌ Cannot be empty
- ❌ Must have @ symbol
- ❌ Must have domain

### Name Requirements
- ✅ 2-100 characters
- ✅ Can include spaces, punctuation
- ❌ Cannot be empty
- ❌ Cannot be single character

---

## 🚀 Expected Results

### Before Fixes
```
❌ 120 failed
✅ 109 passed
⚠️  Redis errors: ~50
⚠️   401 Unauthorized: ~70
⚠️  pending() errors: ~21
```

### After Fixes
```
✅ 180+ passed
❌ 10-20 failing (legitimate)
🟡 10-20 skipped (optional features)
⚠️  0 Redis errors
⚠️  0 pending() errors
```

---

## 📝 Checklist

- [ ] Run `node src/test/fix-pending.js`
- [ ] Run `npm test -- diagnostic.test.js --verbose`
- [ ] Check registration requirements in output
- [ ] Create valid test data based on requirements
- [ ] Get auth token from login test
- [ ] Set `TEST_AUTH_TOKEN` env var
- [ ] Run validation tests: `npm test -- --testNamePattern="invalid|missing|reject"`
- [ ] Run auth tests: `npm test -- auth.test.js`
- [ ] Run full suite: `npm test -- --coverage`
- [ ] Check coverage: `open coverage/index.html`

---

## 📚 Documentation

**Quick Reference:** `src/test/QUICK_COMMANDS.md`
**Troubleshooting:** `src/test/TROUBLESHOOTING.md`
**API Reference:** `src/test/API_REFERENCE.md`
**Full Guide:** `src/test/README.md`

---

## 🔗 Quick Commands

```bash
# Diagnose issues
npm test -- diagnostic.test.js --verbose

# Fix pending() calls
node src/test/fix-pending.js

# Run validation tests only
npm test -- --testNamePattern="invalid|missing|reject" --verbose

# Run with coverage
npm test -- --coverage

# Run specific file
npm test -- auth.test.js --verbose

# Run specific test
npm test -- --testNamePattern="should register user" --verbose

# Watch mode
npm test -- --watch

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Clean up
rm -rf coverage/ logs/
```

---

**Next Action:** Run `npm test -- diagnostic.test.js --verbose` to see what your API expects
