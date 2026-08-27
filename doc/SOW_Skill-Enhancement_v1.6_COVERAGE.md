# SOW Skill Enhancement v1.6 — Coverage vs This Repository

This document maps **SOW_Skill-Enhancement_v1.6** (source: `Downloads/SOW_Skill-Enhancement_v1.6 (2).txt`) to the **practice-mastery-platform** codebase. Status: **Implemented** (usable end-to-end), **Partial** (exists but incomplete vs SOW), **Gap** (not found or not wired).

---

## Legend

| Status | Meaning |
|--------|--------|
| **Implemented** | Feature present in backend and/or frontend in a form that matches the intent |
| **Partial** | UI, API, or infra exists but missing SOW details (workflow, scale, or policy) |
| **Gap** | Not implemented or only placeholder |

---

## Platform objectives & homepage (Sections I–VII, XX)

| SOW item | Status | Notes |
|----------|--------|--------|
| Rolling banner / latest offerings | **Partial** | Admin content/banners exist (`AdminBanners`, content hero); verify dynamic “latest courses” feed |
| Guided lab exercises | **Implemented** | Labs, lab run, skill builder, bundles/group labs |
| User registration | **Implemented** | Auth flows, OTP/MFA-related services in backend |
| User dashboard / My Learning | **Partial** | `MyLearning`, progress; SOW wants richer path selection, timers, abandon lab — not all modeled |
| Success stories & testimonials | **Partial** | Marketing sections on `Index.jsx`; may be static |
| Certification test series | **Partial** | `Certification.jsx` mentions Exam Mode; full test engine + reports TBD |
| About / Why / Support / FAQ | **Partial** | Routes/pages exist in app; depth vs SOW varies |
| Auto email inquiry | **Gap** | Needs confirmed `emailService` + forms + queue |
| WhatsApp integration | **Gap** | Typically link/widget; not verified in repo |
| CMS / flexible pages | **Partial** | Admin content areas; not a full headless CMS |

---

## Commerce & programs (VIII–XVI, XI–XIV)

| SOW item | Status | Notes |
|----------|--------|--------|
| Cloud account services (purchase, duration) | **Gap** | No dedicated cloud-account SKU flow found |
| Subscription & discounts / coupons | **Partial** | Enrollment + `Vouchers` / admin voucher UI; full coupon engine unclear |
| Instructor resources (download materials) | **Gap** | No dedicated “trainer slides purchase” module found |
| Instructor-led training (scheduled live) | **Partial** | Admin webinar pages exist; “manual comms” matches SOW — automation limited |
| On-demand video training | **Implemented** | Course media, HLS streaming, processed courses |
| Career assistance (resume, mock interviews) | **Gap** | `/careers` is present; SOW “premium packages / mock interviews” not verified |
| Exam vouchers | **Partial** | `/vouchers` + admin voucher create; purchase flow vs payment gateway TBD |
| Skill assessment quiz (adaptive paths) | **Partial** | Skill builder / assessment wording in UI; full adaptive quiz engine not verified |
| Free webinars & training | **Partial** | Admin webinar list/detail routes |
| Live events & expert talks | **Partial** | Same bucket as webinars/events |
| Multi-currency (INR & USD) | **Partial** | `currency` on course detail, `helper` conversion helpers; full checkout dual-currency TBD |
| Analytics (GA, Clarity, etc.) | **Gap** | Add tags in `index.html` / env-driven script injection |

---

## Security (Security Requirement I–XIII)

| SOW item | Status | Notes |
|----------|--------|--------|
| Restrict copy from webpage | **Partial** | Can use CSS/JS policies; not audited globally |
| Single session / invalidate old login | **Partial** | Sessions + Redis; explicit “single device only” policy needs product rules in `sessionService` |
| No download of images/videos | **Partial** | HLS + key endpoint; browser can still capture — needs DRM policy + headers |
| Auto logout on inactivity | **Partial** | Frontend/session TTL; align idle timeout across client/server |
| Restrict deep-link access to content | **Partial** | `accessControl` for streams; expand for all assets |
| Encrypt in transit & at rest | **Partial** | HTTPS assumed; DB encryption at rest = ops |
| Dynamic watermarks (user on labs/media) | **Partial** | `imageProtection.js` (watermark path); extend to video/lab VMs as SOW |
| Prevent browser cache | **Partial** | No-store on some streams; apply consistently |
| Activity logs | **Partial** | `auditService` / request logging; completeness TBD |
| OTP registration + MFA | **Implemented** | TOTP/MFA routes and services |
| RBAC | **Implemented** | Sequelize + Redis cache; recent production fixes (see `RBAC_AND_LMS_PRODUCTION_READINESS.md`) |
| Responsive + accessible | **Partial** | React + Tailwind; formal a11y audit TBD |
| SEO | **Partial** | `react-helmet-async` usage varies by page |

