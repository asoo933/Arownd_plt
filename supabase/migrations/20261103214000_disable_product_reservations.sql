-- Product reservations are disabled. Preserve historical reservation rows and
-- cancellation/merchant-history functions, but prevent any client from creating new ones.
revoke all on function public.create_reservation(uuid, integer, integer, jsonb)
  from public, anon, authenticated;