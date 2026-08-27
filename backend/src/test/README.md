# API Testing Suite

Comprehensive API testing suite for the Crowd Deliver platform covering all endpoints with parameter validation and error handling scenarios.

## 📋 Test Files Overview

### 1. **Auth Tests** (`auth.test.js`)

Tests for all authentication-related endpoints:

- **Registration** - Register new users with validation
  - ✅ Valid credentials
  - ✅ Invalid email format
  - ✅ Weak passwords
  - ✅ Invalid phone format
  - ✅ Missing required fields
  - ✅ Duplicate email detection

- **Login** - User authentication
  - ✅ Email/phone login
  - ✅ Password validation
  - ✅ MFA code verification
  - ✅ Invalid credentials handling

- **Password Management**
  - ✅ Change password
  - ✅ Forgot password flow
  - ✅ Password reset with token

- **OAuth** - Social authentication
  - ✅ Google popup login
  - ✅ Invalid token handling

- **Device & MFA**
  - ✅ Device verification
  - ✅ MFA setup and verification
  - ✅ OTP resend

### 2. **Categories Tests** (`categories.test.js`)

Tests for category management endpoints:

- **Public Routes**
  - ✅ GET active categories
  - ✅ GET category by slug
  - ✅ Pagination support

- **Protected Routes (CRUD)**
  - ✅ GET all categories
  - ✅ GET category by ID
  - ✅ CREATE category
  - ✅ UPDATE category
  - ✅ DELETE category
  - ✅ Slug validation
  - ✅ Duplicate prevention

### 3. **Labs Tests** (`labs.test.js`)

Tests for laboratory/hands-on challenge endpoints:

- **Lab CRUD Operations**
  - ✅ List labs with filtering
  - ✅ Get lab by ID
  - ✅ Create lab
  - ✅ Create lab with questions
  - ✅ Update lab
  - ✅ Delete lab
  - ✅ Difficulty level validation

- **Lab Questions**
  - ✅ Add single question
  - ✅ Bulk add questions
  - ✅ Update question
  - ✅ Delete question

- **Lab Assignments**
  - ✅ Assign lab to users
  - ✅ Get user assignments
  - ✅ Update assignment
  - ✅ Revoke assignment

- **Lab Certification**
  - ✅ Assign certification to lab

### 4. **Courses Tests** (`courses.test.js`)

Tests for course management endpoints:

- **Course CRUD**
  - ✅ List courses with filtering
  - ✅ Get course by ID/slug
  - ✅ Create course
  - ✅ Create course with full content
  - ✅ Update course
  - ✅ Delete course
  - ✅ Publish/Archive course

- **Course Media**
  - ✅ Add media to course
  - ✅ Update media
  - ✅ Delete media
  - ✅ Media type validation

- **Course Questions**
  - ✅ Add questions
  - ✅ Bulk add questions
  - ✅ Update questions
  - ✅ Delete questions

- **Course Content**
  - ✅ Update course header
  - ✅ Update course footer
  - ✅ Assign certification

### 5. **Owner/User Tests** (`owner.test.js`)

Tests for user management and account settings:

- **Session Management**
  - ✅ Refresh tokens
  - ✅ Logout (single/all devices)
  - ✅ Session validation

- **User Profile**
  - ✅ Get current user
  - ✅ Update profile
  - ✅ Profile image upload

- **Security**
  - ✅ Change password
  - ✅ Audit logs
  - ✅ Security overview
  - ✅ IP whitelist management
  - ✅ IP whitelist toggle

- **Device Management**
  - ✅ List trusted devices
  - ✅ List sessions
  - ✅ Delete session

- **User Management (Admin)**
  - ✅ List all users
  - ✅ Get user by ID
  - ✅ Add new user
  - ✅ Update user role

- **Permissions**
  - ✅ Get user permissions
  - ✅ Get access summary

### 6. **RBAC Tests** (`rbac.test.js`)

Tests for Role-Based Access Control:

- **Role Management**
  - ✅ List all roles
  - ✅ Get role by ID
  - ✅ Get complete role details
  - ✅ Create role
  - ✅ Update role
  - ✅ Delete role
  - ✅ Duplicate role

- **Role Permissions**
  - ✅ Get role permissions
  - ✅ Assign permissions to role
  - ✅ Remove permission from role

- **Role Routes**
  - ✅ Get role routes
  - ✅ Assign routes to role
  - ✅ Remove route from role

- **Role Users**
  - ✅ Get users with specific role

- **Permission Management**
  - ✅ List all permissions
  - ✅ Get permission by ID
  - ✅ Create permission
  - ✅ Update permission
  - ✅ Delete permission
  - ✅ Get roles with permission

### 7. **Setup File** (`setup.js`)

Shared test utilities and helpers:

- Authentication token management
- Test data generators
- Response assertion helpers
- HTTP request wrappers

## 🚀 Getting Started

### Prerequisites

```bash
Node.js >= 16.0.0
npm >= 8.0.0
```

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.test` file (if needed):

```env
TEST_AUTH_TOKEN=your_mock_token_here
NODE_ENV=test
DB_HOST=localhost
DB_USER=test_user
DB_PASSWORD=test_password
DB_NAME=test_database
```

## 🧪 Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
# Auth tests only
npm test -- auth.test.js

# Categories tests only
npm test -- categories.test.js

# Labs tests only
npm test -- labs.test.js

# Courses tests only
npm test -- courses.test.js

# Owner/User tests only
npm test -- owner.test.js

# RBAC tests only
npm test -- rbac.test.js
```

