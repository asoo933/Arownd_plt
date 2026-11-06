# Arownd — Phase 1: Repository Audit

**Date:** 2026-11-06  
**Repository:** `byamyn/arownd-platform`  
**Working branch:** `work/next-task`  
**Audited branch commit:** `d176f8a194a22997e22166cc13c0daec3f05ac38`  
**Scope:** Read-only audit for the approved Premium Marketplace / Mobile First redesign.

---

## 1. Executive summary

The repository already contains a functioning marketplace application with shopper, merchant, and delivery-company journeys. The redesign should primarily replace presentation and navigation composition while retaining domain logic, Supabase access, validation, permissions, and existing workflows.

The source tree currently contains:

- 34 TanStack file routes.
- 110 component files.
- 55 files under `src/lib`.
- 27 test files.
- 69 Supabase migration files.
- Web application plus Capacitor Android and iOS projects.

No database migration or schema change is required solely to redesign the UI.

## 2. Route inventory

### Shopper and public journeys

| Route | Responsibility |
|---|---|
| `/` | Home and product discovery |
| `/explore` | Search, product results, sorting and filters |
| `/category/$catId` | Category results |
| `/latest` | Latest products |
| `/products/$productId` | Product details, variants, offers and reviews |
| `/stores` | Store discovery |
| `/stores/$storeId` | Store details and catalog |
| `/map` | Nearby stores map |
| `/favorites` | Saved products and stores |
| `/bag` | Shopping bag |
| `/checkout` | Order creation flow |
| `/orders` | Customer order history |
| `/orders/$orderId` | Order details and tracking |
| `/profile` | Account and profile |
| `/settings` | Preferences and account settings |
| `/notifications` | Notifications |
| `/wallet` | Wallet preview and controls |
| `/reservations` | Reservation history |
| `/help` | Help |
| `/about`, `/privacy`, `/terms` | Public information and policies |
| `/delete-account` | Account deletion request |
| `/auth`, `/auth/callback` | Authentication |

### Merchant journeys

| Route | Responsibility |
|---|---|
| `/create-store` | Store creation |
| `/studio` | Merchant dashboard |
| `/studio/add-product` | Product creation |
| `/studio/settings` | Store settings |
| `/studio/orders/$orderId` | Merchant order details |
| `/studio/shipments` | Merchant shipment workflow |

### Delivery-company journeys

| Route | Responsibility |
|---|---|
| `/delivery-register` | Delivery-company registration |
| `/delivery-dashboard` | Shipment queue and delivery operations |

### Administration gap

There is **no dedicated admin route or admin dashboard** in the audited `src/routes` tree. Database policies or historical administrative functions do not establish a usable admin interface. The redesign must not invent admin workflows or privileges. If an admin UI is required, its scope and authorized capabilities need a separate product/security definition.

## 3. Current application architecture

- **Routing:** TanStack Start and TanStack Router file routes.
- **Server state:** TanStack Query.
- **UI:** React 19, Tailwind CSS 4, Radix UI and Lucide.
- **Forms and validation:** React Hook Form and Zod are installed; route usage should be assessed per form before changing it.
- **Backend:** Supabase client and existing domain/service modules.
- **Maps:** MapLibre and Leaflet integrations.
- **Charts:** Recharts.
- **Native shell:** Capacitor Android and iOS projects.
- **Monitoring:** Sentry integration.
- **Tests:** Vitest with Testing Library and a Supabase fake for selected journeys.

### Global shell

`src/routes/__root.tsx` owns the application providers and global runtime:

- QueryClientProvider, ThemeProvider, AuthProvider and BagProvider.
- Root error handling and page transitions.
- Native keyboard, back-button, deep-link, push and app-update handlers.
- Service-worker and PWA behavior.
- Connection status and global notifications.
- Role-aware bottom navigation.

The global shell is a high-impact dependency. Redesign it only after documenting which routes need a full-screen, shopper, merchant or native layout.

### Shared layout and navigation

- `src/components/sooqy/app-shell.tsx` provides the common content/workspace frame.
- `AccountBottomNav.tsx` selects navigation based on the authenticated account type.
- `BottomNav.tsx` provides shopper navigation.
- `StudioNav.tsx` provides merchant navigation.
- Delivery-company accounts currently fall back to the shopper bottom navigation in `AccountBottomNav`; this behavior should be reviewed when the delivery experience is redesigned.

## 4. Design and styling baseline

### Actual stylesheet entry

The root route imports `src/styles.css`. That file already defines:

- Semantic color tokens and neutral/lime scales.
- Light and dark themes, including system preference support.
- Typography tokens, spacing, radii and motion.
- Touch-target and control-height tokens.
- Safe-area utilities.
- Bottom-navigation styles.
- Reduced-motion handling.
- Map control styling.

The existing brand colors are already represented in the main token system:

- Lime: `#C6F135`
- Dark: `#0A0A0A`
- Light: `#F5F5F5`
- White: `#FFFFFF`

The current font tokens use Inter and IBM Plex Sans Arabic. These are existing implementation choices, not a final decision for the new identity.

### Stylesheet duplication to resolve

`src/styles/theme.css` currently contains a second set of theme declarations. The root route visibly imports `src/styles.css`; the audit did not establish that the separate theme file is part of the active stylesheet chain. Before Phase 2 changes either file, confirm the complete CSS import chain and choose one source of truth. Do not maintain duplicate competing tokens.

### Existing UI components

The `src/components/sooqy` directory contains reusable marketplace components including:

- Product/store/offer cards and favorite controls.
- Search field and category tiles.
- Bottom sheets, side sheets and confirmation dialog.
- Page headers, section headers and app shell.
- Loading skeletons, empty states and error states.
- Quantity stepper, sticky action bar and status badges.
- Map and store-location components.
- Shopper and merchant navigation.

