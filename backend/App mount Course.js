// ── app.js — mount all LMS routes ────────────────────────────────────────────

const certificationRoutes = require("./routes/certificationRoutes");
const courseRoutes = require("./routes/courseRoutes");
const labRoutes = require("./routes/labRoutes");

// Standalone certifications
app.use("/api/certifications", certificationRoutes);

// Courses (all course endpoints including /view, /header, /footer, /certification)
app.use("/api/courses", courseRoutes);

// Labs nested inside a course:  /api/courses/:courseId/labs/...
app.use("/api/courses/:courseId/labs", labRoutes);

// Labs standalone:  /api/labs/...
app.use("/api/labs", labRoutes);


// ─────────────────────────────────────────────────────────────────────────────
//  FULL API REFERENCE
// ─────────────────────────────────────────────────────────────────────────────

/*
CERTIFICATIONS (standalone)
  GET    /api/certifications                      list all
  POST   /api/certifications                      create
  GET    /api/certifications/:id                  detail (shows courses + labs using it)
  PUT    /api/certifications/:id                  update
  DELETE /api/certifications/:id                  delete

COURSES
  GET    /api/courses                             list
  GET    /api/courses/slug/:slug                  by slug
  POST   /api/courses                             create (shell only)
  POST   /api/courses/create-full                 create with questions + media + header + footer + cert
  GET    /api/courses/:id                         full detail (admin)
  PUT    /api/courses/:id                         update
  DELETE /api/courses/:id                         delete
  PATCH  /api/courses/:id/publish                 publish
  PATCH  /api/courses/:id/archive                 archive

  Course view page (public — free/paid lock logic)
  GET    /api/courses/:id/view                    public view: header, footer, labs (isLocked), media

  Header & Footer
  PUT    /api/courses/:id/header                  { enabled, content, bgColor, textColor }
  PUT    /api/courses/:id/footer                  { enabled, content, bgColor, textColor }

  Certification (assign existing cert to course)
  POST   /api/courses/:id/certification           { certificationId }
  DELETE /api/courses/:id/certification           remove

  Media
  POST   /api/courses/:id/media                   add one
  PUT    /api/courses/:id/media/:mediaId          update
  DELETE /api/courses/:id/media/:mediaId          delete

  Questions
  POST   /api/courses/:id/questions               add one
  POST   /api/courses/:id/questions/bulk          { questions: [...] }
  PUT    /api/courses/:id/questions/:questionId   update
  DELETE /api/courses/:id/questions/:questionId   delete

LABS (nested under course OR standalone)
  GET    /api/courses/:courseId/labs              all labs in a course
  GET    /api/courses/:courseId/labs/:id          single lab
  POST   /api/courses/:courseId/labs              create lab inside course
  PATCH  /api/courses/:courseId/labs/reorder      { orderedIds: [...] }

  GET    /api/labs                                all labs (global list)
  GET    /api/labs/:id                            single lab (full: cert + questions)
  POST   /api/labs                                create standalone lab
  POST   /api/labs/create-full                    create with questions + certificationId in one shot
  PUT    /api/labs/:id                            update
  DELETE /api/labs/:id                            delete

  Certification (assign existing cert to lab)
  POST   /api/labs/:id/certification              { certificationId }
  DELETE /api/labs/:id/certification              remove

  Questions
  POST   /api/labs/:id/questions                  add one
  POST   /api/labs/:id/questions/bulk             { questions: [...] }
  PUT    /api/labs/:id/questions/:questionId      update
  DELETE /api/labs/:id/questions/:questionId      delete

  Assignments (standalone lab → user)
  GET    /api/labs/my/assignments                 my assigned labs
  GET    /api/labs/:id/assignments                all assignments for a lab
  POST   /api/labs/:id/assignments                { assignedTo, dueDate }
  PUT    /api/labs/:id/assignments/:assignmentId  update status/score
  DELETE /api/labs/:id/assignments                { assignedTo } revoke
*/


// ─────────────────────────────────────────────────────────────────────────────
//  COURSE VIEW RESPONSE SHAPE (GET /api/courses/:id/view)
// ─────────────────────────────────────────────────────────────────────────────
/*
{
  "id": "uuid",
  "title": "React Basics",
  "description": "...",
  "status": "published",
  "isFree": false,
  "price": "49.99",
  "level": "beginner",

  // Header (if enabled)
  "headerEnabled": true,
  "headerContent": "<h1>Welcome to React Basics</h1>",
  "headerBgColor": "#1a1a2e",
  "headerTextColor": "#ffffff",

  // Footer (if enabled)
  "footerEnabled": true,
  "footerContent": "<p>Need help? Contact support@example.com</p>",
  "footerBgColor": "#f5f5f5",
  "footerTextColor": "#333333",

  // Certification this course awards
  "certification": {
    "id": "cert-uuid",
    "title": "Certified React Developer",
    "passingScore": 80,
    "validityDays": 365
  },

  // Labs — isLocked true when: paid course + not enrolled + lab not free
  "labs": [
    { "id": "lab-1", "title": "Setup", "difficulty": "easy", "isFree": true,  "isLocked": false },
    { "id": "lab-2", "title": "Hooks", "difficulty": "medium", "isFree": false, "isLocked": true }
  ],

  // Media — non-preview items hidden for unenrolled paid course
  "media": [
    { "id": "m1", "type": "video", "title": "Intro", "url": "...", "isPreview": true }
  ],

  // Questions — empty array for unenrolled paid course
  "questions": [],

  "_isEnrolled": false,
  "_contentLocked": true
}
*/