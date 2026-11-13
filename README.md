# Arownd Platform

Arownd is a native-first commerce platform. The repository contains the Expo mobile application, Supabase backend assets, shared API/database packages, an Express API service, and the public website.

## Repository layout

| Path | Responsibility |
| --- | --- |
| `mobile/` | Expo SDK 58 / React Native application. Expo Router screens live in `app/`; shared UI and application code live in `components/` and `lib/`. |
| `supabase/` | PostgreSQL migrations, Row Level Security policies, RPC-related SQL, and Edge Functions. |
| `lib/api-spec/` | OpenAPI source and API code-generation configuration. |
| `lib/api-zod/` | Generated and shared Zod API contracts. |
| `lib/db/` | Drizzle database package and schema entry point. |
| `artifacts/api-server/` | Express API service. |
| `website/` | Static public website. |
| `.github/workflows/` | CI, Android build, website deployment, and security workflows. |
| `docs/` | Architecture, audit, redesign, and database notes. |

## Mobile application

The mobile app is an independent npm package under `mobile/`. Run its commands from that directory:

```bash
cd mobile
npm ci --legacy-peer-deps
npm run typecheck
npm run lint
npm test
npm run doctor
npx expo start
```

For Android native project generation, use the documented Expo Prebuild workflow in [mobile/README.md](mobile/README.md). The generated native project belongs under `mobile/android/`; do not use a legacy Android project elsewhere in the repository.

## Workspace packages

The repository root uses pnpm for the packages declared in `pnpm-workspace.yaml`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck:libs
pnpm typecheck:api-server
pnpm build:api-server
```

The mobile app is intentionally managed separately with its own `package.json` and `package-lock.json`. Keep the two lockfile workflows independent; do not move the mobile package into the pnpm workspace without an explicit architecture decision.

## Backend and security boundaries

- Supabase Auth uses the app's PKCE flow; PostgreSQL access is governed by RLS and server-side RPC validation.
- Never put a Supabase service-role key, database password, or other server secret in the mobile app.
- Database migrations in this repository are versioned source files. Applying them to a live Supabase project requires explicit approval.
- Checkout currently supports cash on delivery (COD) only.

## Project conventions

- Arabic is the primary product language and right-to-left layout is required.
- Keep UI, business logic, and data access in their existing layers.
- Reuse existing services, hooks, design tokens, and dependencies before adding abstractions.
- Do not change dependency versions or introduce new packages without approval.
- Treat historical audit documents as snapshots; verify current source before relying on their findings.
