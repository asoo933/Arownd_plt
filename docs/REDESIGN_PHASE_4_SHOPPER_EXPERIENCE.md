# Arownd — Phase 4: Shopper Discovery & Product Experience

**Date:** 2026-11-06  
**Branch:** `work/next-task`  
**Direction:** Product-first marketplace, mobile-first, Arabic/RTL-first.

## Delivered

### Home
- Tightened the mobile page rhythm and header sizing.
- Kept the search and wilaya selector at the top of the experience.
- Made category chips easier to scan and horizontally browse.
- Tightened the product grid spacing while preserving two columns on phones.
- Kept nearby stores as a useful, data-driven section rather than adding promotional banners.

### Product cards
- Rebuilt the shared `ProductCard` as a compact product-first card.
- Increased the image's visual priority and reduced text density.
- Kept product name, current best-offer price, rating, favorite action, discount and stock status.
- Removed the unavailable-state pointer lock so shoppers can still open the product page and inspect its details; purchase availability remains handled by the existing product flow.
- Kept best-offer pricing sourced from `g.bestOffer`; no duplicate pricing logic was introduced.

### Explore and categories
- Reduced heading and filter visual weight.
- Improved horizontal category/filter browsing on narrow screens.
- Tightened product grid gaps.
- Preserved existing search debounce, query keys, infinite pagination, stock filter and sort behavior.

### Product and store details
- Made the product gallery square on mobile and reduced surrounding padding.
- Reduced the store cover height on phones.
- Made store tabs respect the device top safe area.
- Tightened store product grid spacing.

## Files changed

- `src/routes/index.tsx`
- `src/routes/explore.tsx`
- `src/routes/category.$catId.tsx`
- `src/routes/products.$productId.tsx`
- `src/routes/stores.$storeId.tsx`
- `src/components/sooqy/cards.tsx`

## Business logic preserved

- Search and pagination query functions.
- Wilaya and geolocation filters.
- Existing product/store routes and route parameters.
- `pickBestOffer()`-derived `bestOffer` data and current price source.
- Favorite state and actions.
- Product stock and purchase validation.
- Bag identity, options and checkout behavior.
- Supabase access, RLS, RPC and database schema.

No database migrations or authorization changes were made.

## Verification status

This phase changes presentation and keeps existing business behavior intact; no new business-logic helper was added. Static repository readback confirms the edits were committed. The following checks still need to run in an executable checkout:

```bash
npx tsc --noEmit
npm run lint
npm run ui:check
npm test
npm run build
```

No browser-based visual regression, device testing, or runtime test suite was run as part of this phase. Confirm product image cropping, sticky tabs and the bottom navigation overlap on physical iOS/Android devices before release.
