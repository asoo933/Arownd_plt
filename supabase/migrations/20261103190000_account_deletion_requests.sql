-- Account deletion requests are tracked separately from Auth users so a completed
-- deletion can leave a minimal, non-identifying audit event (user_id becomes NULL).
-- This migration is committed for review; it is NOT applied to production here.

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'blocked', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  retention_note text
);

create index if not exists account_deletion_requests_user_requested_idx
  on public.account_deletion_requests(user_id, requested_at desc);

create unique index if not exists account_deletion_requests_one_open_per_user_idx
  on public.account_deletion_requests(user_id)
  where user_id is not null and status in ('pending', 'under_review', 'blocked');

alter table public.account_deletion_requests enable row level security;

revoke all on public.account_deletion_requests from anon, authenticated;
grant select on public.account_deletion_requests to authenticated;
grant insert (user_id) on public.account_deletion_requests to authenticated;

drop policy if exists "Users can view their own deletion requests"
  on public.account_deletion_requests;
create policy "Users can view their own deletion requests"
  on public.account_deletion_requests
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can submit their own deletion requests"
  on public.account_deletion_requests;
create policy "Users can submit their own deletion requests"
  on public.account_deletion_requests
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and resolved_at is null
    and retention_note is null
  );

create or replace function public.touch_account_deletion_request()
returns trigger
language plpgsql
set search_path = public
as $
begin
  new.updated_at := now();
  if new.status in ('completed', 'rejected') and old.status is distinct from new.status then
    new.resolved_at := coalesce(new.resolved_at, now());
  end if;
  return new;
end;
$;

drop trigger if exists account_deletion_requests_touch_updated_at
  on public.account_deletion_requests;
create trigger account_deletion_requests_touch_updated_at
  before update on public.account_deletion_requests
  for each row execute function public.touch_account_deletion_request();

revoke all on function public.touch_account_deletion_request() from public, anon, authenticated;

comment on table public.account_deletion_requests is
  'Tracks verified account deletion requests. No client-side update/delete; completion is an audited admin operation.';
