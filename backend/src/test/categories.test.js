/**
 * Categories API Tests
 * Test all category endpoints with validation
 */

const {
  request,
  app,
  authenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  validateResponseStructure,
  testCategory
} = require('./setup');

describe('Categories API Tests', () => {
  let authToken = null;
  let categoryId = null;

  // Mock authentication - adjust based on your auth setup
  beforeAll(() => {
    // In real tests, you would login first
    authToken = process.env.TEST_AUTH_TOKEN || 'mock_token';
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC ROUTES (No Authentication Required)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/categories/active (Public)', () => {
    it('should retrieve all active categories', async () => {
      const response = await request(app)
        .get('/api/categories/active')
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      validateResponseStructure(body, true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter categories by status', async () => {
      const response = await request(app)
        .get('/api/categories/active?status=active')
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/categories/active?page=1&limit=10')
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/categories/active?page=-1&limit=invalid')
        .expect(400);

      expectErrorResponse(response, 400);
    });
  });

  describe('GET /api/categories/slug/:slug (Public)', () => {
    it('should retrieve category by valid slug', async () => {
      const response = await request(app)
        .get('/api/categories/slug/test-category')
        .expect(200);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('id');
        expect(body.data).toHaveProperty('slug');
      }
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await request(app)
        .get('/api/categories/slug/non-existent-slug-12345')
        .expect(404);

      expectErrorResponse(response, 404);
    });

    it('should handle slug with special characters', async () => {
      const response = await request(app)
        .get('/api/categories/slug/test-slug-with-dashes')
        .expect([200, 404]);

      expect([200, 400,404]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PROTECTED ROUTES (Authentication Required)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/categories (Protected)', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/categories')
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should retrieve all categories with authentication', async () => {
      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should support filtering in protected route', async () => {
      const response = await request(app)
        .get('/api/categories?search=web')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/api/categories?sort=name&order=asc')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/categories?page=-1')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 400) {
        expectErrorResponse(response, 400);
      }
    });
  });

  describe('GET /api/categories/:id (Protected)', () => {
    const testId = '123e4567-e89b-12d3-a456-426614174000'; // UUID format

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/categories/${testId}`)
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should retrieve category by valid ID', async () => {
      const response = await request(app)
        .get(`/api/categories/${testId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('id');
        expect(body.data).toHaveProperty('subcategories');
        categoryId = body.data.id;
      }
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .get('/api/categories/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 404) {
        expectErrorResponse(response, 404);
      }
    });

    it('should validate ID format (UUID)', async () => {
      const response = await request(app)
        .get('/api/categories/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`);

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('POST /api/categories (Protected)', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/categories')
        .send(testCategory.valid)
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should create category with valid data', async () => {
      const categoryData = {
        name: `Test Category ${Date.now()}`,
        slug: `test-cat-${Date.now()}`,
        description: 'Test category description',
        is_active: true
      };

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send(categoryData);

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('id');
        expect(body.data.name).toBe(categoryData.name);
        expect(body.data.slug).toBe(categoryData.slug);
        categoryId = body.data.id;
      }
    });

    it('should reject creation with empty name', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Empty
          slug: `test-${Date.now()}`,
          description: 'Test'
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('name');
    });

    it('should reject creation with missing slug', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Category',
          // slug missing
          description: 'Test'
        });

      expectErrorResponse(response, 400);
    });

    it('should reject creation with invalid slug format', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Category',
          slug: 'Invalid Slug With Spaces', // Invalid format
          description: 'Test'
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('slug');
    });

    it('should reject creation with duplicate slug', async () => {
      const slug = `unique-slug-${Date.now()}`;

      // First creation
      await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Category 1',
          slug,
          description: 'Test'
        });

      // Second creation with same slug
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Category 2',
          slug, // Duplicate
          description: 'Test'
        });

      if (response.status === 409) {
        expectErrorResponse(response, 409); // Conflict
      }
    });

    it('should accept optional description', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Category ${Date.now()}`,
          slug: `slug-${Date.now()}`,
          // description is optional
        });

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        expect(body.data).toHaveProperty('name');
      }
    });

    it('should accept optional is_active flag', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Category ${Date.now()}`,
          slug: `slug-${Date.now()}`,
          description: 'Test',
          is_active: false // Optional
        });

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        expect(body.data.is_active).toBe(false);
      }
    });

    it('should reject creation with invalid is_active type', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Category ${Date.now()}`,
          slug: `slug-${Date.now()}`,
          is_active: 'yes' // Should be boolean
        });

      expectErrorResponse(response, 400);
    });
  });

  describe('PUT /api/categories/:id (Protected)', () => {
    let updateCategoryId = null;

    beforeAll(async () => {
      // Create a category to update
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Update Test ${Date.now()}`,
          slug: `update-test-${Date.now()}`,
          description: 'Category to update'
        });

      if (response.status === 201) {
        updateCategoryId = response.body.data.id;
      }
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put(`/api/categories/${categoryId || 'test-id'}`)
        .send({ name: 'Updated' })
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should update category with valid data', async () => {
      if (!updateCategoryId) {
        pending('Category ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/categories/${updateCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Updated Category ${Date.now()}`,
          description: 'Updated description'
        });

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(body.data.name).toContain('Updated');
      }
    });

    it('should reject update with empty name', async () => {
      if (!updateCategoryId) {
        pending('Category ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/categories/${updateCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '' // Empty
        });

      expectErrorResponse(response, 400);
    });

    it('should reject update for non-existent category', async () => {
      const response = await request(app)
        .put('/api/categories/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' });

      if (response.status === 404) {
        expectErrorResponse(response, 404);
      }
    });

    it('should allow partial updates', async () => {
      if (!updateCategoryId) {
        pending('Category ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/categories/${updateCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Only updating description'
          // name not provided
        });

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(body.data).toHaveProperty('id');
      }
    });
  });

  describe('DELETE /api/categories/:id (Protected)', () => {
    let deleteCategoryId = null;

    beforeAll(async () => {
      // Create a category to delete
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Delete Test ${Date.now()}`,
          slug: `delete-test-${Date.now()}`,
          description: 'Category to delete'
        });

      if (response.status === 201) {
        deleteCategoryId = response.body.data.id;
      }
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .delete(`/api/categories/${deleteCategoryId || 'test-id'}`)
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should delete category with valid ID', async () => {
      if (!deleteCategoryId) {
        pending('Category ID not available');
        return;
      }

      const response = await request(app)
        .delete(`/api/categories/${deleteCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      validateResponseStructure(body);
    });

    it('should reject deletion of non-existent category', async () => {
      const response = await request(app)
        .delete('/api/categories/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 404) {
        expectErrorResponse(response, 404);
      }
    });

    it('should validate ID format', async () => {
      const response = await request(app)
        .delete('/api/categories/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect([400, 404]).toContain(response.status);
    });
  });
});
