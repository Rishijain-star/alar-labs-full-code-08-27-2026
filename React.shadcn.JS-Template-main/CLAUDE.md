# CLAUDE.md — Frontend

Guidance for Claude Code when working in this folder. This is the **frontend** of a learning management platform (LMS), built as a single-page React app.

## Tech Stack

- **React 18.2** + **React Router 7** (SPA, lazy-loaded routes)
- **Vite 5** — dev server & build tool
- **Redux Toolkit + RTK Query** — state management & server data fetching
- **TanStack React Query** — used alongside RTK Query for some queries
- **Axios** — HTTP client with interceptors (token refresh, session handling)
- **Tailwind CSS 3** + **shadcn/ui** (Radix UI primitives) — styling & components
- **Firebase** — auth helpers + Cloud Messaging (push notifications)
- **Razorpay** — payments; **HLS.js** — video; **React Quill** — rich text
- Files are **`.jsx`** (TypeScript is configured for type-checking only, no emit)

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # Production build → dist/
npm run preview   # Preview the production build locally
npm run lint      # ESLint (js,jsx) — fails on any warning (max-warnings 0)
npm run format    # Prettier on src/**/*.{js,jsx}
```

## Project Structure (`src/`)

```
src/
├── App.jsx            # Routes + provider tree
├── main.jsx           # Entry (Redux Provider, Helmet)
├── entry.jsx          # Production entry (silences console)
├── components/        # ~86 components grouped by domain
│   ├── ui/            # shadcn/ui primitives (button, card, dialog, ...)
│   ├── common/        # Header, Sidebar, Layout, Pagination, skeletons
│   ├── auth/ admin/ guards/ cards/ editor/ lab/ learning/ media/ ...
│   ├── ProtectedRoute.jsx  RoleRoute.jsx  AuthInitializer.jsx
├── pages/             # ~37 lazy-loaded page components (+ pages/admin/)
├── store/
│   ├── store.js       # configureStore — slices + RTK Query reducers/middleware
│   ├── slices/        # auth, user, course, category, upload, lab, rbac, ...
│   └── api/           # ~21 RTK Query APIs (courseApi, labApi, userApi, ...)
├── hooks/             # RBAC/permission hooks, SEO, websocket, toast, ...
├── lib/               # axios.js (interceptors), auth, cookies, razorpay, fcm,
│                      #   chunkedUpload, mediaUrl, sanitizeCourseHtml, ...
├── context/           # SiteBrandingContext, PlatformSettingsContext
├── providers/         # ToastProvider
├── utils/  data/  styles/  assets/
└── permissions.json   # RBAC config consumed by the app
```

## Conventions

- **Import alias:** `@/` → `src/` (configured in `vite.config.js` and `tsconfig.json`). Use `import Button from "@/components/ui/button"`.
- **Naming:** PascalCase for components, camelCase for hooks/utils, kebab-case for some lib/css files.
- **Pages are lazy-loaded** via `React.lazy()` + `Suspense` — keep this pattern when adding pages.
- **Server state → RTK Query** (with `providesTags`/`invalidatesTags` for cache invalidation). Prefer it over ad-hoc axios calls in components.
- **Prettier** uses `prettier-plugin-tailwindcss` (auto-sorts Tailwind classes). Run `npm run format` before committing.
- ESLint config: `.eslintrc.cjs` (React + React Hooks rules, no unused vars).

## Routing & Access Control

- **Public routes** render inside `MainLayout` (`/`, `/courses/*`, `/labs/*`, `/training/*`, etc.).
- **Auth routes** (`/auth/login`, `/auth/register`, ...) use `PublicRoute`.
- **Admin routes** (`/admin/*`) use a separate admin layout and are protected.
- Guards: `ProtectedRoute` (auth required), `RoleRoute`/`RouteGuard` (permission required), `SmartRedirect` (role-based redirect).
- RBAC is initialized via hooks (`useInitializeRBAC`, `useLazyRBAC`, `useRouteAccess`) and `permissions.json`.

## Backend Communication

- Base API URL comes from `VITE_API_BASE_URL`.
- Axios instance (`src/lib/axios.js`) holds **global interceptors**: attaches credentials, refreshes the token on `401`, manages the session.
- **Session ID is stored in `localStorage`** (`sessionId`), not an httpOnly cookie — keep this in mind for auth changes.
- Firebase handles push messaging; service worker at `public/firebase-messaging-sw.js`.

## Environment Variables

Set in `.env` (Vite exposes only `VITE_`-prefixed vars to the client). **Names only — never commit real secret values:**

- `VITE_API_BASE_URL` — backend API base URL
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID
- `VITE_DEBUG` — verbose logging toggle
- `NODE_ENV`
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY`

## Deployment

- Built as a static SPA (`npm run build` → `dist/`).
- **Netlify** config in `netlify.toml` rewrites all routes to `/index.html` (SPA fallback). Any host serving this app must do the same SPA rewrite.
- Console output is silenced in production (`silenceConsoleInProduction.js`).

## Notes / Gotchas

- `.env` currently contains real values — do not commit secrets; rotate anything exposed before going public.
- Both RTK Query and React Query are present; prefer RTK Query for new server-state work to avoid duplication.
- Styling uses HSL CSS variables in `index.css`; theme tokens (primary/secondary/etc.) are defined in `tailwind.config.js`.
