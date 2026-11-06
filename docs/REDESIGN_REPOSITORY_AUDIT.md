# Repository Redesign Audit — Cross-cutting Review

Branch: `work/next-task`
Audit date: 2026-11-06

## Executive result

The redesign is **not yet complete across the entire repository**. The core shopping, checkout, merchant, and delivery surfaces received substantial visual work, and a static scan found that many route files use logical Tailwind spacing classes. However, several routes still contain Arabic UI literals and have not been migrated to the shared dictionaries. The root navigation guard initially used native `window.confirm`; this was replaced during the follow-up pass with the shared `ConfirmDialog` for both browser links and the Android back button.

This report deliberately distinguishes static source review from executable verification. No claim of passing tests or production build is made.

## Scope reviewed

Reviewed the active route inventory, shared shell/navigation, shared design primitives, translation groups, and the delivery changes from the preceding phase. Route files were scanned for Arabic text literals and physical-direction Tailwind utilities (`pl-`, `pr-`, `ml-`, `mr-`, `left-`, `right-`, `text-left`, `text-right`).

## Findings

### 1. Translation and localization gaps

Arabic UI literals remain in legal-content routes and other pages still awaiting review. The account, shopper discovery, checkout, create-store, and Merchant Studio routes listed in the recent batches have been migrated. The remaining representative findings are:

| Route | Approx. non-comment Arabic lines found | Examples |
|---|---:|---|
| `privacy.tsx` | 114 | Legal copy and accessibility labels |
| `terms.tsx` | 108 | Legal copy and accessibility labels |

Counts are source-line indicators, not exact counts of visible strings; they can include arrays, metadata, and accessibility attributes. Nevertheless, they demonstrate that Arabic/English parity is not yet complete across the application.

#### 1.1 Latest localization batch (2026-11-06)

- Added `src/lib/dictionaries/activity.ts` with matching Arabic/English keys for notifications, wallet, and reservations.
- Registered the group in `src/lib/dictionaries/index.ts`.
- Migrated `src/routes/notifications.tsx`, `src/routes/wallet.tsx`, and `src/routes/reservations.index.tsx` to translation keys; static scan found no remaining Arabic UI literals in these three routes (comments excluded).
- Added dictionary parity assertions for wallet/notifications/reservations and added `/reservations/` to route smoke coverage.
- Static dictionary scan: 120 activity keys in each language, no missing language counterparts, no unresolved translation references, and no new cross-group collisions. Existing allowed accessibility-key duplicates remain unchanged.
- Settings, profile, account-request, create-store, and the reviewed Merchant Studio routes were migrated in subsequent batches; legal documents remain intentionally pending legal review.

#### 1.2 Account and settings localization batch (2026-11-06)

- Added bilingual settings, profile fallback/accessibility, and account-request copy to `src/lib/dictionaries/activity.ts` (with existing profile keys reused from the pages dictionary to avoid collisions).
- Migrated `src/routes/settings.tsx`, `src/routes/profile.tsx`, and `src/routes/delete-account.tsx` to translation keys, including SEO metadata and server-confirmed feedback.
- Account-request dates now use the active locale (`ar-DZ` / `en-DZ`). Cancelling a request now also gives success feedback only after the server confirms and the query is invalidated.
- Added translation assertions for settings, profile, and account-request strings.
- Static checks: 232 Arabic and 232 English activity keys; no unresolved references in the three migrated routes; no unapproved cross-group collisions; no Arabic UI literals found in these routes (comments excluded).
- `privacy.tsx` and `terms.tsx` remain outstanding as legal-content localization. Checkout, create-store, and Merchant Studio routes received follow-up localization.

#### 1.3 Informational and shopper route localization batch (2026-11-06)

