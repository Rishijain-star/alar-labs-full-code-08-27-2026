# CLAUDE.md — Backend

Guidance for Claude Code when working in this folder. This is the **backend** API for a learning platform (Alar Labs) — an Express + Sequelize + Redis service with JWT/JWE auth and RBAC.

## Tech Stack

- **Node.js 16+** / **Express 4.18**
- **MySQL 8** via **Sequelize 6** (sequelize-cli for migrations)
- **Redis 7** — sessions, refresh-token store, token blacklist, rate limiting
- **Auth:** JWT (`jsonwebtoken`) with **JWE encryption** (`jose`, RSA-OAEP-256), bcrypt password hashing
- **OAuth:** Passport (Google + GitHub)
- **Security:** helmet, cors, express-rate-limit, express-validator
- **Storage/Media:** Azure Blob (`@azure/storage-blob`), multer, sharp, fluent-ffmpeg (HLS video)
- **Other:** Firebase Admin, Razorpay, Winston logging, speakeasy (2FA), pdfkit, qrcode

## Commands

```bash
npm start              # Production: node app.js
npm run dev            # Dev: nodemon auto-reload
npm test               # Jest + coverage

npm run lint           # ESLint
npm run lint:fix       # ESLint --fix
npm run format         # Prettier

# Migrations (sequelize-cli via migrate.js / .sequelizerc)
npm run migrate              # run pending migrations
npm run migrate:undo         # undo last
npm run migrate:undo:all     # undo all
npm run migrate:status       # show status

# RBAC management
npm run rbac:setup           # init RBAC DB + seed
npm run rbac:reset           # full reset
npm run rbac:admin           # create admin user
npm run rbac:stats           # show stats
npm run rbac:reset-users     # reset users + RBAC
```

## App Bootstrap (`app.js`)

1. Create Express app; apply helmet, CORS, body-parser, cookie-parser, request-id + timing middleware, morgan logging.
2. DB: `db.testConnection()` then `db.syncModels({ alter: false })`; seed cloud career data.
3. Redis: `redisManager.initialize()`.
4. Optional support-chat WebSocket (wrapped in try/catch).
5. Create HTTP server; register graceful shutdown on `SIGTERM`/`SIGINT`.

Routes are mounted through `src/routes/index.js`. Public routes (`/health`, `/api/auth`, public course/lab reads via `optionalAuthenticate`) are registered before the `authenticate` gate; protected routes (`/api/me`, `/api/admin`, `/api/owner`, `/api/rbac`) require it. Static uploads served at `/uploads`.

## Project Structure (`src/`)

```
src/
├── config/        # index.js, database.js, rateLimitConfig.js, Firebase SDK json
├── controllers/   # request handlers (auth, course, lab, learning, content, ...)
├── routes/        # route definitions; index.js mounts everything (+ rbac/, common/)
├── models/        # Sequelize models (auto-loaded by models/index.js)
├── services/      # business logic
│   ├── auth/      # session, token, OAuth
│   └── rbac/      # roleService, permissionService, resourcePermissionService
├── repositories/  # data-access layer (userRepository, courseRepository, ...)
├── middleware/    # auth.js, rbac.js, errorHandler, rateLimit, upload, validation
├── validators/    # input validation schemas
├── lib/           # logger.js, redis.js, redisManager.js, supportChatWebSocket.js
├── utils/         # token.js, crypto.js, keys.js, imageHelper.js, localeHelper.js
├── migrations/    # Sequelize migrations
├── seed/          # RBAC + content seeders (see below)
├── test/          # Jest tests + guides
├── constants/  database/  templates/  uploads/  logs/
```

Layering convention: **controllers → services → repositories → models**. Keep business logic in services, DB access in repositories.

## Database & Migrations

- ORM Sequelize; config resolved via `.sequelizerc` → `src/config/database.js`. Pool: max 10 / min 0.
- Key models: `User`, `Course`, `Lab`, `Lesson`, `LabMedia`, `Enrollment`, `Progress`, `Assessment`, `Role`, `Permission`, `RolePermission`, `Session`, `Device`, `AuditLog`, `Blacklistedtoken`, plus catalog models (Category, Certification, Webinar, CloudService, ExpertTrainingProgram, ...).
- Run migrations with `npm run migrate` (wraps `migrate.js`). One-off maintenance scripts exist in the root (`sync-db.js`, `fix_db.js`, `fix-column.js`) — use deliberately, they mutate schema.

## Auth & RBAC

