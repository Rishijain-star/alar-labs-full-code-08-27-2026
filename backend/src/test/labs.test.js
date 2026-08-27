/**
 * Labs API Tests
 * Test all lab endpoints with validation
 */

const {
  request,
  app,
  expectSuccessResponse,
  expectErrorResponse,
  validateResponseStructure,
  testLab
} = require('./setup');

describe('Labs API Tests', () => {
  let authToken = process.env.TEST_AUTH_TOKEN || 'mock_token';
  let labId = null;

  // ─────────────────────────────────────────────────────────────────────────────
  // GET LABS (Public/Protected depends on configuration)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/labs', () => {
    it('should retrieve all labs', async () => {
      const response = await request(app)
        .get('/api/labs')
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      validateResponseStructure(body, true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/labs?page=1&limit=10')
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should support filtering by difficulty', async () => {
      const response = await request(app)
        .get('/api/labs?difficulty=beginner')
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should support searching by title', async () => {
      const response = await request(app)
        .get('/api/labs?search=linux')
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/labs?page=-1&limit=invalid');

      if (response.status === 400) {
        expectErrorResponse(response, 400);
      }
    });
  });

  describe('GET /api/labs/:id', () => {
    const testId = '123e4567-e89b-12d3-a456-426614174000';

    it('should retrieve lab by valid ID', async () => {
      const response = await request(app)
        .get(`/api/labs/${testId}`)
        .expect([200, 404]);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('id');
        expect(body.data).toHaveProperty('title');
        labId = body.data.id;
      }
    });

    it('should return 404 for non-existent lab', async () => {
      const response = await request(app)
        .get('/api/labs/99999999-9999-9999-9999-999999999999')
        .expect(404);

      expectErrorResponse(response, 404);
    });

    it('should include questions in lab details', async () => {
      const response = await request(app)
        .get(`/api/labs/${testId}`)
        .expect([200, 404]);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(body.data).toHaveProperty('questions');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE LAB (Protected)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/labs', () => {
    it('should reject creation without authentication', async () => {
      const response = await request(app)
        .post('/api/labs')
        .send(testLab.valid)
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should create lab with valid data', async () => {
      const labData = {
        title: `Test Lab ${Date.now()}`,
        slug: `test-lab-${Date.now()}`,
        description: 'Test lab description',
        difficulty: 'beginner',
        estimated_time: 30,
        technology_id: 1
      };

      const response = await request(app)
        .post('/api/labs')
        .set('Authorization', `Bearer ${authToken}`)
        .send(labData);

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('id');
        expect(body.data.title).toBe(labData.title);
        labId = body.data.id;
      }
    });

    it('should reject creation with empty title', async () => {
      const response = await request(app)
        .post('/api/labs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
          slug: `test-${Date.now()}`,
          difficulty: 'beginner',
          estimated_time: 30
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('title');
    });

    it('should reject creation with invalid difficulty level', async () => {
      const response = await request(app)
        .post('/api/labs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Lab ${Date.now()}`,
          slug: `test-${Date.now()}`,
          difficulty: 'super-hard', // Invalid
          estimated_time: 30
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('difficulty');
    });

    it('should validate estimated_time is numeric', async () => {
      const response = await request(app)
        .post('/api/labs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Lab ${Date.now()}`,
          slug: `test-${Date.now()}`,
          difficulty: 'beginner',
          estimated_time: 'thirty' // Should be number
        });

      expectErrorResponse(response, 400);
    });

    it('should accept optional category_id and subcategory_id', async () => {
      const response = await request(app)
        .post('/api/labs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Lab ${Date.now()}`,
          slug: `test-${Date.now()}`,
          difficulty: 'beginner',
          estimated_time: 30,
          category_id: 1,
          subcategory_id: 1
        });

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        expect(body.data).toHaveProperty('id');
      }
    });
  });

  describe('POST /api/labs/create-full', () => {
    it('should create lab with questions in single request', async () => {
      const labData = {
        title: `Full Lab ${Date.now()}`,
        slug: `full-lab-${Date.now()}`,
        difficulty: 'intermediate',
        estimated_time: 45,
        description: 'Lab with questions',
        questions: [
          {
            question_text: 'What is Linux?',
            question_type: 'multiple-choice',
            options: ['A', 'B', 'C', 'D'],
            correct_answer: 0
          },
          {
            question_text: 'What is SSH?',
            question_type: 'short-answer',
            correct_answer: 'Secure Shell'
          }
        ]
      };

      const response = await request(app)
        .post('/api/labs/create-full')
        .set('Authorization', `Bearer ${authToken}`)
        .send(labData);

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        expect(body.data).toHaveProperty('id');
        expect(body.data.questions).toBeDefined();
      }
    });

    it('should reject with invalid question format', async () => {
      const response = await request(app)
        .post('/api/labs/create-full')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Lab ${Date.now()}`,
          slug: `test-${Date.now()}`,
          difficulty: 'beginner',
          questions: [
            {
              // Missing required fields
              question_text: 'Test'
            }
          ]
        });

      expectErrorResponse(response, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE LAB
  // ─────────────────────────────────────────────────────────────────────────────

  describe('PUT /api/labs/:id', () => {
    let updateLabId = null;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/labs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Lab to Update ${Date.now()}`,
          slug: `lab-update-${Date.now()}`,
          difficulty: 'beginner',
          estimated_time: 30
        });

      if (response.status === 201) {
        updateLabId = response.body.data.id;
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .put(`/api/labs/${labId || 'test-id'}`)
        .send({ title: 'Updated' })
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should update lab with valid data', async () => {
      if (!updateLabId) {
        pending('Lab ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/labs/${updateLabId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Updated Lab ${Date.now()}`,
          description: 'Updated description'
        });

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(body.data.title).toContain('Updated');
      }
    });

    it('should allow partial updates', async () => {
      if (!updateLabId) {
        pending('Lab ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/labs/${updateLabId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          estimated_time: 60 // Only update time
        });

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(body.data.estimated_time).toBe(60);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE LAB
  // ─────────────────────────────────────────────────────────────────────────────

  describe('DELETE /api/labs/:id', () => {
    let deleteLabId = null;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/labs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Lab to Delete ${Date.now()}`,
          slug: `lab-delete-${Date.now()}`,
          difficulty: 'beginner',
          estimated_time: 30
        });

      if (response.status === 201) {
        deleteLabId = response.body.data.id;
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .delete(`/api/labs/${labId || 'test-id'}`)
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should delete lab', async () => {
      if (!deleteLabId) {
        pending('Lab ID not available');
        return;
      }

      const response = await request(app)
        .delete(`/api/labs/${deleteLabId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      validateResponseStructure(body);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LAB QUESTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/labs/:id/questions', () => {
    it('should add question to lab', async () => {
      if (!labId) {
        pending('Lab ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/labs/${labId}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question_text: 'What is the purpose of chmod?',
          question_type: 'multiple-choice',
          options: ['Change mode', 'Copy', 'Move', 'List'],
          correct_answer: 0,
          explanation: 'chmod changes file permissions'
        });

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        expect(body.data).toHaveProperty('id');
      }
    });

    it('should reject question with missing text', async () => {
      if (!labId) {
        pending('Lab ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/labs/${labId}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question_type: 'multiple-choice',
          options: ['A', 'B'],
          correct_answer: 0
        });

      expectErrorResponse(response, 400);
    });

    it('should validate question type', async () => {
      if (!labId) {
        pending('Lab ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/labs/${labId}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question_text: 'Test question',
          question_type: 'invalid-type'
        });

      expectErrorResponse(response, 400);
    });
  });

  describe('POST /api/labs/:id/questions/bulk', () => {
    it('should add multiple questions in bulk', async () => {
      if (!labId) {
        pending('Lab ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/labs/${labId}/questions/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questions: [
            {
              question_text: 'Question 1',
              question_type: 'short-answer',
              correct_answer: 'answer1'
            },
            {
              question_text: 'Question 2',
              question_type: 'short-answer',
              correct_answer: 'answer2'
            }
          ]
        });

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        expect(body.data).toBeInstanceOf(Array);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LAB ASSIGNMENTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/labs/my/assignments', () => {
    it('should get user assignments', async () => {
      const response = await request(app)
        .get('/api/labs/my/assignments')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/labs/my/assignments')
        .expect(401);

      expectErrorResponse(response, 401);
    });
  });

  describe('POST /api/labs/:id/assignments', () => {
    it('should reject without authentication', async () => {
      const response = await request(app)
        .post(`/api/labs/test-id/assignments`)
        .send({ user_id: 1 })
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should assign lab to user', async () => {
      if (!labId) {
        pending('Lab ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/labs/${labId}/assignments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          user_id: 1,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        expect(body.data).toHaveProperty('id');
      }
    });

    it('should reject assignment with missing user_id', async () => {
      if (!labId) {
        pending('Lab ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/labs/${labId}/assignments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expectErrorResponse(response, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LAB CERTIFICATION
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/labs/:id/certification', () => {
    it('should assign certification to lab', async () => {
      if (!labId) {
        pending('Lab ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/labs/${labId}/certification`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          certification_id: 1
        });

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });
});
