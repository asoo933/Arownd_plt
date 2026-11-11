-- Keep customer history in the database while allowing per-user hiding in the UI.
create table if not exists public.user_activity_archive (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('order', 'reservation')),
  activity_id uuid not null,
  archived_at timestamptz not null default now(),
  primary key (user_id, activity_type, activity_id)
);

alter table public.user_activity_archive enable row level security;
revoke all on public.user_activity_archive from anon, authenticated;
grant select on public.user_activity_archive to authenticated;

drop policy if exists "Users read their own activity archive" on public.user_activity_archive;
create policy "Users read their own activity archive"
  on public.user_activity_archive
  for select to authenticated
  using (user_id = auth.uid());

create or replace function public.archive_my_activity(
  _activity_type text,
  _activity_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  _status text;
  _expires_at timestamptz;
  _owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if _activity_type = 'order' then
    select status, user_id
      into _status, _owner_id
    from public.orders
    where id = _activity_id;

    if not found or _owner_id <> auth.uid() then
      raise exception 'activity_not_found';
    end if;

    if _status not in ('delivered', 'cancelled') then
      raise exception 'active_activity_cannot_be_archived';
    end if;
  elsif _activity_type = 'reservation' then
    select status, expires_at, user_id
      into _status, _expires_at, _owner_id
    from public.reservations
    where id = _activity_id;

    if not found or _owner_id <> auth.uid() then
      raise exception 'activity_not_found';
    end if;

    if not (
      _status in ('collected', 'cancelled', 'expired')
      or (_status = 'pending' and _expires_at <= now())
    ) then
      raise exception 'active_activity_cannot_be_archived';
    end if;
  else
    raise exception 'invalid_activity_type';
  end if;

  insert into public.user_activity_archive (user_id, activity_type, activity_id)
  values (auth.uid(), _activity_type, _activity_id)
  on conflict (user_id, activity_type, activity_id) do nothing;
end;
$function$;

revoke all on function public.archive_my_activity(text, uuid) from public, anon;
grant execute on function public.archive_my_activity(text, uuid) to authenticated;
