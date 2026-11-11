-- Merchants must mutate their own merchant_orders through the scoped RPC,
-- never arbitrary columns on the shared parent order.
drop policy if exists "Merchant updates order" on public.orders;

-- Authenticated clients may only request the customer cancellation status change.
-- SECURITY DEFINER database workflows retain owner privileges for internal updates.
revoke update on table public.orders from public, anon, authenticated;
grant update (status) on table public.orders to authenticated;

-- Order deletion bypasses cancellation, stock restoration, and audit workflows.
drop policy if exists "Owner deletes order" on public.orders;
revoke delete on table public.orders from public, anon, authenticated;

-- Home-delivery shipments are created only by the validated checkout RPC.
-- Remove both the legacy policy and the newer policy introduced by hardening.
drop policy if exists "العملاء يُدرجون شحنات طلباتهم" on public.shipments;
drop policy if exists "Customers create valid pending shipments" on public.shipments;
revoke insert on table public.shipments from public, anon, authenticated;
-- The previous migration also granted INSERT on individual columns.
revoke insert (
  order_id, company_id, status, pickup_address, delivery_address,
  recipient_name, recipient_phone, fee, notes
) on table public.shipments from public, anon, authenticated;

-- Shipment status history is append-only. The SECURITY DEFINER audit trigger
-- inserts rows; clients cannot edit or erase historical records.
revoke update, delete on table public.shipment_status_logs
  from public, anon, authenticated;

-- Remove the original global read policies for shipment audit and GPS data.
-- The scoped participant policies created by the multi-store migration remain active.
drop policy if exists "سجلات الحالة قابلة للقراءة"
  on public.shipment_status_logs;
drop policy if exists "نقاط التتبع قابلة للقراءة"
  on public.shipment_tracking;