- Added complete Arabic/English content keys for About and Help pages in `src/lib/dictionaries/pages.ts`.
- Migrated `src/routes/about.tsx` and `src/routes/help.tsx`, including FAQ entries, delivery partner form labels/placeholders, email subject/body labels, quick links, SEO metadata, and page accessibility labels.
- Kept the Help FAQ and quick-link content reactive to language changes rather than capturing translated strings at module initialization.
- Migrated category filters, sorting, loading/empty states, result count, SEO keywords, and JSON-LD language in `src/routes/category.$catId.tsx`.
- Migrated product-detail sharing errors, reporting action, and own-store notice/actions in `src/routes/products.$productId.tsx`.
- Migrated store detail owner controls, sharing/favorites feedback, tabs, empty states, contact actions, opening-hours labels, weekday names, and SEO metadata in `src/routes/stores.$storeId.tsx`.
- Added bilingual dictionary assertions for About, Help, category, product, and store content. Added `/about` to route smoke coverage.
- Static route scan: no Arabic UI literals found in About, Help, category, or product detail; store detail has only an Arabic explanatory code comment remaining. Dictionary groups have no new key collisions and all newly referenced keys resolve.
- Legal documents (`privacy.tsx`, `terms.tsx`) and other shopper/merchant routes remain outstanding. Legal text should receive a separate legal-language review before being represented as an approved English translation.

#### 1.4 Checkout and merchant store settings localization (2026-11-06)

- Added Arabic/English checkout partial-success and plural tracking-code labels in `src/lib/dictionaries/commerce.ts`.
- Replaced remaining Arabic checkout success summary and tracking action literals in `src/routes/checkout.tsx`.
- Added bilingual store-settings metadata, login/create-store actions, image alt text, category guidance, and save-state labels in `src/lib/dictionaries/studio.ts`.
- Migrated those UI strings and SEO metadata in `src/routes/studio.settings.tsx`.
- Added translation regression assertions for checkout and merchant store settings.
- Static source review only; no executable test, typecheck, lint, UI check, or build was run.
- `privacy.tsx` and `terms.tsx` are deliberately not machine-localized in this pass: legal translations require review against applicable Algerian law and the actual production data practices before publication.

#### 1.5 Merchant dashboard localization follow-up (2026-11-06)

- Added bilingual keys for store verification, product/order dashboard hints, login action, and reservation quantity labels in `src/lib/dictionaries/studio.ts`.
- Migrated the corresponding visible strings in `src/routes/studio.index.tsx`.
- Added Arabic/English interpolation assertions to `src/test/i18n-parity.test.ts`.
- Static source inspection only at that point; the operational route follow-up is documented in section 1.6.
- Final static validation after the merchant batch: all 10 registered dictionary groups have matching Arabic/English key sets, no duplicate keys, and no unresolved translation references in the reviewed routes. The Arabic source scan is clean for the reviewed pages; one Arabic code comment remains in the store route.

#### 1.6 Merchant operational routes and create-store localization (2026-11-06)

- Migrated the remaining visible labels in `src/routes/create-store.tsx`, including both PageHeader states, login guidance, action, subtitle, and SEO title.
- Migrated `src/routes/studio.shipments.tsx` login action, order reference, order link, and currency unit.
- Migrated `src/routes/studio.orders.$orderId.tsx` login and save action.
- Migrated `src/routes/studio.add-product.tsx` SEO title.
- Migrated the map page SEO title and description in `src/routes/map.tsx` using new bilingual keys in `src/lib/dictionaries/pages.ts`.
- Added matching Arabic/English keys and regression assertions. Added route smoke coverage for create-store, add-product, and shipments.
- Static validation: all 10 registered dictionary groups have matching Arabic/English key sets, no duplicate keys, and no unresolved translation references in the reviewed route set. Arabic UI literal scan is clean for create-store, Merchant Studio index/settings/shipments/order-detail/add-product, map, and checkout.
- No executable tests or build checks were run.

## 2. Directional CSS

The route scans completed for the shopper, checkout, order, merchant, and profile/settings route groups found no direct physical-direction Tailwind utilities from the audited patterns. This is a positive static signal, but it does not prove full LTR correctness: icons, map controls, third-party widgets, mixed-direction identifiers, and component internals still require visual testing.

### 3. Translation key collision fixed

The delivery dictionary previously defined generic keys `delivery_address` and `delivery_fee`, overriding base dictionary meanings after `GROUPS` were merged into the shared dictionary. This could cause unrelated screens to display interpolation placeholders or the wrong text.

