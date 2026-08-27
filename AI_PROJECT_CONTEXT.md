# Practice Mastery Platform — AI Developer Context & Guidelines

This document serves as the **single source of truth** for any AI assistant (like Claude, ChatGPT, Gemini, etc.) working on this e-learning platform. By reading this file, the AI can instantly understand the project's current state, architecture, styling rules, and coding conventions, saving valuable context window tokens and ensuring consistency.

---

## 1. Project Overview & Goal
This is a comprehensive, production-ready Learning Management System (LMS).
- **Backend:** Node.js (Express), Sequelize (MySQL/PostgreSQL), Redis (sessions/caching), JWT auth, and a robust Role-Based Access Control (RBAC) system.
- **Frontend:** React 18.2 SPA with Vite 5, React Router 7, Redux Toolkit (RTK) + RTK Query, and Tailwind CSS with shadcn/ui.
- **Domain Focus:** Skill labs, course-attached labs, certifications, learning sets, exam topics, and digital skill programs.

---

## 2. Tech Stack & Key Libraries

### Frontend (`React.shadcn.JS-Template-main/`)
- **Core:** React 18.2 (Hooks, Suspense), React Router 7 (lazy-loaded routes).
- **State Management:** Redux Toolkit + RTK Query (`src/store/api/`).
- **Styling:** Tailwind CSS 3, Radix UI primitives, `shadcn/ui` custom components.
- **Form & Rich Text:** React Quill, Tiptap, native HTML5 validation with custom wrappers (`ValidatableField`).
- **HTTP Client:** Axios (global interceptors for token refresh in `src/lib/axios.js`).
- **Media/Payments:** HLS.js (video streaming), Razorpay (payments).

### Backend (`backend/`)
- **Core:** Node.js, Express.js.
- **Database:** Sequelize ORM (`src/models/`).
- **Auth:** JWT, Redis sessions, bcrypt.
- **Architecture:** `routes/` -> `controllers/` -> `services/` -> `repositories/`.

---

## 3. Theming & Styling Rules (CRITICAL FOR CONSISTENCY)
The project strictly uses a custom Tailwind CSS configuration driven by CSS variables in `index.css`. **Do not use hardcoded hex colors or arbitrary Tailwind values.**

### Color Palette (from `index.css`)
- **Primary (Deep Blue):** `bg-primary`, `text-primary`, `text-primary-foreground`
- **Secondary (Orange Accent):** `bg-secondary`, `text-secondary`, `text-secondary-foreground`
- **Background/Surface (Clean White/Dark):** `bg-background`, `bg-card`, `bg-popover`
- **Status Colors:**
  - Success: `bg-success`, `text-success` (Green)
  - Destructive: `bg-destructive`, `text-destructive` (Red)
  - Warning: `bg-warning`, `text-warning` (Yellow/Orange)
  - Premium: `bg-premium`
- **Muted/Borders:** `bg-muted`, `border-border`, `ring-ring`
- **Sidebar Theme:** `bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-primary`

### Dark Mode
- Dark mode is implemented via the `.dark` class which overrides the CSS variables. Ensure all components use the standard CSS variables (`bg-background`, `text-foreground`, `border-border`) so dark mode works automatically.

### UI Components (shadcn/ui)
- Always use pre-built components from `src/components/ui/` (e.g., `<Button>`, `<Input>`, `<Card>`, `<Tabs>`, `<Label>`, `<Badge>`).
- If a component requires complex layout, use standard Tailwind flex/grid classes (`flex items-center gap-4`, `grid sm:grid-cols-2 gap-4`).
- Add rich animations using predefined utilities: `animate-fade-in`, `animate-slide-up`, `card-hover`.

---

## 4. Frontend Code Structure & Patterns

### Directory Layout
- `src/pages/`: Contains all route components, heavily lazy-loaded. Organized by domain (e.g., `admin/`, `courses/`, `labs/`).
- `src/components/`: Reusable UI components.
  - `ui/`: shadcn/ui primitives.
  - `common/`: Headers, Sidebars, Layouts.
  - Domain-specific folders: `exam-topics/`, `auth/`, `learning/`.
- `src/store/api/`: RTK Query endpoints (e.g., `examTopicsApi.js`, `courseApi.js`). **Always use RTK Query for server state.**
- `src/lib/`: Utilities, configs, and Axios interceptors.

### Data Fetching Rule
- **DO NOT** use ad-hoc `axios.get()` or `useEffect` for fetching data from the server.
- **ALWAYS** use RTK Query hooks (e.g., `useGetAdminExamTopicsConfigQuery`, `useUpsertExamTopicsConfigMutation`).

### Form & Validation Pattern
- Use the established `useFieldValidation` hook and `ValidatableField` wrapper (see `ExamTopicsAdmin.jsx`).
- Trigger native-like error shaking (`shake={...}`) and highlight borders on validation failure.

---

## 5. Backend Code Structure & Patterns

