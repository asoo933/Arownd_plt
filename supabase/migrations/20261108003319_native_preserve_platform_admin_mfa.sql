-- Keep the app_metadata-based admin identity and AAL2 requirement after older migration histories are reconciled.
create or replace function public.is_platform_admin()
returns boolean language sql stable set search_path = ''
as $function$
  select auth.uid() is not null
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', '') = 'admin'
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$function$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated, service_role;
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select auth.uid() is not null and _user_id = auth.uid()
    and case when _role = 'admin'::public.app_role then public.is_platform_admin()
    else exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = _role) end;
$function$;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
