-- Trigger-only functions must not be callable as public RPC endpoints.
revoke all on function public.notify_merchant_order_activity() from public, anon, authenticated;
revoke all on function public.notify_order_status() from public, anon, authenticated;
