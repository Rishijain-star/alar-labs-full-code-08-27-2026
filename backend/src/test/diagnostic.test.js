/**
 * Diagnostic Test Suite
 * Run this to understand what your API expects
 */

const { request, app } = require('./setup');
const responseLogger = require('./utils/responseLogger');

describe('🔍 API Diagnostics', () => {
  describe('Registration Endpoint Debug', () => {
    it('should show registration response (debug)', async () => {
      const testData = {
        email: `diag_test_${Date.now()}@example.com`,
        phone: '9876543210',
        password: 'SecurePass123!@#',
        full_name: 'Diagnostic User',
        verification_type: 'email',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(testData);

      responseLogger.log(
        'Registration with valid data',
        'POST',
        '/api/auth/register',
        testData,
        response
      );

      console.log('\n✓ Check logs/logs/ folder for full response');
      console.log('\nResponse status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));

      // Don't assert - just log
      expect(response.body).toBeDefined();
    });

    it('should show what fields are required (debug)', async () => {
      const testData = {
        email: `diag_test_${Date.now()}@example.com`,
        // Missing other fields to see validation errors
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(testData);

      responseLogger.log(
        'Registration with minimal fields',
        'POST',
        '/api/auth/register',
        testData,
        response
      );

      console.log('\nValidation errors:', JSON.stringify(response.body, null, 2));
      expect(response.body).toBeDefined();
    });

    it('should show login response (debug)', async () => {
      const loginData = {
        email: 'admin@example.com', // Adjust based on your test user
        password: 'AdminPassword123!@#',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      responseLogger.log(
        'Login attempt',
        'POST',
        '/api/auth/login',
        loginData,
        response
      );

      console.log('\nLogin response:', JSON.stringify(response.body, null, 2));
      if (response.body.data?.accessToken) {
        console.log('✓ Got access token - use this for authenticated requests');
        console.log('Token (first 50 chars):', response.body.data.accessToken.substring(0, 50) + '...');
      }

      expect(response.body).toBeDefined();
    });

    it('should show available public endpoints (debug)', async () => {
      const endpoints = [
        { method: 'GET', path: '/api/categories/active' },
        { method: 'GET', path: '/api/labs' },
        { method: 'GET', path: '/api/subcategories/active' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method.toLowerCase()](endpoint.path);

        console.log(`\n${endpoint.method} ${endpoint.path}`);
        console.log(`  Status: ${response.status}`);
        console.log(`  Has data: ${response.body?.data ? '✓' : '✗'}`);

        if (response.status !== 200) {
          console.log(`  Error: ${response.body?.message}`);
        }
      }

      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Field Validation Debug', () => {
    it('should show email validation (debug)', async () => {
      const invalidEmails = [
        { value: 'not-an-email', desc: 'No @ symbol' },
        { value: '@example.com', desc: 'No local part' },
        { value: 'user@', desc: 'No domain' },
        { value: '', desc: 'Empty string' },
      ];

      for (const test of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: test.value,
            phone: '9876543210',
            password: 'SecurePass123!@#',
            full_name: 'Test User',
          });

        console.log(`\nEmail: "${test.value}" (${test.desc})`);
        console.log(`  Status: ${response.status}`);
        console.log(`  Message: ${response.body?.message}`);
      }

      expect(true).toBe(true);
    });

    it('should show password validation (debug)', async () => {
      const invalidPasswords = [
        { value: 'short', desc: 'Too short' },
        { value: 'nouppercase123!', desc: 'No uppercase' },
        { value: 'NOLOWERCASE123!', desc: 'No lowercase' },
        { value: 'NoNumbers!', desc: 'No numbers' },
        { value: 'NoSpecialChar123', desc: 'No special chars' },
        { value: 'ValidPass123!@#', desc: 'Valid password' },
      ];

      for (const test of invalidPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test_${Date.now()}@example.com`,
            phone: '9876543210',
            password: test.value,
            full_name: 'Test User',
          });

        console.log(`\nPassword: "${test.value}" (${test.desc})`);
        console.log(`  Status: ${response.status}`);
        if (response.status !== 200) {
          console.log(`  Message: ${response.body?.message}`);
        } else {
          console.log(`  ✓ Accepted!`);
        }
      }

      expect(true).toBe(true);
    });

    it('should show phone validation (debug)', async () => {
      const invalidPhones = [
        { value: '123', desc: 'Too short' },
        { value: 'not-a-phone', desc: 'Invalid format' },
        { value: '9876543210', desc: 'Valid 10-digit' },
        { value: '+1-987-654-3210', desc: 'Valid with formatting' },
        { value: '', desc: 'Empty' },
      ];

      for (const test of invalidPhones) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test_${Date.now()}@example.com`,
            phone: test.value,
            password: 'SecurePass123!@#',
            full_name: 'Test User',
          });

        console.log(`\nPhone: "${test.value}" (${test.desc})`);
        console.log(`  Status: ${response.status}`);
        if (response.status !== 200) {
          console.log(`  Message: ${response.body?.message}`);
        }
      }

      expect(true).toBe(true);
    });
  });
});