Fixed by renaming them to:
- `delivery_company_delivery_address`
- `delivery_company_shipment_fee`

Added regression assertions for these scoped names and a group-level collision guard. The only permitted duplicate keys are the existing shared/UI accessibility and retry labels; a static follow-up scan found no other duplicates.

### 4. Delivery implementation defects fixed

- Replaced the unsafe `Record<string, unknown>` registration payload and type assertion with the generated Supabase Insert type and conditional object spreads.
- Applied the existing stat-card color prop to the icon; it was previously accepted but not rendered.
- Added regression assertions for the typed payload and stat icon class.
- Corrected the Arabic `login_required` translation, which contained an accidental English fragment.

### 5. Root navigation confirmation fixed

- Replaced native `window.confirm` in the browser unsaved-form guard with the shared `ConfirmDialog`.
- Replaced native `window.confirm` in the Android back-button handler with the same dialog.
- Kept the pending destination in a ref; confirming clears the dirty-form set and resumes the original anchor click so TanStack Router can handle client-side navigation rather than forcing a full page reload.
- Added bilingual confirmation copy and a regression assertion that the root contains no native `window.confirm` and wires both pending-navigation paths.

The dialog flow is statically reviewed but still needs browser and Android runtime verification, especially repeated taps, Escape/back behavior, and focus restoration.

### 6. Mobile and visual validation

Static source checks found logical spacing utilities in the reviewed route groups, but no actual device/browser visual regression was performed. The following remain unverified:
- 320, 360, 390, and 430px viewport behavior
- iOS/Android safe areas and keyboard interactions
- fixed bottom navigation vs sticky action bars and sheets
- landscape, tablet, and desktop layouts
- dark/light mode contrast and focus visibility
- screen-reader and keyboard navigation across all routes

## Files changed in this audit

- `src/lib/dictionaries/delivery.ts` — scope delivery-specific address/fee keys to avoid global collisions.
- `src/lib/dictionaries/activity.ts` — add bilingual notifications, reservations, and wallet copy.
- `src/lib/dictionaries/index.ts` — register the activity dictionary group.
- `src/routes/notifications.tsx` — migrate visible UI and SEO copy to translations.
- `src/routes/reservations.index.tsx` — migrate visible UI, statuses, and confirmation copy to translations.
- `src/routes/wallet.tsx` — migrate wallet labels, statuses, feedback, and metadata to translations.
- `src/test/i18n-parity.test.ts` — add wallet and activity translation assertions.
- `src/test/journey.test.tsx` — add reservations route smoke coverage.
- `src/routes/delivery-dashboard.tsx` — use the scoped keys and render stat icon colors.
- `src/routes/delivery-register.tsx` — use a typed Supabase Insert payload without an unsafe cast.
- `src/test/i18n-parity.test.ts` — add dictionary collision and scoped-key regression checks.
- `src/test/delivery-mobile-layout.test.ts` — cover stat icon styling and typed registration payload.
- `src/lib/dictionaries/ui.ts` — add bilingual unsaved-change confirmation copy for the planned root guard replacement.
- `src/lib/i18n.ts` — correct the Arabic login-required message.
- `src/routes/__root.tsx` — replace browser and Android native confirmation prompts with the shared dialog; resume client-side navigation after confirmation.
- `src/test/navigation-layout.test.tsx` — add a regression check for the shared unsaved-change dialog and absence of `window.confirm`.

## Verification status

Static GitHub source inspection only. The following commands were **not run** in an executable checkout:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run ui:check`
- `npm test`
- `npm run build`

The latest previously observed Vercel status was affected by `build-rate-limit`; it is not a valid application build result. No new executable CI result was obtained during this pass.

## Release recommendation

Do not mark the redesign complete or release-ready yet. Prioritize:
1. Migrate the listed route copy into bilingual dictionaries and verify parity.
2. Runtime-test the new root confirmation dialog and browser/native back behavior.
3. Run the full verification command set in a real checkout.
4. Complete visual and accessibility checks on mobile and desktop.
5. Only then approve the redesign for the MVP pilot.

No database migrations, RLS changes, deployments, or merges to `main` were made.
