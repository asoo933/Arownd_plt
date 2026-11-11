-- Shipment history is append-only through the SECURITY DEFINER audit trigger.
-- Clients must not be able to forge status-history rows directly.
drop policy if exists "شركات التوصيل تُدرج سجلات الحالة"
  on public.shipment_status_logs;

revoke insert on table public.shipment_status_logs
  from public, anon, authenticated;
