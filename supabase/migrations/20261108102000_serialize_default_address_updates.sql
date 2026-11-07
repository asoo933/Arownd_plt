-- Serialize default-address changes for the same account. The partial unique
-- index remains the final invariant; the advisory lock avoids avoidable races.
create or replace function public.set_my_default_address(_address_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'not_authenticated';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(actor_id::text, 0)
  );

  perform 1
  from public.user_addresses
  where id = _address_id and user_id = actor_id
  for update;

  if not found then
    raise exception 'address_not_found';
  end if;

  update public.user_addresses
  set is_default = false, updated_at = pg_catalog.now()
  where user_id = actor_id and is_default;

  update public.user_addresses
  set is_default = true, updated_at = pg_catalog.now()
  where id = _address_id and user_id = actor_id;
end;
$function$;

revoke all on function public.set_my_default_address(uuid) from public, anon;
grant execute on function public.set_my_default_address(uuid) to authenticated;
