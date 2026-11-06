-- All shipment status transitions must pass through the ownership-checked RPC.
-- SECURITY DEFINER workflows (customer cancellation and merchant/order orchestration)
-- continue to update shipments internally and remain covered by the audit trigger.
drop policy if exists "Delivery companies update own shipment status"
  on public.shipments;

-- The older hardening migration granted UPDATE(status) at column level.
-- Revoking table-level UPDATE alone does not remove that separate grant.
revoke update on table public.shipments
  from public, anon, authenticated;
revoke update (status) on table public.shipments
  from public, anon, authenticated;
