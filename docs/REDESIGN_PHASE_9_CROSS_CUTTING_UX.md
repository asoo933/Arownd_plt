# Redesign Phase 9 — Cross-cutting UX, Delivery i18n and Mobile Consistency

Branch: `work/next-task`

## Scope

This phase starts the focused follow-up requested for:
- User journey coverage
- Shared design consistency
- Mobile experience
- Arabic/English translation and RTL/LTR behavior

## Implemented in this phase

### Delivery company journey and localization
- Added `src/lib/dictionaries/delivery.ts` with 75 Arabic/English keys covering registration, approval state, shipment queues, status updates, and cash-on-delivery feedback.
- Registered the dictionary group in `src/lib/dictionaries/index.ts`.
- Replaced Arabic UI copy in `src/routes/delivery-register.tsx` and `src/routes/delivery-dashboard.tsx` with translation keys, including metadata, validation, empty states, actions, status labels, and server-result feedback.
- Kept shipment and COD success messages after their server calls resolve; no optimistic success was introduced.
- Set contact phone, email, and license fields to `dir="ltr"` so identifiers remain readable inside the Arabic RTL form.

### Shared visual consistency and mobile
- Aligned delivery dashboard stat cards and shipment cards with `--radius-card`.
- Aligned primary accept/reject controls with `--radius-control`.
- Kept 44px minimum action targets, horizontally scrollable shipment tabs, and safe-area bottom padding.
- Aligned all registration input text to the logical start edge and shared control radius.

### Journey and regression tests
- Added parity assertions for delivery registration and COD translations.
- Added a hook-level regression test that checks `document.documentElement.lang` and `dir` when switching Arabic/English.
- Expanded the route smoke list to include delivery registration.
- Updated the carrier shipment journey expectation to match the localized shipment label.
- Updated delivery mobile checks for shared tokens, translated copy, and LTR contact fields.

## Static review findings

- Delivery dictionary parity: 75 Arabic keys and 75 English keys; no missing keys found by static key extraction.
- Delivery dashboard and registration routes: no remaining Arabic UI text literals found by line scan (Arabic comments are not UI).
- Required delivery mobile class/attribute assertions were checked against the current source.
- The translation hook already updates document `lang` and `dir`; this phase adds a regression test rather than changing the hook's behavior.

## Not completed

- Full cross-role journey expansion for shopper and merchant flows still needs a separate test pass.
- Remaining Arabic hardcoded UI copy elsewhere in the repository has not been comprehensively scanned or migrated.
- Visual review at 320/360/390/430px, tablet, desktop, and actual iOS/Android devices has not been performed.
- No end-to-end test against a real non-production Supabase project was run.
- Admin workflow remains out of scope until product roles and permissions are defined.

## Verification status

Not run in an executable checkout:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run ui:check`
- `npm test`
- `npm run build`

GitHub/Vercel status for the latest phase commit reported `build-rate-limit`; this is an infrastructure quota failure, not a successful or failed application build result.

No database migrations, RLS changes, deployments, or merges to `main` were made.