---

## Guided lab exercises (detailed)

| SOW item | Status | Notes |
|----------|--------|--------|
| Path variations (manual / video / comprehensive / instructor / master / challenge) | **Partial** | Lab `type`, metadata, course–lab linking; not all taxonomy fields exposed |
| Cloud account access (admin emails creds, hours window, WhatsApp request) | **Gap** | Manual process; no full workflow in app |
| Locked content until purchase | **Implemented** | `contentLocked`, enrollments, previews |
| Search & filter (level, format, cert, type) | **Partial** | List pages; “advanced search” may need backend facets |
| Rich content editor (formatting, collapsible, code, notes, media, files) | **Partial** | Block editor / lab builders; versioning “automatic” — verify |
| Badges / certificates | **Implemented** | Course certificate endpoint; lab completion flows |
| Lab metadata (ID, type, time, level, cost, points) | **Partial** | Model fields exist; points/redeem integration TBD |
| Draft / publish | **Implemented** | Lab/course status enums + approvals |

---

## User registration (Section 3)

| SOW item | Status | Notes |
|----------|--------|--------|
| Email registration | **Implemented** | |
| OTP (SMS gateway) | **Partial** | Email OTP patterns; SMS provider integration TBD |
| Mandatory 2FA | **Partial** | MFA supported; “mandatory for all” is policy flag |
| Social login (Google, LinkedIn, …) | **Partial** | Google-related services exist; LinkedIn TBD |
| Password recovery / periodic reset | **Partial** | Forgot-password flows; periodic reset = policy |
| Profile + photo + corporate employee ID | **Partial** | User model fields; corporate ID field TBD |

---

## User dashboard (Section 4)

| SOW item | Status | Notes |
|----------|--------|--------|
| Learning path selection at login | **Gap / Partial** | Not a forced global wizard |
| Progress, badges, statuses, timers | **Partial** | Progress exists; “Expired”, pause, abandon — partial |
| Notes & annotations in lab | **Gap** | Personal notes feature not verified |
| Discussion (instructor-led subscribers) | **Gap** | No forum thread model found |
| Ratings & feedback (admin-only view) | **Gap** | |
| Bookmarks | **Gap** | |
| Upcoming classes / events | **Partial** | Webinar-style pages |

---

## Roles (Section 5)

| SOW role | Status | Notes |
|----------|--------|--------|
| Admin (Super Admin) | **Implemented** | RBAC + admin UI |
| Approval / Subscription Manager | **Partial** | Approvals + enrollments; “subscription manager” naming align in roles |
| Writer / Content Creator | **Partial** | Instructor/content permissions; versioning as SOW |
| Learner | **Implemented** | |
| Support | **Partial** | Support pages; dedicated support role permissions TBD |

---

## Certification test series (Section 6)

| SOW item | Status | Notes |
|----------|--------|--------|
| Homepage + MCQ / multi / drag-drop | **Partial** | Question types in skill builder overlap; full “Test Series” product TBD |
| Learning vs Exam mode + reports + cert | **Partial** | UI hints; reporting engine TBD |
| Purchase test series | **Partial** | Generic commerce — not isolated SKU |

---

## Others — integration, referral, secondary site (Section 14)

| SOW item | Status | Notes |
|----------|--------|--------|
| Secondary website (labs + test series only) | **Gap** | Separate deploy/config; same API possible |
| User groups + assigned paths/labs/tests | **Gap** | No `UserGroup` model verified |
| Referral program | **Gap** | |
| Skill assessment (adaptive tree) | **Partial** | Quiz UX partial |
| Homepage feature flags (webinars, events, ILT, etc.) | **Partial** | Admin settings patterns; central feature flag service TBD |

---

## Recommended next steps (priority)

1. **Product**: Export this matrix to the client; agree **MVP vs phase 2** (many SOW lines are multi-sprint).
2. **Engineering**: For each **Gap** going into MVP, add API + DB models (e.g. user groups, referrals, test-series SKU).
3. **Security review**: Single-session policy, watermark on video, cache headers, copy protection — single pass before prod.
4. **SOW traceability**: Keep this file in `doc/` and update when features ship.

---

*Generated from SOW text and repository review — 2026-04-17.*
