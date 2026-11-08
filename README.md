# Arownd

Arownd is maintained as a native mobile application backed by Supabase.

## Applications

- **Native mobile:** `mobile/` — Expo SDK 58, React Native, Expo Router and TypeScript.
- **Backend service:** `artifacts/api-server/` — Node.js API service.
- **Database and API contracts:** `lib/db/`, `lib/api-zod/`, and `lib/api-spec/`.
- **Supabase:** `supabase/` — database migrations, configuration and Edge Functions.

The legacy React web application and its Capacitor wrapper have been removed from this branch. This does not delete or modify the Supabase project or its live database.

## Native app setup

See [mobile/README.md](mobile/README.md) for environment configuration, Android preparation, local development, and EAS build profiles.

Required public client environment variables:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Never place a Supabase service-role key or database connection string in the mobile application.

## Backend and database

- API server source: `artifacts/api-server/`
- Database schema package: `lib/db/`
- API validation contracts: `lib/api-zod/`
- OpenAPI specification: `lib/api-spec/`
- Supabase migrations and Edge Functions: `supabase/`

Removing the web client does not imply removing backend capabilities. Keep the native app and backend contracts compatible when changing shared services.
