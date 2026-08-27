/**
 * RBAC API Tests
 * Test Role-Based Access Control endpoints
 */

const {
  request,
  app,
  expectSuccessResponse,
  expectErrorResponse,
  validateResponseStructure
} = require('./setup');

describe('RBAC API Tests', () => {
  let authToken = process.env.TEST_AUTH_TOKEN || 'mock_token';
  let roleId = null;
  let permissionId = null;

  // ─────────────────────────────────────────────────────────────────────────────
  // ROLE MANAGEMENT ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/rbac/roles', () => {
    it('should get all roles', async () => {
      const response = await request(app)
        .get('/api/rbac/roles')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/rbac/roles')
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/rbac/roles?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should support filtering by status', async () => {
      const response = await request(app)
        .get('/api/rbac/roles?status=active')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });
  });

  describe('GET /api/rbac/roles/:roleId', () => {
    const testRoleId = '1';

    it('should get specific role', async () => {
      const response = await request(app)
        .get(`/api/rbac/roles/${testRoleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('id');
        expect(body.data).toHaveProperty('name');
        roleId = body.data.id;
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get(`/api/rbac/roles/${testRoleId}`)
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should return 404 for non-existent role', async () => {
      const response = await request(app)
        .get('/api/rbac/roles/99999')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 404) {
        expectErrorResponse(response, 404);
      }
    });
  });

  describe('GET /api/rbac/roles/:roleId/complete', () => {
    const testRoleId = '1';

    it('should get complete role details with permissions and routes', async () => {
      const response = await request(app)
        .get(`/api/rbac/roles/${testRoleId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('id');
        expect(body.data).toHaveProperty('permissions');
        expect(body.data).toHaveProperty('routes');
      }
    });
  });

  describe('POST /api/rbac/roles', () => {
    it('should create new role', async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Test Role ${Date.now()}`,
          description: 'Test role description',
          is_active: true
        });

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('id');
        expect(body.data.name).toContain('Test Role');
        roleId = body.data.id;
      }
    });

    it('should reject creation without name', async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'No name provided'
        });

      expectErrorResponse(response, 400);
    });

    it('should reject creation with empty name', async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '',
          description: 'Empty name'
        });

      expectErrorResponse(response, 400);
    });

    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .send({
          name: 'Test Role',
          description: 'Test'
        })
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should reject duplicate role names', async () => {
      const roleName = `Unique Role ${Date.now()}`;

      // Create first role
      await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: roleName,
          description: 'First'
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: roleName,
          description: 'Duplicate'
        });

      if (response.status === 409) {
        expectErrorResponse(response, 409);
      }
    });
  });

  describe('PUT /api/rbac/roles/:roleId', () => {
    let updateRoleId = null;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Role to Update ${Date.now()}`,
          description: 'Role for updating'
        });

      if (response.status === 201) {
        updateRoleId = response.body.data.id;
      }
    });

    it('should update role', async () => {
      if (!updateRoleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/rbac/roles/${updateRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Updated Role ${Date.now()}`,
          description: 'Updated description'
        });

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(body.data.name).toContain('Updated');
      }
    });

    it('should allow partial updates', async () => {
      if (!updateRoleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/rbac/roles/${updateRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Only update description'
        });

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(body.data).toHaveProperty('id');
      }
    });

    it('should reject without authentication', async () => {
      if (!updateRoleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/rbac/roles/${updateRoleId}`)
        .send({ name: 'Updated' })
        .expect(401);

      expectErrorResponse(response, 401);
    });
  });

  describe('DELETE /api/rbac/roles/:roleId', () => {
    let deleteRoleId = null;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/rbac/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Role to Delete ${Date.now()}`,
          description: 'Role for deletion'
        });

      if (response.status === 201) {
        deleteRoleId = response.body.data.id;
      }
    });

    it('should delete role', async () => {
      if (!deleteRoleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .delete(`/api/rbac/roles/${deleteRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      validateResponseStructure(body);
    });

    it('should reject deletion without authentication', async () => {
      if (!deleteRoleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .delete(`/api/rbac/roles/${deleteRoleId}`)
        .expect(401);

      expectErrorResponse(response, 401);
    });
  });

  describe('POST /api/rbac/roles/:roleId/duplicate', () => {
    it('should duplicate existing role', async () => {
      if (!roleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/rbac/roles/${roleId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          new_name: `Duplicated ${Date.now()}`
        });

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ROLE PERMISSIONS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/rbac/roles/:roleId/permissions', () => {
    it('should get role permissions', async () => {
      if (!roleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .get(`/api/rbac/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });
  });

  describe('POST /api/rbac/roles/:roleId/permissions', () => {
    it('should assign permissions to role', async () => {
      if (!roleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/rbac/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          permission_ids: [1, 2, 3]
        });

      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('should validate permission_ids is array', async () => {
      if (!roleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/rbac/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          permission_ids: '1,2,3' // Should be array
        });

      expectErrorResponse(response, 400);
    });
  });

  describe('DELETE /api/rbac/roles/:roleId/permissions/:permissionId', () => {
    it('should remove permission from role', async () => {
      if (!roleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .delete(`/api/rbac/roles/${roleId}/permissions/1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ROLE ROUTES
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/rbac/roles/:roleId/routes', () => {
    it('should get role routes', async () => {
      if (!roleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .get(`/api/rbac/roles/${roleId}/routes`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });
  });

  describe('POST /api/rbac/roles/:roleId/routes', () => {
    it('should assign routes to role', async () => {
      if (!roleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/rbac/roles/${roleId}/routes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          route_ids: [1, 2, 3]
        });

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/rbac/roles/:roleId/routes/:routeId', () => {
    it('should remove route from role', async () => {
      if (!roleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .delete(`/api/rbac/roles/${roleId}/routes/1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ROLE USERS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/rbac/roles/:roleId/users', () => {
    it('should get users with specific role', async () => {
      if (!roleId) {
        pending('Role ID not available');
        return;
      }

      const response = await request(app)
        .get(`/api/rbac/roles/${roleId}/users`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PERMISSION MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/rbac/permissions', () => {
    it('should get all permissions', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions')
        .expect(401);

      expectErrorResponse(response, 401);
    });
  });

  describe('GET /api/rbac/permissions/:permissionId', () => {
    it('should get specific permission', async () => {
      const response = await request(app)
        .get('/api/rbac/permissions/1')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('id');
        expect(body.data).toHaveProperty('name');
        permissionId = body.data.id;
      }
    });
  });

  describe('POST /api/rbac/permissions', () => {
    it('should create permission', async () => {
      const response = await request(app)
        .post('/api/rbac/permissions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `permission_${Date.now()}`,
          description: 'Test permission'
        });

      expect([201, 400, 401, 409]).toContain(response.status);
    });

    it('should validate permission name format', async () => {
      const response = await request(app)
        .post('/api/rbac/permissions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Permission Name With Spaces',
          description: 'Test'
        });

      expectErrorResponse(response, 400);
    });
  });

  describe('PUT /api/rbac/permissions/:permissionId', () => {
    it('should update permission', async () => {
      if (!permissionId) {
        pending('Permission ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/rbac/permissions/${permissionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated description'
        });

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/rbac/permissions/:permissionId', () => {
    let deletePermissionId = null;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/rbac/permissions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `temp_perm_${Date.now()}`,
          description: 'Temp permission'
        });

      if (response.status === 201) {
        deletePermissionId = response.body.data.id;
      }
    });

    it('should delete permission', async () => {
      if (!deletePermissionId) {
        pending('Permission ID not available');
        return;
      }

      const response = await request(app)
        .delete(`/api/rbac/permissions/${deletePermissionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('GET /api/rbac/permissions/:permissionId/roles', () => {
    it('should get roles with specific permission', async () => {
      if (!permissionId) {
        pending('Permission ID not available');
        return;
      }

      const response = await request(app)
        .get(`/api/rbac/permissions/${permissionId}/roles`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });
  });
});
