# Arownd — Phase 3: Mobile Application Shell & Navigation

**Date:** 2026-11-06  
**Branch:** `work/next-task`  
**Direction:** Mobile-first, Arabic/RTL-first, native-feeling navigation.

## Delivered

- The shared `AppShell` now uses the dynamic viewport unit (`100dvh`) and clips accidental horizontal overflow.
- The root application frame uses `100dvh`, reserves the top safe area and reserves bottom-navigation height plus the device bottom safe area exactly once.
- Page headers stick below the device top safe area.
- Bottom navigation keeps its translucent elevated surface and touch-friendly targets; active states and nested shopper routes are clearer.
- Merchant navigation is reduced from five destinations to four: workspace, add product, store, profile.
- Delivery-company accounts now receive a dedicated navigation bar: delivery dashboard, marketplace home and profile. They no longer receive the shopper navigation by default.
- Delivery navigation labels are added in Arabic and English.
- Shared `app-page` and `app-workspace` no longer duplicate root bottom spacing.

## Files changed

- `src/components/sooqy/app-shell.tsx`
- `src/components/sooqy/BottomNav.tsx`
- `src/components/sooqy/StudioNav.tsx`
- `src/components/sooqy/DeliveryNav.tsx` (new)
- `src/components/sooqy/AccountBottomNav.tsx`
- `src/components/sooqy/page-header.tsx`
- `src/routes/__root.tsx`
- `src/styles.css`
- `src/lib/i18n.ts`
- `src/test/design-tokens.test.ts`
- `src/test/navigation-layout.test.tsx` (new)

## Deliberate boundaries

- No route URLs were renamed.
- No role or permission checks were moved into the client; the navigation only reflects the account type returned by the existing Supabase RPC. Backend authorization remains authoritative.
- No database migrations or Supabase policy changes.
- No administration navigation was invented because the audit found no dedicated admin application route.
- The current page content and merchant dashboard internals are not redesigned in this phase; those belong to the shopper and merchant experience phases.

## Verification status

Static repository readback confirms the expected files and changes are present. The following commands still need to run in an executable checkout:

```bash
npx tsc --noEmit
npm run lint
npm run ui:check
npm test
npm run build
```

The app has not been launched on iOS/Android devices in this phase, so safe-area behavior still needs device-level verification.
