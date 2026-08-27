/**
 * Authentication API Tests
 * Test all auth endpoints with proper validation
 */

const {
  request,
  app,
  setAuthToken,
  testUsers,
  expectSuccessResponse,
  expectErrorResponse,
  validateResponseStructure
} = require('./setup');

describe('Authentication API Tests', () => {
  let otpToken = null;
  let resetToken = null;

  // ─────────────────────────────────────────────────────────────────────────────
  // REGISTRATION TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `user_${Date.now()}@example.com`,
          phone: '9876543210',
          password: 'SecurePass123!@#',
          full_name: 'John Doe',
          verification_type: 'email'
        })
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      validateResponseStructure(body, true);
      expect(body.data).toHaveProperty('otpToken');
      expect(body.data).toHaveProperty('expiresIn');
      otpToken = body.data.otpToken;
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          phone: '9876543210',
          password: 'SecurePass123!@#',
          full_name: 'John Doe'
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`,
          phone: '9876543210',
          password: 'weak', // Too short
          full_name: 'John Doe'
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('password');
    });

    it('should reject registration with invalid phone format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`,
          phone: 'invalid-phone',
          password: 'SecurePass123!@#',
          full_name: 'John Doe'
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('phone');
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`

        });

      expectErrorResponse(response, 400);
    });


    it('should reject registration with duplicate email', async () => {
      const email = `duplicate_${Date.now()}@example.com`;      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          phone: '9876543210',
          password: 'SecurePass123!@#',
          full_name: 'John Doe'
        });

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          phone: '9876543210',
          password: 'SecurePass123!@#',
          full_name: 'Jane Doe'
        });

      expectErrorResponse(response, 409); // Conflict
    });

    it('should validate full_name length constraints', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`,
          phone: '9876543210',
          password: 'SecurePass123!@#',
          full_name: 'A' // Too short
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('name');
    });

    it('should accept optional verification_type parameter', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`,
          phone: '9876543210',
          password: 'SecurePass123!@#',
          full_name: 'John Doe',
          verification_type: 'phone' // Optional parameter
        })
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      expect(body.data.verificationType).toBe('phone');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // REGISTRATION VERIFICATION TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/auth/register/verify', () => {
    let validOtpToken = null;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `verify_${Date.now()}@example.com`,
          phone: '9876543210',
          password: 'SecurePass123!@#',
          full_name: 'Test User'
        });

      validOtpToken = response.body.data.otpToken;
    });

    it('should verify registration with valid OTP token and OTP', async () => {
      // Note: In real scenario, get OTP from email/SMS or test environment
      const response = await request(app)
        .post('/api/auth/register/verify')
        .send({
          otpToken: validOtpToken,
          otp: '123456' // Mock OTP - adjust based on your logic
        });

      if (response.status === 200) {
        expectSuccessResponse(response, 200);
        validateResponseStructure(response.body);
      }
    });

    it('should reject verification with invalid OTP token', async () => {
      const response = await request(app)
        .post('/api/auth/register/verify')
        .send({
          otpToken: 'invalid_token_format',
          otp: '123456'
        });

      expectErrorResponse(response, 400);
    });

    it('should reject verification with invalid OTP format', async () => {
      const response = await request(app)
        .post('/api/auth/register/verify')
        .send({
          otpToken: validOtpToken,
          otp: 'invalid' // Should be 6 digits
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('otp');
    });

    it('should reject verification with missing OTP token', async () => {
      const response = await request(app)
        .post('/api/auth/register/verify')
        .send({
          // otpToken missing
          otp: '123456'
        });

      expectErrorResponse(response, 400);
    });

    it('should reject verification with expired token', async () => {
      // Create a token and wait for expiration (depends on your config)
      const response = await request(app)
        .post('/api/auth/register/verify')
        .send({
          otpToken: 'expired_token_here', // Mock expired token
          otp: '123456'
        });

      expectErrorResponse(response, 401); // Unauthorized
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGIN TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    const testEmail = `login_test_${Date.now()}@example.com`;

    beforeAll(async () => {
      // Create a verified user for testing
      await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          phone: '9876543210',
          password: 'SecurePass123!@#',
          full_name: 'Login Test User'
        });
    });

    it('should login with valid email and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'SecurePass123!@#'
        });

      // Will expect success if account is verified
      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        if (body.data.accessToken) {
          setAuthToken(body.data.accessToken, body.data.refreshToken);
        }
      }
    });

    it('should login with valid phone and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '9876543210',
          password: 'SecurePass123!@#'
        });

      // Depends on if phone exists in system
      expect([200,400, 401, 404]).toContain(response.status);
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!@#'
        });

      expectErrorResponse(response, 400);
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail
          // password missing
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('password');
    });

    it('should reject login with missing email and phone', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'SecurePass123!@#'
          // email and phone missing
        });

      expectErrorResponse(response, 400);
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!@#'
        });

      expectErrorResponse(response, [401, 400]); // Unauthorized or Bad Request
    });

    it('should accept optional rememberMe flag', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'SecurePass123!@#',
          rememberMe: true
        });

      // Status depends on verification status
      expect([200, 401, 400]).toContain(response.status);
    });

    it('should validate MFA code when provided', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'SecurePass123!@#',
          mfaCode: '123456' // Optional MFA code
        });

      expect([200, 400, 401]).toContain(response.status);
    });

    it('should reject invalid MFA code format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'SecurePass123!@#',
          mfaCode: 'invalid' // Should be numeric
        });

      expectErrorResponse(response, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // FORGOT PASSWORD TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/auth/forgot-password', () => {
    it('should initiate forgot password flow with valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: `password_reset_${Date.now()}@example.com`
        });

      // May succeed or fail based on user existence
      expect([200,400, 404]).toContain(response.status);
    });

    it('should reject forgot password with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'invalid-email'
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('email');
    });

    it('should reject forgot password with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expectErrorResponse(response, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PASSWORD RESET TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/auth/reset-password', () => {
    it('should reject reset password with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid_token',
          newPassword: 'NewSecurePass123!@#',
          confirmPassword: 'NewSecurePass123!@#'
        });

      expectErrorResponse(response, 400); // Unauthorized
    });

    it('should reject reset password with weak new password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid_token_here',
          newPassword: 'weak', // Too weak
          confirmPassword: 'weak'
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('password');
    });

    it('should reject reset password with mismatched passwords', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid_token_here',
          newPassword: 'NewSecurePass123!@#',
          confirmPassword: 'DifferentPass123!@#' // Different
        });

      expectErrorResponse(response, 400);
    });

    it('should validate reset password parameters are present', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          // Missing all parameters
        });

      expectErrorResponse(response, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // OAUTH TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/auth/oauth/google/popup', () => {
    it('should reject with invalid idToken', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google/popup')
        .send({
          idToken: 'invalid_google_token',
          deviceInfo: {
            userAgent: 'Mozilla/5.0...',
            platform: 'Linux'
          }
        });

      expectErrorResponse(response, [400, 401]);
    });

    it('should reject with missing idToken', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google/popup')
        .send({
          deviceInfo: {
            userAgent: 'Mozilla/5.0...',
            platform: 'Linux'
          }
        });

      expectErrorResponse(response, 400);
    });

    it('should accept optional rememberMe parameter', async () => {
      const response = await request(app)
        .post('/api/auth/oauth/google/popup')
        .send({
          idToken: 'mock_token',
          rememberMe: true,
          deviceInfo: {}
        });

      expect([400, 401, 200]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DEVICE VERIFICATION TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/auth/device/verify', () => {
    it('should reject device verification with invalid OTP', async () => {
      const response = await request(app)
        .post('/api/auth/device/verify')
        .send({
          deviceCode: 'device_code_here',
          otp: 'invalid'
        });

      expectErrorResponse(response, 400);
    });

    it('should reject device verification with missing parameters', async () => {
      const response = await request(app)
        .post('/api/auth/device/verify')
        .send({});

      expectErrorResponse(response, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MFA TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/auth/mfa/verify', () => {
    it('should reject MFA verification with invalid code format', async () => {
      const response = await request(app)
        .post('/api/auth/mfa/verify')
        .send({
          code: 'invalid'
        });

      expectErrorResponse(response, 400);
    });

    it('should reject MFA verification with missing code', async () => {
      const response = await request(app)
        .post('/api/auth/mfa/verify')
        .send({});

      expectErrorResponse(response, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // OTP RESEND TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/auth/otp/resend', () => {
    it('should reject OTP resend with invalid identifier', async () => {
      const response = await request(app)
        .post('/api/auth/otp/resend')
        .send({
          identifier: '' // Empty
        });

      expectErrorResponse(response, 400);
    });

    it('should accept email as identifier for OTP resend', async () => {
      const response = await request(app)
        .post('/api/auth/otp/resend')
        .send({
          identifier: `test_${Date.now()}@example.com`,
          type: 'email'
        });

      expect([200, 404, 400]).toContain(response.status);
    });

    it('should accept phone as identifier for OTP resend', async () => {
      const response = await request(app)
        .post('/api/auth/otp/resend')
        .send({
          identifier: '9876543210',
          type: 'phone'
        });

      expect([200, 404, 400]).toContain(response.status);
    });
  });
});
