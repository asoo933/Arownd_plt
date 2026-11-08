# Arownd Mobile

Expo SDK 58 / React Native application for the Arownd Android and iOS native experience.

## Android project boundary

The native application lives in this directory. The repository-root `android/` directory belongs to the legacy Capacitor web application and is **not** the Android project for this Expo app.

The Expo Android native project is generated at `mobile/android/` from `app.json` when native project generation is requested. Do not copy or reuse the root Capacitor Android project.

## Environment

Create `.env.local` in this directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Only the Supabase publishable key belongs in the client app. Never add a service-role key or database connection string.

## Android preparation (no APK/AAB build)

From this directory:

```bash
npx expo config --type public
npx expo-doctor
npx expo prebuild --platform android --no-install
```

The `prebuild` command generates the Android Gradle project and native configuration only. It does not assemble an APK or AAB. The generated project is placed in `mobile/android/`.

## App commands

```bash
npm install
npx expo install --check
npm run typecheck
npm test
npm run doctor
npx expo start
```

## EAS profiles

`eas.json` contains an internal-preview APK profile and a production Android App Bundle profile for a later release. No EAS build has been started. Before the first EAS build, link this Expo app to its EAS project and configure Android signing credentials securely.

The auth redirect scheme is `com.arownd.app`. Configure the matching redirect URL in Supabase Auth before testing email confirmation or password recovery.
