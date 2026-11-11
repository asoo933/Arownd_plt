-- Public catalog RPCs only read tables already exposed through public SELECT policies.
-- Run them as the caller so table RLS remains in force.
ALTER FUNCTION public.category_stats() SECURITY INVOKER;
ALTER FUNCTION public.get_most_viewed_products(integer, integer) SECURITY INVOKER;

-- This function is invoked by existing table triggers, not by client RPC calls.
REVOKE EXECUTE ON FUNCTION public.notify_created_activity() FROM PUBLIC, anon, authenticated;