### Run with Coverage Report

```bash
npm test -- --coverage
```

### Run Specific Test Case

```bash
npm test -- --testNamePattern="should register user with valid credentials"
```

### Run in Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Watch Mode (Auto-run on file changes)

```bash
npm test -- --watch
```

## 📊 Test Coverage

To view coverage report:

```bash
npm test -- --coverage

# Generated reports:
# - Terminal output
# - HTML report: coverage/index.html
# - LCOV report: coverage/lcov.info
```

## 🔍 Parameter Validation Checks

All test suites validate:

### Email Validation

- ✅ Valid email format
- ✅ Invalid email format rejection
- ✅ Duplicate email detection
- ✅ Email case handling

### Password Validation

- ✅ Minimum 12 characters
- ✅ Uppercase letter requirement
- ✅ Lowercase letter requirement
- ✅ Number requirement
- ✅ Special character requirement
- ✅ Password mismatch detection

### Phone Number Validation

- ✅ International format support
- ✅ Invalid format rejection
- ✅ Length validation

### ID Validation

- ✅ UUID format validation
- ✅ Numeric ID validation
- ✅ Non-existent ID handling

### Array/Object Validation

- ✅ Array type checking
- ✅ Nested object validation
- ✅ Required field checking

### Boolean Validation

- ✅ Boolean type checking
- ✅ String-to-boolean conversion handling

### Numeric Validation

- ✅ Integer validation
- ✅ Float validation
- ✅ Range validation
- ✅ Min/max constraints

## 🛡️ Security Tests Included

### Authentication

- ✅ Unauthorized request rejection
- ✅ Invalid token handling
- ✅ Expired token detection
- ✅ MFA enforcement

### RBAC

- ✅ Permission checking
- ✅ Role-based access control
- ✅ Route authorization

### Input Validation

- ✅ SQL injection prevention (via parameterized queries)
- ✅ XSS payload detection
- ✅ Field length limits
- ✅ Data type enforcement

## 📝 Test Structure

Each test file follows this structure:

```javascript
describe("Feature Name", () => {
  beforeAll(async () => {
    // Setup - create test data
  });

  describe("Endpoint Name", () => {
    it("should succeed with valid data", async () => {
      // Arrange, Act, Assert
    });

    it("should reject invalid input", async () => {
      // Validate error handling
    });
  });

  afterAll(async () => {
    // Cleanup
  });
});
```

## 🔗 Response Format Expected

All endpoints should return responses in this format:

### Success Response (2xx)

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    "id": "123",
    "name": "Example"
  }
}
```

### Error Response (4xx/5xx)

```json
{
  "success": false,
  "message": "Error description",
  "data": null
}
```

## 🐛 Debugging Tests

### View Request Details

Add to any test:

```javascript
console.log("Response:", response.body);
console.log("Status:", response.status);
console.log("Headers:", response.headers);
```

### Run Single Test

```bash
npm test -- --testNamePattern="should register user"
```

### Verbose Output

```bash
npm test -- --verbose
```

## ⚙️ Configuration

### Timeout Settings

Default timeout: 10 seconds
Change in `jest.config.js`:

```javascript
testTimeout: 30000; // 30 seconds
```

### API Base URL

Configure in `setup.js`:

```javascript
const app = require("../../app");
// or
const baseURL = process.env.API_BASE_URL || "http://localhost:3000";
```

## 📚 Common Test Patterns

### Testing with Authentication

```javascript
const response = await request(app)
  .get("/api/protected-route")
  .set("Authorization", `Bearer ${authToken}`);
```

### Testing File Upload

```javascript
const response = await request(app)
  .post("/api/upload")
  .set("Authorization", `Bearer ${authToken}`)
  .attach("file", buffer, "filename.ext")
  .field("field_name", "value");
```

### Testing Pagination

```javascript
const response = await request(app)
  .get("/api/items?page=1&limit=10")
  .set("Authorization", `Bearer ${authToken}`);
```

### Testing Error Cases

```javascript
const response = await request(app)
  .post("/api/create")
  .send({ invalid: "data" });

expect(response.status).toBe(400);
expect(response.body.success).toBe(false);
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "16"
      - run: npm install
      - run: npm test -- --coverage
```

## 📖 Test Documentation

Each test file includes:

- Section headers explaining test groups
- Clear test descriptions
- Parameter validation examples
- Expected response formats
- Error condition handling

## ✅ Validation Checklist

Before committing API changes:

- [ ] Run all tests: `npm test`
- [ ] Check coverage: `npm test -- --coverage`
- [ ] No failing tests
- [ ] No console errors
- [ ] Response format matches expected structure
- [ ] All parameters validated
- [ ] Error cases handled
- [ ] Authentication tested
- [ ] Authorization tested
- [ ] Input sanitization verified

## 🎯 Next Steps

1. **Set up test database** - Configure test database connection
2. **Add authentication** - Set up mock/real auth tokens
3. **Create fixtures** - Add test data in `beforeAll` hooks
4. **Mock external APIs** - Use Jest mocks for third-party services
5. **Add performance tests** - Monitor response times
6. **Set up CI/CD** - Automate test execution

## 📞 Support

For test-related issues:

1. Check test output for specific error
2. Review validator in `src/validators/`
3. Check response format in controller
4. Verify database state
5. Run in debug mode for detailed output

## 📄 License

MIT

---

**Last Updated:** 2024
**Test Coverage:** All API routes and parameters
**Total Test Cases:** 200+
