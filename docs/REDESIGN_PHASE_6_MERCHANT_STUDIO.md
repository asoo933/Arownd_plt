# Arownd — Phase 6: Merchant Studio Experience

**Date:** 2026-11-06  
**Branch:** `work/next-task`  
**Direction:** Mobile-first merchant workspace, Arabic/RTL-first.

## Delivered

### Merchant dashboard
- Reduced the vertical overhead and tightened the dashboard rhythm.
- Simplified the store identity panel and its action controls.
- Refined the metric grid for two-column mobile scanning.
- Made pending order/reservation rows easier to tap.
- Kept low-stock attention visible without adding promotional panels.
- Preserved merchant role checks, store queries, realtime subscriptions, and existing action handlers.

### Product management
- Refined the shared product row with larger thumbnails and simpler surfaces.
- Kept quick stock updates, availability switch, edit, image management and delete actions.
- Tightened product search and filter container spacing.
- Preserved inventory calculations and merchant mutation functions.

### Add product
- Refined the form spacing, control sizing, and mobile sticky-navigation clearance.
- Moved the remaining product creation labels and access-state copy into the studio translation dictionary.
- Added Arabic and English keys for the form labels and access messages.
- Preserved category selection, size/color parsing, image upload, validation, mutation and query invalidation.

### Store settings
- Reduced cover height on phones and tightened the identity section.
- Changed contact fields to a single column on very narrow screens, then two columns when space allows.
- Preserved store update payload, location coordinates, opening hours, category and social links.

### Shipments
- Uses dynamic viewport height and reserves bottom safe-area/navigation space.
- Status filters become horizontally browsable on phones and return to a grid on larger screens.
- Shipment cards and metadata use tighter spacing.
- Preserved store-scoped fetch, realtime updates, status counts and shipment data.

### Merchant order details
- Tightened the page and order summary spacing for phones.
- Preserved merchant-order ownership matching, quote submission, rejection, COD collection and tracking subscriptions.

## Files changed

- `src/routes/studio.index.tsx`
- `src/components/sooqy/studio-product-row.tsx`
- `src/routes/studio.add-product.tsx`
- `src/lib/dictionaries/studio.ts`
- `src/routes/studio.settings.tsx`
- `src/routes/studio.shipments.tsx`
- `src/routes/studio.orders.$orderId.tsx`
- `src/test/studio-mobile-layout.test.ts`

## Business and security boundaries

- No schema changes, migrations, RLS or RPC changes.
- Existing role checks and merchant-specific queries remain in place.
- Existing image upload and product/store mutation flows remain unchanged.
- No new pricing, stock or order business logic was introduced.
- Success feedback continues to happen only after the existing server operation resolves.

## Verification status

Static repository readback confirms all changed files and the new test file exist on `work/next-task`. The tests were authored but **not executed**.

Required verification in an executable checkout:

```bash
npx tsc --noEmit
npm run lint
npm run ui:check
npm test
npm run build
```

No browser visual regression, real merchant account workflow, image upload, or physical iOS/Android device test was performed. Check especially the merchant dashboard, add-product sticky action area, and horizontal shipment filters on narrow devices before release.
