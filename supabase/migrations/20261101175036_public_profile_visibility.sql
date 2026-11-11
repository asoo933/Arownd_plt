-- Public personal profile preview. Public exposure is opt-in and limited to safe fields.
alter table public.profiles
  add column if not exists is_public boolean not null default false;

-- Preserve the profile table's strict column allowlist while allowing owners to
-- change only their own public/private preference under the existing RLS policy.

-- Keep the public projection in an unexposed schema. The public view is
-- SECURITY INVOKER, so its SELECT is still governed by this table's RLS policy.
create schema if not exists private;

create table if not exists private.public_personal_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  wilaya_id integer,
  commune text,
  updated_at timestamptz not null default now()
);

alter table private.public_personal_profiles enable row level security;
drop policy if exists "Public can read opted-in personal profiles"
  on private.public_personal_profiles;
create policy "Public can read opted-in personal profiles"
  on private.public_personal_profiles
  for select to anon, authenticated
  using (true);

revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
revoke all on private.public_personal_profiles from public;
grant select on private.public_personal_profiles to anon, authenticated;

create or replace function private.sync_public_personal_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    delete from private.public_personal_profiles
    where user_id = old.user_id;
    return old;
  end if;

  if new.is_public is true then
    insert into private.public_personal_profiles (
      user_id, full_name, avatar_url, wilaya_id, commune, updated_at
    )
    values (
      new.user_id, new.full_name, new.avatar_url, new.wilaya_id, new.commune, now()
    )
    on conflict (user_id) do update
    set full_name = excluded.full_name,
        avatar_url = excluded.avatar_url,
        wilaya_id = excluded.wilaya_id,
        commune = excluded.commune,
        updated_at = now();
  else
    delete from private.public_personal_profiles
    where user_id = new.user_id;
  end if;

  return new;
end;
$function$;

revoke all on function private.sync_public_personal_profile()
  from public, anon, authenticated;

drop trigger if exists sync_public_personal_profile on public.profiles;
create trigger sync_public_personal_profile
after insert or update or delete on public.profiles
for each row
execute function private.sync_public_personal_profile();

-- Backfill profiles that were explicitly made public before this migration.
insert into private.public_personal_profiles (
  user_id, full_name, avatar_url, wilaya_id, commune, updated_at
)
select user_id, full_name, avatar_url, wilaya_id, commune, now()
from public.profiles
where is_public is true
on conflict (user_id) do update
set full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    wilaya_id = excluded.wilaya_id,
    commune = excluded.commune,
    updated_at = now();

create or replace view public.public_personal_profiles
with (security_barrier = true, security_invoker = true)
as
select user_id, full_name, avatar_url, wilaya_id, commune
from private.public_personal_profiles;

revoke all on public.public_personal_profiles from public;
grant select on public.public_personal_profiles to anon, authenticated;

-- Keep the visibility toggle owner-scoped and separate from profile field updates.
create or replace function public.set_my_profile_visibility(_is_public boolean)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $function$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
  set is_public = coalesce(_is_public, false)
  where user_id = auth.uid();

  if not found then
    raise exception 'profile_not_found';
  end if;
end;
$function$;

revoke all on function public.set_my_profile_visibility(boolean) from public, anon;
grant execute on function public.set_my_profile_visibility(boolean) to authenticated;
