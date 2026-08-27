# RBAC & LMS — Production Readiness Notes

## RBAC: was it “working”?

The **middleware and services behave correctly** (`checkPermission` → `roleService.checkUserHasPermission`). Problems were:

1. **Missing permission rows** — Many route strings (`publish_courses`, `assign_labs`, `view_categories`, …) were not created in the DB by the main seeder, so non–Super Admin users received **403** even when their job required access.
2. **Super Admin** — The role is named **“Super Admin”** in seeds, but `checkSuperAdmin()` only accepted `super_admin`. That is **fixed** to accept both spellings.
3. **Super Admin vs permission list** — Super Admin users now **bypass** explicit permission checks in `checkUserHasPermission`, so new route permissions do not require re-seeding every permission onto that role.
4. **`manage_categories`** — Routes use granular ids (`view_categories`, …). Holders of `manage_categories` now get those implied in `getUserPermissions` (expanded set).
5. **Course create (critical)** — `POST /api/owner/courses` and `create-full` had **no** `checkPermission("create_courses")`, so any logged-in user could create courses. **Fixed:** both routes require `create_courses`.
6. **Creator insights** — Role comparison used `"superadmin"` while the DB role is `"Super Admin"`. **Fixed** with normalized role names.
7. **Linux / CI** — `setupDatabase.js` required `../seed/rbacSeeder`; only `Rbacseeder.js` existed on disk. **`backend/src/seed/rbacSeeder.js`** now re-exports the implementation (works on case-sensitive filesystems).

## What to run after pulling changes

From `backend/` (with `.env`, MySQL, Redis):

```bash
npm run rbac:setup
```

Or reset seed data (destructive):

```bash
npm run rbac:reset
```

Existing databases that already have roles: either re-run a migration/seed that **upserts** the new permission rows, or run the project’s reseed if acceptable for your environment.

## Courses, labs, skill builder, digital programs

| Area | Backend | Notes |
|------|---------|--------|
| **Courses** | `routes/course.js` (public), `routes/common/course.js` (owner CRUD) | Public catalog + owner routes behind auth + RBAC |
| **Labs** | `routes/lab.js`, `routes/common/lab.js` | Public GET by slug/id; mutations use lab permissions |
| **Skill builder** | `learningService.submitSkillBuilder`, `/api/me/labs/:labId/skill-builder/submit` | Scoring logic in service; ensure lab `instructions` JSON matches UI |
| **Digital programs** | Admin UI + `view_programs` / `manage_programs` | Align frontend routes with seeded permissions |

The `doc/` folder in this repo mainly holds **bundle lab exercise text files** (AWS-style labs), not a full product spec. For client SOW alignment, keep a **markdown copy** of `SOW_Skill-Enhancement_v1.6` inside the repo (or `doc/sow/`) so CI and contributors can diff requirements.

## Frontend

- **`src/lib/axios.js`** — Debug logging is **off** in production builds unless `VITE_DEBUG=true`.

## SOW PDF (external path)

The file `SOW_Skill-Enhancement_v1.6 (2).pdf` on the desktop was not parsed in this environment (no PDF text library). **Recommendation:** export the SOW to `.md` or `.txt`, commit under `doc/sow/`, and trace each deliverable to routes and permissions.

---

*Last updated: 2026-04-17*
