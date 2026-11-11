-- Keep merchant offer writes owner-scoped and column-scoped.
-- In particular, clients cannot move an offer to another store/product or
-- manipulate derived availability and identity fields directly.
revoke update on table public.store_offers from authenticated;
grant update (
  price,
  stock_quantity,
  options,
  is_merchant_hidden,
  last_confirmed_at
) on table public.store_offers to authenticated;

-- Existing owner-only UPDATE RLS policy remains the row-level boundary.
-- Availability is derived by sync_store_offer_availability() on the server.
