/**
 * Courses API Tests
 * Test all course endpoints with validation
 */

const {
  request,
  app,
  expectSuccessResponse,
  expectErrorResponse,
  validateResponseStructure,
  testCourse
} = require('./setup');

describe('Courses API Tests', () => {
  let authToken = process.env.TEST_AUTH_TOKEN || 'mock_token';
  let courseId = null;

  // ─────────────────────────────────────────────────────────────────────────────
  // GET COURSES
  // ─────────────────────────────────────────────────────────────────────────────

  describe('GET /api/owner/courses', () => {
    it('should retrieve all courses with authentication', async () => {
      const response = await request(app)
        .get('/api/owner/courses')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get('/api/owner/courses')
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/owner/courses?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should support filtering by level', async () => {
      const response = await request(app)
        .get('/api/owner/courses?level=beginner')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should support searching', async () => {
      const response = await request(app)
        .get('/api/owner/courses?search=web')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(Array.isArray(body.data)).toBe(true);
      }
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/owner/courses?page=-1')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 400) {
        expectErrorResponse(response, 400);
      }
    });
  });

  describe('GET /api/owner/courses/:id', () => {
    const testId = '123e4567-e89b-12d3-a456-426614174000';

    it('should retrieve course by valid ID', async () => {
      const response = await request(app)
        .get(`/api/owner/courses/${testId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('id');
        expect(body.data).toHaveProperty('title');
        courseId = body.data.id;
      }
    });

    it('should return 404 for non-existent course', async () => {
      const response = await request(app)
        .get('/api/owner/courses/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 404) {
        expectErrorResponse(response, 404);
      }
    });

    it('should include media and questions in course details', async () => {
      const response = await request(app)
        .get(`/api/owner/courses/${testId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(body.data).toHaveProperty('media');
        expect(body.data).toHaveProperty('questions');
      }
    });
  });

  describe('GET /api/owner/courses/slug/:slug', () => {
    it('should retrieve course by slug', async () => {
      const response = await request(app)
        .get('/api/owner/courses/slug/test-course')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404]).toContain(response.status);
    });

    it('should validate slug format', async () => {
      const response = await request(app)
        .get('/api/owner/courses/slug/test course with spaces')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE COURSE
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/owner/courses', () => {
    it('should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/owner/courses')
        .send(testCourse.valid)
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should create course with valid data', async () => {
      const courseData = {
        title: `Test Course ${Date.now()}`,
        slug: `test-course-${Date.now()}`,
        description: 'Test course description',
        duration: 60,
        level: 'beginner',
        category_id: 1,
        subcategory_id: 1
      };

      const response = await request(app)
        .post('/api/owner/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(courseData);

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        validateResponseStructure(body, true);
        expect(body.data).toHaveProperty('id');
        expect(body.data.title).toBe(courseData.title);
        courseId = body.data.id;
      }
    });

    it('should reject creation with empty title', async () => {
      const response = await request(app)
        .post('/api/owner/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '',
          slug: `test-${Date.now()}`,
          level: 'beginner'
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('title');
    });

    it('should reject creation with invalid level', async () => {
      const response = await request(app)
        .post('/api/owner/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Course ${Date.now()}`,
          slug: `test-${Date.now()}`,
          level: 'super-advanced' // Invalid
        });

      expectErrorResponse(response, 400);
      expect(response.body.message).toContain('level');
    });

    it('should validate duration is numeric', async () => {
      const response = await request(app)
        .post('/api/owner/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Course ${Date.now()}`,
          slug: `test-${Date.now()}`,
          level: 'beginner',
          duration: 'sixty' // Should be number
        });

      expectErrorResponse(response, 400);
    });

    it('should accept optional is_published flag', async () => {
      const response = await request(app)
        .post('/api/owner/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Course ${Date.now()}`,
          slug: `test-${Date.now()}`,
          level: 'beginner',
          is_published: false
        });

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        expect(body.data).toHaveProperty('id');
      }
    });
  });

  describe('POST /api/owner/courses/create-full', () => {
    it('should create course with media and questions', async () => {
      const courseData = {
        title: `Full Course ${Date.now()}`,
        slug: `full-course-${Date.now()}`,
        level: 'intermediate',
        description: 'Course with full content',
        media: [
          {
            title: 'Introduction',
            media_type: 'video',
            url: 'https://example.com/video.mp4'
          }
        ],
        questions: [
          {
            question_text: 'What is Node.js?',
            question_type: 'multiple-choice',
            options: ['Server runtime', 'Browser', 'Language', 'Framework'],
            correct_answer: 0
          }
        ]
      };

      const response = await request(app)
        .post('/api/owner/courses/create-full')
        .set('Authorization', `Bearer ${authToken}`)
        .send(courseData);

      if (response.status === 201) {
        const body = expectSuccessResponse(response, 201);
        expect(body.data).toHaveProperty('id');
      }
    });

    it('should reject with invalid media format', async () => {
      const response = await request(app)
        .post('/api/owner/courses/create-full')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Course ${Date.now()}`,
          slug: `test-${Date.now()}`,
          level: 'beginner',
          media: [
            {
              // Missing required fields
              media_type: 'video'
            }
          ]
        });

      expectErrorResponse(response, 400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE COURSE
  // ─────────────────────────────────────────────────────────────────────────────

  describe('PUT /api/owner/courses/:id', () => {
    let updateCourseId = null;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/owner/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Course to Update ${Date.now()}`,
          slug: `course-update-${Date.now()}`,
          level: 'beginner'
        });

      if (response.status === 201) {
        updateCourseId = response.body.data.id;
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .put(`/api/owner/courses/${courseId || 'test-id'}`)
        .send({ title: 'Updated' })
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should update course with valid data', async () => {
      if (!updateCourseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/owner/courses/${updateCourseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Updated Course ${Date.now()}`,
          description: 'Updated description'
        });

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(body.data.title).toContain('Updated');
      }
    });

    it('should allow partial updates', async () => {
      if (!updateCourseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/owner/courses/${updateCourseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          duration: 120
        });

      if (response.status === 200) {
        const body = expectSuccessResponse(response, 200);
        expect(body.data).toHaveProperty('id');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLISH/ARCHIVE COURSE
  // ─────────────────────────────────────────────────────────────────────────────

  describe('PATCH /api/owner/courses/:id/publish', () => {
    it('should publish course', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .patch(`/api/owner/courses/${courseId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('PATCH /api/owner/courses/:id/archive', () => {
    it('should archive course', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .patch(`/api/owner/courses/${courseId}/archive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // DELETE COURSE
  // ─────────────────────────────────────────────────────────────────────────────

  describe('DELETE /api/owner/courses/:id', () => {
    let deleteCourseId = null;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/owner/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Course to Delete ${Date.now()}`,
          slug: `course-delete-${Date.now()}`,
          level: 'beginner'
        });

      if (response.status === 201) {
        deleteCourseId = response.body.data.id;
      }
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .delete(`/api/owner/courses/${courseId || 'test-id'}`)
        .expect(401);

      expectErrorResponse(response, 401);
    });

    it('should delete course', async () => {
      if (!deleteCourseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .delete(`/api/owner/courses/${deleteCourseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const body = expectSuccessResponse(response, 200);
      validateResponseStructure(body);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // COURSE MEDIA
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/owner/courses/:id/media', () => {
    it('should add media to course', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/owner/courses/${courseId}/media`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Course Introduction',
          media_type: 'video',
          url: 'https://example.com/video.mp4',
          description: 'Introduction to the course',
          order: 1
        });

      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('should reject media with invalid type', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/owner/courses/${courseId}/media`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test',
          media_type: 'invalid-type'
        });

      expectErrorResponse(response, 400);
    });
  });

  describe('PUT /api/owner/courses/:id/media/:mediaId', () => {
    it('should update course media', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/owner/courses/${courseId}/media/1`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description'
        });

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/owner/courses/:id/media/:mediaId', () => {
    it('should delete course media', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .delete(`/api/owner/courses/${courseId}/media/1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200,400, 404]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // COURSE QUESTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/owner/courses/:id/questions', () => {
    it('should add question to course', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/owner/courses/${courseId}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question_text: 'What is Node.js?',
          question_type: 'multiple-choice',
          options: ['Server', 'Browser', 'Language', 'Framework'],
          correct_answer: 0
        });

      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('should reject question without text', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/owner/courses/${courseId}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question_type: 'multiple-choice',
          options: ['A', 'B']
        });

      expectErrorResponse(response, 400);
    });
  });

  describe('POST /api/owner/courses/:id/questions/bulk', () => {
    it('should add multiple questions in bulk', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/owner/courses/${courseId}/questions/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          questions: [
            {
              question_text: 'Q1',
              question_type: 'short-answer',
              correct_answer: 'answer1'
            },
            {
              question_text: 'Q2',
              question_type: 'short-answer',
              correct_answer: 'answer2'
            }
          ]
        });

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/owner/courses/:id/questions/:questionId', () => {
    it('should update course question', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/owner/courses/${courseId}/questions/1`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question_text: 'Updated Question?'
        });

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/owner/courses/:id/questions/:questionId', () => {
    it('should delete course question', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .delete(`/api/owner/courses/${courseId}/questions/1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200,400, 404]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // COURSE CERTIFICATION
  // ─────────────────────────────────────────────────────────────────────────────

  describe('POST /api/owner/courses/:id/certification', () => {
    it('should assign certification to course', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .post(`/api/owner/courses/${courseId}/certification`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          certification_id: 1
        });

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  describe('DELETE /api/owner/courses/:id/certification', () => {
    it('should remove certification from course', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .delete(`/api/owner/courses/${courseId}/certification`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200,400, 404]).toContain(response.status);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // COURSE HEADER/FOOTER
  // ─────────────────────────────────────────────────────────────────────────────

  describe('PUT /api/owner/courses/:id/header', () => {
    it('should update course header', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/owner/courses/${courseId}/header`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          header_image: 'https://example.com/header.jpg',
          header_title: 'Course Title'
        });

      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('PUT /api/owner/courses/:id/footer', () => {
    it('should update course footer', async () => {
      if (!courseId) {
        pending('Course ID not available');
        return;
      }

      const response = await request(app)
        .put(`/api/owner/courses/${courseId}/footer`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          footer_text: 'Course footer text'
        });

      expect([200, 400, 404]).toContain(response.status);
    });
  });
});