- **Access tokens:** short-lived, **encrypted (JWE, RSA-OAEP-256)**, carry `user_id`, `role_id`, `jti`. Sent as `Authorization: Bearer <token>`.
- **Refresh tokens:** opaque, long-lived, SHA-256 hashed in DB + Redis, **single-use with rotation** (old token blacklisted on refresh).
- **Sessions:** `sid` httpOnly cookie → `session:<id>` in Redis; multi-device tracking via `user_sessions:<user_id>`.
- **OAuth:** Google/GitHub via Passport; callback `/api/auth/oauth/callback`.
- **RBAC:** `middleware/rbac.js` + `services/rbac/*` — `checkRole`, `checkPermission`, `checkOwnership`, `checkSuperAdmin`, ABAC via `checkAttributeAccess`, OR-logic via `checkAccessByAny`. Permissions cached in Redis with invalidation.
- **Token blacklist** is JTI-based (Redis + DB). Note: design is **fail-open** — if Redis and DB are both down, tokens are accepted (UX over strictness); keep this in mind for security work.

## Redis Keys

| Pattern | Purpose |
| --- | --- |
| `session:<id>` | session data |
| `user_sessions:<user_id>` | set of a user's session IDs |
| `blacklist:jti:<jti>` | revoked tokens |
| `rate_limit:<user_id>:<window>` | refresh rate limiting |

`redisManager` exposes `getClient()` (throws if down) vs `getClientSafe()` (returns null → graceful degradation), plus `healthCheck()` for `/health`.

## Seeders (`src/seed/`)

- `setupDatabase.js` — master RBAC CLI (setup / reset / create-admin / stats) — driven by the `rbac:*` npm scripts.
- `seedRbacData.js`, `seedCloudCareerData.js`, `seedCertificationCatalog.js`, `seedWebinars.js`, `seedAssessmentConfig.js`, `resetUsersAndRbac.js`, `truncateData.js`, etc.

## Docker

`docker-compose up -d` starts:

- **auth-server** — this app (Dockerfile: node:18-alpine, non-root, `/health` healthcheck, port 3000)
- **auth-mysql** — mysql:8.0 (default DB `alar_labs`, persisted volume)
- **auth-redis** — redis:7-alpine (appendonly, persisted volume)
- **redis-commander** — Redis UI on port 8081 (debug only)

## Testing

- Jest 29 (`jest.config.js`), node env, 10s timeout, coverage from `src/` (excludes test/lib/config). Tests in `src/test/**/*.test.js`; setup in `src/test/jest.setup.js` + `setup.js`. Run with `npm test`.

## Environment Variables

From `.env` (template: `.env.example`). **Names only — never commit real secrets:**

- **Server:** `NODE_ENV`, `PORT`
- **DB:** `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_DIALECT`, `DB_LOGGING`
- **JWT:** `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`
- **Redis:** `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
- **Session/Cookies:** `SESSION_COOKIE_NAME`, `SESSION_TTL_SECONDS`, `SESSION_EXTENDED_TTL_SECONDS`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `COOKIE_DOMAIN`
- **OAuth:** `OAUTH_CALLBACK_URL`, `OAUTH_FRONTEND_REDIRECT` (+ Google/GitHub client id/secret)
- **Rate limiting:** `REFRESH_RATE_LIMIT`, `REFRESH_RATE_WINDOW`
- **Azure Blob:** `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_ACCOUNT_NAME`, `AZURE_CONTAINER_DEFAULT`, `AZURE_STORAGE_PUBLIC_BASE_URL`, `AZURE_STORAGE_ENABLED`, `UPLOAD_CHUNK_SIZE_MB`, `UPLOAD_MAX_CHUNK_MB`
- **Admin/Security:** `ADMIN_API_KEY`, `REQUIRE_DEVICE_VERIFICATION`, `CHECK_IP_WHITELIST`
- Firebase config lives under `src/config/`.

## Notes / Gotchas

- `.env` and `.keys/` contain real secrets — keep them out of version control; the committed `dump.rdb`, `*.rdb`, and `test.*`/`vide.html` files are dev artifacts, not part of the app.
- Two RBAC seeders exist (`seedRbacData.js` and `Seedrbacdata1.js`) — confirm which is current before reseeding.
- Token blacklist is fail-open by design (see Auth section) — relevant for any security hardening.
- There is a large amount of root-level documentation (`ARCHITECTURE.md`, `Authentication.md`, `Rbac documentation.md`, `REDIS_*.md`, etc.) — consult these for deeper detail.
