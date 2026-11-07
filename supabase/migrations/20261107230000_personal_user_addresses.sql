create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'home' check (label in ('home', 'work', 'other')),
  recipient_name text not null check (char_length(btrim(recipient_name)) between 2 and 120),
  phone text not null check (phone ~ '^(0[567][0-9]{8}|\+213[567][0-9]{8}|00213[567][0-9]{8})$'),
  wilaya_id integer not null references public.wilayas(id),
  commune text not null check (char_length(btrim(commune)) between 2 and 100),
  address_line text not null check (char_length(btrim(address_line)) between 5 and 240),
  additional_info text check (additional_info is null or char_length(additional_info) <= 240),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_addresses_owner_created_idx
  on public.user_addresses (user_id, created_at desc);
create unique index if not exists user_addresses_one_default_per_user_idx
  on public.user_addresses (user_id) where is_default;

alter table public.user_addresses enable row level security;
revoke all on public.user_addresses from public, anon;
grant select, insert, update, delete on public.user_addresses to authenticated;
grant all on public.user_addresses to service_role;

drop policy if exists "Users read own addresses" on public.user_addresses;
create policy "Users read own addresses"
  on public.user_addresses for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users insert own addresses" on public.user_addresses;
create policy "Users insert own addresses"
  on public.user_addresses for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users update own addresses" on public.user_addresses;
create policy "Users update own addresses"
  on public.user_addresses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users delete own addresses" on public.user_addresses;
create policy "Users delete own addresses"
  on public.user_addresses for delete to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.set_my_default_address(_address_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  perform 1
  from public.user_addresses
  where id = _address_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'address_not_found';
  end if;

  update public.user_addresses
  set is_default = false, updated_at = now()
  where user_id = auth.uid() and is_default;

  update public.user_addresses
  set is_default = true, updated_at = now()
  where id = _address_id and user_id = auth.uid();
end;
$function$;

revoke all on function public.set_my_default_address(uuid) from public, anon;
grant execute on function public.set_my_default_address(uuid) to authenticated;