These components should be assessed and selectively retained or rebuilt. The legacy `sooqy` path names must remain unchanged for compatibility.

## 5. Business logic that must be preserved

| Area | Existing source of truth | Redesign rule |
|---|---|---|
| Marketplace queries and mutations | `src/lib/sooqy.ts` | Keep service contracts; do not duplicate data logic in components |
| Bag state | `src/lib/bag` and related bag modules | Keep one bag state and stable item identity |
| Bag validation and totals | `evaluateBag()` in `src/lib/bag-check.ts` | Use the shared evaluator in bag and checkout |
| Offer selection | Existing market/offer helpers, including `pickBestOffer()` where applicable | Do not reimplement price selection |
| Shipping rules | `src/lib/shipping.ts` | Preserve home/desk and merchant/carrier distinctions |
| Delivery operations | `src/lib/delivery.ts` and RPC calls | Preserve authorization and status transitions |
| Authentication | `src/lib/auth` and Supabase integration | UI visibility is not authorization |
| Localization | `src/lib/i18n.ts` and `src/lib/dictionaries/` | Keep Arabic/English key parity and RTL |
| Theme | `src/lib/theme.tsx` | Keep system/light/dark behavior |

Checkout currently uses `evaluateBag()`, validates current offers and stock, and calls the existing order-creation service. Product variants must remain part of bag-item identity; stock validation is aggregated at the offer level.

Existing delivery modes include merchant-managed fulfillment, store pickup/desk delivery, and carrier-assigned delivery. These are business rules, not visual options to simplify away.

## 6. Localization and RTL findings

- Arabic is the default language and root direction is derived from the selected language.
- Translation groups are split across shared, home, explore, product, commerce, UI, studio and pages dictionaries.
- `src/test/i18n-parity.test.ts` verifies Arabic/English key parity and placeholder parity.
- The source still contains some literal Arabic copy in route components and global handlers. This needs incremental cleanup as pages are redesigned.
- Use logical CSS properties and do not introduce new hardcoded user-facing JSX text.

## 7. Test and quality baseline

Package scripts include:

- `pnpm run typecheck` (including workspace libraries).
- `npm run lint`.
- `npm run ui:check`.
- `npm test`.
- `npm run build` (runs typecheck before Vite build).

Existing tests cover routing, localization, navigation, bag sanitization, search, taxonomy, shipping, store location, favorites/reviews, merchant flows, and selected UI journeys.

The current audit was performed through repository source inspection. **No test, lint, typecheck or production build was executed as part of this phase.** Do not treat existing test files as proof that all real Supabase workflows have been validated.

## 8. Findings and risks to address during implementation

1. **No admin application route:** define scope before promising an admin redesign.
2. **Two theme files:** establish the active CSS import chain and a single token source before changing the design system.
3. **Root shell coupling:** native runtime, auth, query, bag, PWA and role navigation are mounted globally; preserve these behaviors during shell changes.
4. **Role navigation:** delivery-company users currently receive shopper bottom navigation; review against delivery tasks.
5. **Literal Arabic strings:** some route/global code bypasses dictionaries; migrate affected copy as those screens are rebuilt.
6. **Native browser confirmation:** root navigation guards use `window.confirm`; replace with the project's approved confirmation UI when the global shell is redesigned.
7. **Large route components:** several important pages are large (merchant dashboard, checkout, product details and delivery dashboard). Prefer extracting presentation components without moving domain logic.
8. **Backend validation:** UI tests with fakes do not prove RLS, RPC authorization, persistence or cross-role synchronization. Keep those concerns separate and test against an approved non-production environment when needed.
9. **No DB work for visual redesign:** avoid migrations unless a separately reviewed functional requirement makes one necessary.

## 9. Recommended implementation map

| Order | Area | Primary files |
|---|---|---|
| 1 | Design tokens and typography | `src/styles.css`, confirm `src/styles/theme.css`, `src/lib/theme.tsx` |
| 2 | Shared shell and role navigation | `src/routes/__root.tsx`, `app-shell.tsx`, `AccountBottomNav.tsx`, `BottomNav.tsx`, `StudioNav.tsx` |
| 3 | Shopper discovery | `index.tsx`, `explore.tsx`, `category.$catId.tsx`, `latest.tsx`, `cards.tsx` |
| 4 | Product and store | `products.$productId.tsx`, `stores.$storeId.tsx`, `stores.index.tsx` |
| 5 | Bag and checkout | `bag.tsx`, `checkout.tsx`, bag/shipping domain modules |
| 6 | Shopper account and orders | `profile.tsx`, `settings.tsx`, `orders.*.tsx`, `favorites.tsx`, `notifications.tsx` |
| 7 | Merchant | `studio.*.tsx` |
| 8 | Delivery company | `delivery-register.tsx`, `delivery-dashboard.tsx` |
| 9 | Maps and remaining pages | `map.tsx`, `MapPage.tsx`, public/help/legal routes |

This map is an implementation order, not permission to remove or merge existing routes.

## 10. Phase 1 exit criteria

- [x] Confirm repository and working branch.
- [x] Inventory route files and user journeys.
- [x] Inventory shared shell, navigation and UI components.
- [x] Identify styling and theme sources.
- [x] Identify localization and test structure.
- [x] Identify business logic that must remain unchanged.
- [x] Record missing admin UI and other implementation risks.
- [ ] Run the project quality commands in an executable checkout before the first implementation phase.

**Phase 1 status:** Source audit documented. Runtime quality checks remain pending because this phase used repository inspection rather than an executable local checkout.

**Next phase:** Phase 2 — approve and implement the new visual identity and a single coherent Design System before broad page rewrites.
