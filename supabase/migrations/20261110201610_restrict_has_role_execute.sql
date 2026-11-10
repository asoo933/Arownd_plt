-- has_role is an authenticated-user helper used by RLS policies.
-- Do not expose its SECURITY DEFINER entry point to anonymous clients.
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
