create table if not exists public.push_device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_device_tokens_user_id_idx
  on public.push_device_tokens(user_id);

alter table public.push_device_tokens enable row level security;

drop policy if exists "Users delete own push devices" on public.push_device_tokens;
create policy "Users delete own push devices"
  on public.push_device_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.register_my_push_device(_token text, _platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _user_id uuid := auth.uid();
begin
  if _user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if _token is null or length(_token) < 20 or length(_token) > 4096 then
    raise exception 'Invalid push token' using errcode = '22023';
  end if;
  if _platform not in ('android', 'ios') then
    raise exception 'Unsupported platform' using errcode = '22023';
  end if;

  insert into public.push_device_tokens(user_id, token, platform, last_seen_at, updated_at)
  values (_user_id, _token, _platform, now(), now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        last_seen_at = now(),
        updated_at = now();
end;
$$;

create or replace function public.unregister_my_push_devices()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _user_id uuid := auth.uid();
begin
  if _user_id is null then
    return;
  end if;
  delete from public.push_device_tokens where user_id = _user_id;
end;
$$;

revoke all on function public.register_my_push_device(text, text) from public, anon;
revoke all on function public.unregister_my_push_devices() from public, anon;
grant execute on function public.register_my_push_device(text, text) to authenticated;
grant execute on function public.unregister_my_push_devices() to authenticated;

revoke all on public.push_device_tokens from anon, authenticated;
grant delete on public.push_device_tokens to authenticated;