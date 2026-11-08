# Arownd

Arownd is a native mobile application built with **Expo** and **React Native**, with Supabase-backed services and a shared TypeScript backend/API layer.

The active client application lives in `mobile/`. This repository is maintained as a native-first project; the former React web client and its Capacitor wrapper are not part of the current application.

## Project at a glance

| Area | Location | Purpose |
| --- | --- | --- |
| Native mobile app | `mobile/` | Android and iOS application built with Expo, React Native, Expo Router, and TypeScript |
| API service | `artifacts/api-server/` | Node.js API server |
| Database package | `lib/db/` | Shared database schema and Drizzle configuration |
| API validation | `lib/api-zod/` | Shared Zod API types and validation contracts |
| API specification | `lib/api-spec/` | OpenAPI specification and generation configuration |
| Supabase | `supabase/` | Supabase configuration, migrations, and Edge Functions |
| CI workflows | `.github/workflows/` | Native quality checks and Android preview APK workflow |

## Technology stack

- **Mobile:** Expo SDK 58, React Native 0.88, React 19, Expo Router, TypeScript
- **Data and services:** Supabase, Supabase JavaScript client
- **Client data fetching:** TanStack Query
- **Forms and validation:** React Hook Form and Zod
- **Backend:** Node.js, Express 5, Drizzle ORM
- **Quality:** TypeScript, ESLint, Vitest, Expo Doctor
- **Android builds:** Expo Prebuild / Gradle and EAS Build profiles

## Getting started

### Requirements

- Node.js **22.x**
- npm
- Android device/emulator for Android testing, or an iOS device/simulator on macOS
- Supabase project credentials for features that require a live backend

### 1. Configure the mobile environment

Create `mobile/.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use the project's Supabase **publishable key** in the client. Never put a Supabase service-role key, database password, or database connection string in the mobile app or any `EXPO_PUBLIC_*` variable. Expo public environment variables are bundled into the client and must be treated as public.

### 2. Install dependencies

```bash
cd mobile
npm install --legacy-peer-deps
```

### 3. Run the app

Start the Expo development server:

```bash
npm start
```

Run directly on Android or iOS:

```bash
npm run android
npm run ios
```

Or start Expo and open the project on a connected device using the Expo CLI.

## Development commands

Run these commands from `mobile/`:

| Command | Description |
| --- | --- |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest test suite |
| `npm run doctor` | Run Expo Doctor |
| `npx expo install --check` | Check Expo package compatibility |
| `npx expo config --type public` | Inspect the resolved public Expo configuration |

## Android preparation and builds

The Expo app's Android native project is generated under `mobile/android/`. Do not use the repository-root legacy Android project as the native project for this Expo application.

To generate the Android project without installing dependencies again:

```bash
cd mobile
npx expo prebuild --platform android --no-install
```

This command generates native project files; **it does not build an APK or AAB**.

The EAS profiles are defined in `mobile/eas.json`:

- `preview`: internal Android APK distribution.
- `production`: Android App Bundle (AAB) for production distribution.

Before using EAS, link the app to its EAS project and configure Android signing credentials securely.

## Automated checks

GitHub Actions includes the following native workflows:

- **Arownd Native quality checks:** installs the mobile dependencies and runs TypeScript, ESLint, Vitest, and Expo Doctor.
- **Arownd Native Android preview APK:** runs after the quality workflow succeeds on the native branch, generates the Expo Android project, assembles a release APK, and uploads it as a workflow artifact.

The Android preview workflow requires these repository Actions secrets:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The preview APK artifact is retained for 14 days.

## Supabase and authentication

Supabase project configuration, database migrations, and Edge Functions are maintained in `supabase/`. Shared database and API contracts live in the `lib/` packages.

The mobile app uses the auth redirect scheme:

```text
com.arownd.app
```

Configure the matching redirect URL in Supabase Auth before testing email confirmation or password recovery.

Changes to database schemas, API contracts, or Edge Functions should be reviewed alongside their mobile/API consumers to keep the interfaces compatible. Do not apply migrations to a live Supabase project without reviewing the migration and explicitly confirming the target environment.

## Repository principles

- Keep the active mobile application in `mobile/`.
- Keep backend services, shared contracts, and Supabase resources separate from mobile UI code.
- Do not reintroduce the retired React web client or Capacitor wrapper as part of native app work.
- Keep secrets out of source control and out of public client configuration.
- Prefer focused changes and run the relevant mobile checks before merging.

## Further documentation

- [Mobile app guide](mobile/README.md)
- [Expo application configuration](mobile/app.json)
- [EAS build profiles](mobile/eas.json)
- [Supabase configuration](supabase/config.toml)
