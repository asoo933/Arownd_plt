-- Add authenticated, race-safe request and cancellation RPCs.
-- The original request table migration is already on main; this migration is additive.
begin;

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status in ('pending', 'under_review', 'blocked', 'completed', 'rejected', 'cancelled'));

revoke insert on table public.account_deletion_requests from authenticated;
grant select on table public.account_deletion_requests to authenticated;
grant all on table public.account_deletion_requests to service_role;

create or replace function public.request_account_deletion()
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  _user_id uuid := auth.uid();
  _request_id uuid;
begin
  if _user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(_user_id::text, 0)
  );

  select id into _request_id
  from public.account_deletion_requests
  where user_id = _user_id
    and status in ('pending', 'under_review', 'blocked')
  order by requested_at desc
  limit 1;

  if _request_id is not null then
    return _request_id;
  end if;

  insert into public.account_deletion_requests (user_id)
  values (_user_id)
  returning id into _request_id;

  return _request_id;
end;
$function$;

create or replace function public.cancel_account_deletion_request(_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  _user_id uuid := auth.uid();
begin
  if _user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  update public.account_deletion_requests
  set status = 'cancelled',
      updated_at = pg_catalog.now()
  where id = _request_id
    and user_id = _user_id
    and status in ('pending', 'under_review', 'blocked');

  return found;
end;
$function$;

revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;
revoke all on function public.cancel_account_deletion_request(uuid) from public, anon;
grant execute on function public.cancel_account_deletion_request(uuid) to authenticated;

commit;
