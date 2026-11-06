# Arownd — Phase 5: Bag, Checkout & Order Journey

**Date:** 2026-11-06  
**Branch:** `work/next-task`  
**Direction:** Mobile-first purchase journey, Arabic/RTL-first.

## Delivered

### Shopping bag
- Tightened the page header and showed the item count near the title.
- Grouped each store's products inside a clearer visual section.
- Increased product thumbnail size and simplified each line item.
- Kept variant labels, live offer price, quantity stepper, remove/undo action, stock warnings and price-change warnings.
- Preserved the shared `evaluateBag()` validation and existing bag item identity.
- Kept the delivery fee explicitly pending until the store reviews the order; no estimated fee is presented as final.

### Checkout
- Reduced vertical overhead and refined the four-step progress control.
- Improved mobile product rows and delivery method cards.
- Preserved the existing address requirements for home delivery and no-home-address behavior for store pickup.
- Preserved profile prefill, Algerian phone validation, offer revalidation, cash-on-delivery disclosure, and the sticky order summary.
- Preserved the server order call, request identity, persisted idempotency key, retry behavior, and success screen. No success state is shown before the server returns the created order ID.

### Order history
- Refined order filters and order cards for mobile.
- Added `aria-pressed` to the selected filter tabs.
- Localized cancellation, archive and confirmation copy through the commerce dictionaries.
- Preserved per-store suborder cards, quote acceptance/decline, cancellation, archive actions and Supabase Realtime invalidation.

### Order tracking
- Tightened the tracking page spacing and timeline density.
- Kept order status, shipment status, customer/store updates, delivery address and order totals.
- Preserved realtime subscriptions and existing ownership-scoped data fetches.

## Files changed

- `src/routes/bag.tsx`
- `src/routes/checkout.tsx`
- `src/routes/orders.index.tsx`
- `src/routes/orders.$orderId.tsx`
- `src/lib/dictionaries/commerce.ts`
- `src/test/i18n-parity.test.ts`

## Business and security boundaries

- No database migrations, schema changes, RLS changes or RPC changes.
- No pricing or cart logic duplication; `evaluateBag()` remains the shared bag/checkout evaluator.
- No changes to order creation, idempotency identity, or server-side authorization.
- Checkout's idempotency key is a retry aid, not an authorization mechanism. Server-side validation and database constraints remain authoritative.
- Existing realtime subscriptions remain user-scoped as before.

## Verification status

Static GitHub readback confirms the changed files exist on the target branch. The commerce dictionary was checked for Arabic/English key parity: 209 keys in each language, with no missing keys.

The following checks have **not** been run in an executable checkout:

```bash
npx tsc --noEmit
npm run lint
npm run ui:check
npm test
npm run build
```

No browser-based visual regression, mobile device testing, or live Supabase order creation was performed. Before production, test a full checkout in the approved non-production Supabase project, including network retry/idempotency and multi-store order review.
