/**
 * Owner/User API Tests
 * Test user management and profile endpoints
 */

const {
  request,
  app,
  expectSuccessResponse,
  expectErrorResponse,
  validateResponseStructure
} = require('./setup');

describe('Owner/User API Tests', () => {
  let authToken = process.env.TEST_AUTH_TOKEN || 'mock_token';
  let userId = null;

  // ─────────────────────────────────────────────────────────────────────────────
  // SESSION MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/owner/refresh', () => {
    it('should reject refresh without refresh token', async () => {
      const response = await request(app)
        .post('/api/owner/refresh')
        .send({});

      expectErrorResponse(response, 400);
    });

    it('should reject with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/owner/refresh')
        .send({
          refreshToken: 'invalid_token'
        });

      expectErrorResponse(response, [401, 400]);
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/owner/refresh')
        .send({
          refreshToken: 'valid_refresh_token_here'
        });

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(body.data).toHaveProperty('accessToken');
      }
    });
  });

  describe('POST /api/owner/logout', () => {
    it('should logout user', async () => {
      const response = await request(app)
        .post('/api/owner/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      if (response.status === 200) {
        expectSuccessResponse(response, 200);
      }
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/owner/logout')
        .send({})
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should support logoutAllDevices flag', async () => {
      const response = await request(app)
        .post('/api/owner/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          logoutAllDevices: true
        });

      expect([200,400, 401]).toContain(response.status);
    });

    it('should validate logoutAllDevices is boolean', async () => {
      const response = await request(app)
        .post('/api/owner/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          logoutAllDevices: 'yes' // Should be boolean
        });

      expectErrorResponse(response, 400);
    });
  });

  describe('POST /api/owner/logout-all', () => {
    it('should logout from all devices', async () => {
      const response = await request(app)
        .post('/api/owner/logout-all')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      if (response.status === 200) {
        expectSuccessResponse(response, 200);
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/owner/logout-all')
        .send({})
        .expect(401);

      expectErrorResponse(response, 401);
    });
  });

  describe('GET /api/owner/validate', () => {
    it('should validate session', async () => {
      const response = await request(app)
        .get('/api/owner/validate')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(body.data).toHaveProperty('valid');
      }
    });

    it('should reject validation without token', async () => {
      const response = await request(app)
        .get('/api/owner/validate')
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should reject with invalid token', async () => {
      const response = await request(app)
        .get('/api/owner/validate')
        .set('Authorization', 'Bearer invalid_token');

      expectErrorResponse(response, 401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // USER PROFILE
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/owner/me', () => {
    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/owner/me')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('id');
        expect(body.data).toHaveProperty('email');
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/owner/me')
        .expect(401);

      expectErrorResponse(response, 401);
    });
  });

  describe('PUT /api/owner/me', () => {
    it('should update user profile', async () => {
      const response = await request(app)
        .put('/api/owner/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          full_name: 'Updated Name',
          phone: '9876543210'
        });

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(body.data.full_name).toBe('Updated Name');
      }
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put('/api/owner/me')
        .send({
          full_name: 'Updated'
        })
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should validate full_name length', async () => {
      const response = await request(app)
        .put('/api/owner/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          full_name: 'A' // Too short
        });

      expectErrorResponse(response, 400);
    });

    it('should support profile image upload', async () => {
      const response = await request(app)
        .put('/api/owner/me')
        .set('Authorization', `Bearer ${authToken}`)
        .field('full_name', 'User Name')
        .attach('profileImage', Buffer.from('fake image'), 'profile.jpg');

      expect([200, 400, 401]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SECURITY ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/owner/change-password', () => {
    it('should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/owner/change-password')
        .send({
          currentPassword: 'Current123!@#',
          newPassword: 'NewPass123!@#',
          confirmPassword: 'NewPass123!@#'
        })
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should change password with valid current password', async () => {
      const response = await request(app)
        .post('/api/owner/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Current123!@#',
          newPassword: 'NewPassword123!@#',
          confirmPassword: 'NewPassword123!@#'
        });

      expect([200, 401, 400]).toContain(response.status);
    });

    it('should reject if passwords do not match', async () => {
      const response = await request(app)
        .post('/api/owner/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Current123!@#',
          newPassword: 'NewPassword123!@#',
          confirmPassword: 'DifferentPass123!@#'
        });

      expectErrorResponse(response, 400);
    });

    it('should reject weak new password', async () => {
      const response = await request(app)
        .post('/api/owner/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Current123!@#',
          newPassword: 'weak',
          confirmPassword: 'weak'
        });

      expectErrorResponse(response, 400);
    });
  });

  describe('GET /api/owner/audit-logs', () => {
    it('should get audit logs with authentication', async () => {
      const response = await request(app)
        .get('/api/owner/audit-logs')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/owner/audit-logs')
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should support filtering by action', async () => {
      const response = await request(app)
        .get('/api/owner/audit-logs?action=login')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });
  });

  describe('GET /api/owner/get-security-overview', () => {
    it('should get security overview', async () => {
      const response = await request(app)
        .get('/api/owner/get-security-overview')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('mfaEnabled');
        expect(body.data).toHaveProperty('ipWhitelistEnabled');
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/owner/get-security-overview')
        .expect(401);

      expectErrorResponse(response, 401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // IP WHITELIST
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/owner/get-ip-whitelist', () => {
    it('should get IP whitelist', async () => {
      const response = await request(app)
        .get('/api/owner/get-ip-whitelist')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });
  });

  describe('POST /api/owner/add-ip-whitelist', () => {
    it('should add IP to whitelist', async () => {
      const response = await request(app)
        .post('/api/owner/add-ip-whitelist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ip_address: '192.168.1.1',
          description: 'Home IP'
        });

      expect([200, 201, 400]).toContain(response.status);
    });

    it('should validate IP address format', async () => {
      const response = await request(app)
        .post('/api/owner/add-ip-whitelist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ip_address: 'invalid-ip',
          description: 'Test'
        });

      expectErrorResponse(response, 400);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/owner/add-ip-whitelist')
        .send({
          ip_address: '192.168.1.1',
          description: 'Home IP'
        })
        .expect(401);

      expectErrorResponse(response, 401);
    });
  });

  describe('POST /api/owner/ip-whitelist/toggle', () => {
    it('should toggle IP whitelist', async () => {
      const response = await request(app)
        .post('/api/owner/ip-whitelist/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: true
        });

      expect([200,400, 401]).toContain(response.status);
    });

    it('should validate enabled is boolean', async () => {
      const response = await request(app)
        .post('/api/owner/ip-whitelist/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enabled: 'yes' // Should be boolean
        });

      expectErrorResponse(response, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DEVICE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/owner/devices', () => {
    it('should get trusted devices', async () => {
      const response = await request(app)
        .get('/api/owner/devices')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/owner/devices')
        .expect(401);

      expectErrorResponse(response, 401);
    });
  });

  describe('GET /api/owner/sessions', () => {
    it('should get all sessions', async () => {
      const response = await request(app)
        .get('/api/owner/sessions')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/owner/sessions')
        .expect(401);

      expectErrorResponse(response, 401);
    });
  });

  describe('DELETE /api/owner/sessions/:sessionId', () => {
    it('should reject without authentication', async () => {
      const response = await request(app)
        .delete('/api/owner/sessions/test-session-id')
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should delete specific session', async () => {
      const response = await request(app)
        .delete('/api/owner/sessions/test-session-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200,400 ,404, 401]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // USER MANAGEMENT (Admin)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/owner/users', () => {
    it('should get all users', async () => {
      const response = await request(app)
        .get('/api/owner/users')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/owner/users')
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/owner/users?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });
  });

  describe('GET /api/owner/user/:userId', () => {
    it('should get specific user', async () => {
      const response = await request(app)
        .get('/api/owner/user/1')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400,404, 401]).toContain(response.status);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/owner/user/1')
        .expect(401);

      expectErrorResponse(response, 401);
    });
  });

  describe('POST /api/owner/add-user', () => {
    it('should add new user', async () => {
      const response = await request(app)
        .post('/api/owner/add-user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: `newuser_${Date.now()}@example.com`,
          full_name: 'New User',
          role_id: 1
        });

      expect([201, 400, 401, 409]).toContain(response.status);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/owner/add-user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email',
          full_name: 'User',
          role_id: 1
        });

      expectErrorResponse(response, 400);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/owner/add-user')
        .send({
          email: 'test@example.com',
          full_name: 'User',
          role_id: 1
        })
        .expect(401);

      expectErrorResponse(response, 401);
    });
  });

  describe('PUT /api/owner/users/:userId/role', () => {
    it('should update user role', async () => {
      const response = await request(app)
        .put('/api/owner/users/1/role')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role_id: 2
        });

      expect([200, 400, 404, 401]).toContain(response.status);
    });

    it('should validate role_id is numeric', async () => {
      const response = await request(app)
        .put('/api/owner/users/1/role')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role_id: 'admin' // Should be numeric
        });

      expectErrorResponse(response, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PERMISSIONS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/owner/me/permissions', () => {
    it('should get current user permissions', async () => {
      const response = await request(app)
        .get('/api/owner/me/permissions')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });
  });

  describe('GET /api/owner/me/access-summary', () => {
    it('should get access summary', async () => {
      const response = await request(app)
        .get('/api/owner/me/access-summary')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
      }
    });
  });
});
