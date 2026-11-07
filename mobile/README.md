# Arownd Mobile

Expo SDK 58 application for the Arownd native experience.

## Environment

Create `.env.local` in this directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Only the Supabase publishable key belongs in the client app. Never add a service-role key or database connection string.

## Commands

```bash
cd mobile
npm install
npx expo install --check
npm run typecheck
npm test
npm run doctor
npx expo start
```

The auth redirect scheme is `com.arownd.app`. Configure the matching redirect URL in Supabase Auth before testing email confirmation or password recovery.

The app currently implements the five initial auth screens. Merchant store onboarding and post-auth destination handling will be connected in the next frontend phase.