-- User-generated content reporting for Google Play UGC moderation requirements.
-- Reports are private to the reporter; project owners review them in Supabase Dashboard.
begin;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('review', 'product', 'store', 'user')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'sexual_content', 'scam', 'other')),
  details text,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text,
  constraint content_reports_details_length check (details is null or char_length(details) <= 1000),
  constraint content_reports_no_duplicate unique (reporter_id, target_type, target_id)
);

create index if not exists content_reports_pending_created_idx
  on public.content_reports (created_at desc)
  where status = 'pending';

create index if not exists content_reports_reporter_created_idx
  on public.content_reports (reporter_id, created_at desc);

alter table public.content_reports enable row level security;
revoke all on table public.content_reports from anon, authenticated;
grant all on table public.content_reports to service_role;

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

revoke all on function public.submit_content_report(text, uuid, text, text) from public, anon;
grant execute on function public.submit_content_report(text, uuid, text, text) to authenticated;

commit;