### Directory Layout (`backend/src/`)
- `routes/`: Express routers, attached to `/api` in `app.js`. Use `authenticate` middleware for protected routes.
- `controllers/`: Request extraction, validation, and response formatting. Call services here.
- `services/`: Core business logic (e.g., `learningService.js`, `courseService.js`).
- `models/`: Sequelize schemas.
- `middleware/`: Auth verification, RBAC checks (`checkPermission`, `checkRole`).

### API Responses
- Always return a standard JSON structure. Typically: `{ status: 200, message: "Success", data: { ... } }` or use the unified error handler for failures.

---

## 6. Role-Based Dashboard, Sidebar & Permissions Rules

> [!IMPORTANT]
> **Strict Role Isolation Rule:** Whenever any UI, Sidebar, Feature, or Permission change is requested for a specific role, that change **MUST ONLY** apply to that specific role's dashboard. It must **NEVER** spill over or affect Student, Super Admin, or any other role's dashboard.

While all roles may share a common base layout structure, each role's:
- **Sidebar Options**
- **Features & UI Components**
- **Permissions & Route Guards**
- **Page Access & Direct URL Protection**
- **Action Buttons (Create/Edit/Delete)**
- **Data & Metrics Visibility**

MUST remain strictly isolated and dynamically controlled according to the user's assigned role.

---

### 1. Super Admin Role
- **Access Level:** Full Access (`super_admin` / `admin`).
- Existing functionality, permissions, features, and Sidebar options must **NEVER** be modified or broken when making changes for other roles.
- Super Admin retains full operational control, including creating/editing courses, labs, webinars, users, and managing platform settings.

---

### 2. Content Approver Role
- **Access Level:** `Student View Permissions + Content Approval Permission`.
- **Sidebar Options:** Inherits Student view items + 1 additional explicit option: **Content Approval** (`/app/course-approval`).
- **Capabilities & Scope:**
  - Can view available/assigned courses, labs, and webinars in read-only mode.
  - Can access the **Content Approval** section (`/app/course-approval`) to review pending submissions and Approve/Reject content.
  - Allowed to view Live Webinars and attendee details, but strictly restricted from **creating, editing, or deleting** webinars (`/app/webinar/create`).
  - Cannot create/edit courses or labs (`/app/courses/new`, `/app/labs/new`).
  - Cannot view global Payment History or perform administrative settings management.

---

### 3. Student Role
- **Access Level:** View-Only (`student`).
- **Capabilities & Scope:**
  - Can view enrolled and available public catalog content (Courses, Labs, Webinars).
  - Cannot approve or reject content.
  - **Content Approval** menu option and route must **NEVER** be visible or accessible to Students.
  - Has zero administrative or content management permissions.

---

### 4. Dynamic Role & Sidebar Control
- **Role Mapping Matrix:**
  - `Super Admin` → Full Access
  - `Content Approver` → Student View Permissions + Content Approval
  - `Student` → View Only
  - `Custom Role` → Only explicitly assigned permissions & features
- Any newly created custom role in the future must dynamically render **ONLY** the Sidebar items and features mapped to its explicit permissions.

---

### 5. Strict Permission Isolation & URL Security
- **No Overflow:** Changes to one role's Sidebar or Dashboard must never leak into another role's view.
- **Complete Enforcement:** Hiding a button or Sidebar item is not enough. Access must be secured at 3 levels:
  1. **Sidebar / UI Visibility:** Hide unpermitted menu items & buttons.
  2. **Frontend Routing (`RouteGuard` / Page Guard):** Block direct URL access (e.g., `/app/webinar/create` or `/app/courses/new`) and redirect with a toast notification.
  3. **Backend / API Level:** Enforce `checkPermission` middleware on backend API endpoints.

---

### 6. Trainer Resources (Current State)
- Hidden from the sidebar navigation across all roles (`instructor-resources` and `admin-instructor-resources`), while keeping code preserved.

---

## 7. Current Development Focus
As of recent updates, the focus is on:
1. **Admin Interfaces:** (e.g., `ExamTopicsAdmin`, Lead Pipelines).
2. **Payment Integrations:** Razorpay integration for exam vouchers and courses.
3. **RBAC Hardening:** Ensuring routes on both frontend (`RoleRoute`, `useRouteAccess`) and backend (`checkPermission`) are perfectly synced.
4. **Content Management:** Exam topics, learning sets, and dynamic ID cards/certificates.

---

## 7. Instructions for the AI Assistant

When asked to implement a new feature or fix a bug:
1. **Analyze First:** Check if a UI component or API endpoint already exists before creating a new one.
2. **Be Concise:** Output only the modified code chunks or necessary new files. Do not rewrite entire 600+ line files unless explicitly requested. Use `multi_replace_file_content` or `replace_file_content` tools efficiently.
3. **Preserve Logic:** Do not break existing hooks, RBAC checks, or API interceptors.
4. **Follow Theme:** Strictly adhere to the color palette and Tailwind conventions listed above. If it looks "basic", you failed. It must look premium and modern.
5. **No Chrome Auto-Testing:** Do NOT automatically launch the browser subagent or open Chrome to check UI changes. Perform code updates directly and inform the user so they can view and verify the changes themselves.
6. **Update this Context:** If a major architectural shift happens, update this `AI_PROJECT_CONTEXT.md` file so future sessions remain in sync.
