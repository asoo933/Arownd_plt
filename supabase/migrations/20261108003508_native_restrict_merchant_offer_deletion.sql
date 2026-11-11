-- Native merchant screens do not delete offers directly; keep offer removal server-managed.
revoke delete on table public.store_offers from authenticated;
