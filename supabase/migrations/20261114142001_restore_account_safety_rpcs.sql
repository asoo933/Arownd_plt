-- Restore the account-deletion and user-content-report RPCs removed by
-- 20261110215749_prune_unreferenced_app_rpcs.sql.
-- This migration only restores callable functions; it does not delete accounts
-- or change live data. Account deletion requests still require verified review
-- and fulfillment through the established operations process.

begin;

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

create or replace function public.submit_content_report(
  _target_type text,
  _target_id uuid,
  _reason text,
  _details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  _report_id uuid;
  _reporter_id uuid := auth.uid();
  _clean_details text := nullif(pg_catalog.btrim(_details), '');
begin
  if _reporter_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if _target_type not in ('review', 'product', 'store', 'user') then
    raise exception 'invalid_report_target' using errcode = '22023';
  end if;

  if _reason not in ('spam', 'harassment', 'hate', 'sexual_content', 'scam', 'other') then
    raise exception 'invalid_report_reason' using errcode = '22023';
  end if;

  if _clean_details is not null and pg_catalog.char_length(_clean_details) > 1000 then
    raise exception 'report_details_too_long' using errcode = '22023';
  end if;

  if _target_type = 'user' and _target_id = _reporter_id then
    raise exception 'cannot_report_self' using errcode = '22023';
  end if;

  if not (
    (_target_type = 'review' and exists (
      select 1 from public.reviews r where r.id = _target_id
    ))
    or (_target_type = 'product' and exists (
      select 1 from public.products p where p.id = _target_id
    ))
    or (_target_type = 'store' and exists (
      select 1 from public.stores s where s.id = _target_id
    ))
    or (_target_type = 'user' and exists (
      select 1 from public.profiles p where p.user_id = _target_id
    ))
  ) then
    raise exception 'report_target_not_found' using errcode = '22023';
  end if;

  if (
    select count(*)
    from public.content_reports cr
    where cr.reporter_id = _reporter_id
      and cr.created_at > pg_catalog.now() - interval '24 hours'
  ) >= 10 then
    raise exception 'report_rate_limit_exceeded' using errcode = 'P0001';
  end if;

  insert into public.content_reports (reporter_id, target_type, target_id, reason, details)
  values (_reporter_id, _target_type, _target_id, _reason, _clean_details)
  returning id into _report_id;

  return _report_id;
exception
  when unique_violation then
    raise exception 'already_reported' using errcode = '23505';
end;
$function$;

revoke all on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

revoke all on function public.cancel_account_deletion_request(uuid) from public, anon;
grant execute on function public.cancel_account_deletion_request(uuid) to authenticated;

revoke all on function public.submit_content_report(text, uuid, text, text) from public, anon;
grant execute on function public.submit_content_report(text, uuid, text, text) to authenticated;

commit;