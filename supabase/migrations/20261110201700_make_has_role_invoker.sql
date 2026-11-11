-- RLS policies use has_role only for the current authenticated user.
-- Invoker rights avoid exposing a SECURITY DEFINER role-check RPC.
alter function public.has_role(uuid, public.app_role) security invoker;
