-- Arownd account identity: account type is separate from authorization roles.
-- Admin remains an independent capability in user_roles.
do $$
begin
  create type public.account_type as enum ('personal', 'merchant', 'delivery_company');
exception
  when duplicate_object then null;
end
$$;

alter table public.profiles
  add column if not exists account_type public.account_type not null default 'personal';

-- Do not silently merge two independent business identities into one account,
-- and do not leave business records without a profile identity.
do $migration$
begin
  if exists (
    select 1
    from public.delivery_companies dc
    join public.user_roles ur
      on ur.user_id = dc.user_id
     and ur.role = 'merchant'::public.app_role
  ) then
    raise exception
      'account_type_conflict: users with both a delivery company and merchant role need manual reconciliation before this migration';
  end if;

  if exists (
    select 1
    from public.delivery_companies dc
    left join public.profiles p on p.user_id = dc.user_id
    where p.user_id is null
  ) then
    raise exception
      'account_type_missing_profile: delivery company owners must have a profile before this migration';
  end if;

  if exists (
    select 1
    from public.user_roles ur
    left join public.profiles p on p.user_id = ur.user_id
    where ur.role = 'merchant'::public.app_role
      and p.user_id is null
  ) then
    raise exception
      'account_type_missing_profile: merchant role owners must have a profile before this migration';
  end if;

  if exists (
    select 1
    from public.stores s
    where s.owner_id is not null
      and not exists (
        select 1
        from public.user_roles ur
        where ur.user_id = s.owner_id
          and ur.role = 'merchant'::public.app_role
      )
  ) then
    raise exception
      'account_type_store_owner_missing_merchant_role: existing store owners need role reconciliation before this migration';
  end if;

  if exists (
    select s.owner_id
    from public.stores s
    where s.owner_id is not null
    group by s.owner_id
    having count(*) > 1
  ) then
    raise exception
      'account_type_multiple_stores: existing multi-store owners need reconciliation before this migration';
  end if;
end
$migration$;

-- The current merchant workspace model supports one store per account.
create unique index if not exists stores_one_per_owner_idx
  on public.stores (owner_id)
  where owner_id is not null;

update public.profiles p
set account_type = case
  when exists (
    select 1 from public.delivery_companies dc where dc.user_id = p.user_id
  ) then 'delivery_company'::public.account_type
  when exists (
    select 1 from public.user_roles ur
    where ur.user_id = p.user_id
      and ur.role = 'merchant'::public.app_role
  ) then 'merchant'::public.account_type
  else 'personal'::public.account_type
end;

-- Public profile projection is restricted to personal accounts only. Converting
-- an account to merchant automatically removes its public personal projection.
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

  if new.is_public is true
     and new.account_type = 'personal'::public.account_type then
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

delete from private.public_personal_profiles projection
using public.profiles p
where projection.user_id = p.user_id
  and p.account_type <> 'personal'::public.account_type;

create or replace function public.set_my_profile_visibility(_is_public boolean)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $function$
declare
  current_type public.account_type;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select p.account_type
    into current_type
  from public.profiles p
  where p.user_id = auth.uid()
  for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  if current_type <> 'personal'::public.account_type then
    raise exception 'personal_profile_only';
  end if;

  update public.profiles
  set is_public = coalesce(_is_public, false)
  where user_id = auth.uid();
end;
$function$;

revoke all on function public.set_my_profile_visibility(boolean) from public, anon;
grant execute on function public.set_my_profile_visibility(boolean) to authenticated;

-- Retain the legacy function definition for rollback compatibility only; client execution
-- is revoked below. The supported merchant path is the atomic create_my_store() RPC.
create or replace function public.become_merchant()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_type public.account_type;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select p.account_type
    into current_type
  from public.profiles p
  where p.user_id = auth.uid()
  for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  if current_type = 'delivery_company'::public.account_type
     or exists (
       select 1 from public.delivery_companies dc where dc.user_id = auth.uid()
     ) then
    raise exception 'account_type_conflict';
  end if;

  update public.profiles
  set account_type = 'merchant'::public.account_type
  where user_id = auth.uid();

  insert into public.user_roles (user_id, role)
  select auth.uid(), 'merchant'::public.app_role
  where not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'merchant'::public.app_role
  );
end;
$$;

-- A delivery-company application sets the account identity, but does not grant
-- operational access: approval remains governed by is_approved and existing RLS.
create or replace function public.set_delivery_account_type_on_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  current_type public.account_type;
begin
  select p.account_type
    into current_type
  from public.profiles p
  where p.user_id = new.user_id
  for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  if current_type = 'merchant'::public.account_type
     or exists (
       select 1 from public.user_roles ur
       where ur.user_id = new.user_id
         and ur.role = 'merchant'::public.app_role
     ) then
    raise exception 'account_type_conflict';
  end if;

  update public.profiles
  set account_type = 'delivery_company'::public.account_type
  where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists set_delivery_account_type_on_registration
  on public.delivery_companies;
create trigger set_delivery_account_type_on_registration
before insert or update of user_id on public.delivery_companies
for each row
execute function public.set_delivery_account_type_on_registration();

revoke all on function public.set_delivery_account_type_on_registration() from public, anon, authenticated;

-- Personal-to-merchant onboarding is one transaction: identity, capability and
-- store creation either all succeed or all roll back together.
create or replace function public.create_my_store(
  _store_name text,
  _slug text,
  _phone text,
  _whatsapp text,
  _wilaya_id integer,
  _commune text,
  _address_line text,
  _latitude double precision,
  _longitude double precision,
  _opening_hours jsonb,
  _category text default null,
  _subcategories text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_type public.account_type;
  created_store_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if nullif(btrim(_store_name), '') is null
     or nullif(btrim(_slug), '') is null
     or _wilaya_id is null
     or _opening_hours is null
     or jsonb_typeof(_opening_hours) <> 'object'
     or nullif(_opening_hours ->> 'open', '') is null
     or nullif(_opening_hours ->> 'close', '') is null then
    raise exception 'invalid_store_input';
  end if;

  if _category is not null and not exists (
    select 1
    from public.categories c
    where c.id = _category
      and c.parent_id is null
      and c.is_active = true
  ) then
    raise exception 'invalid_store_category';
  end if;

  if exists (
    select 1
    from unnest(coalesce(_subcategories, '{}'::text[])) selected(id)
    where not exists (
      select 1
      from public.categories c
      where c.id = selected.id
        and c.parent_id = _category
        and c.is_active = true
    )
  ) then
    raise exception 'invalid_store_subcategory';
  end if;

  select p.account_type
    into current_type
  from public.profiles p
  where p.user_id = auth.uid()
  for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  if current_type = 'delivery_company'::public.account_type
     or exists (
       select 1 from public.delivery_companies dc
       where dc.user_id = auth.uid()
     ) then
    raise exception 'account_type_conflict';
  end if;

  if exists (
    select 1 from public.stores s
    where s.owner_id = auth.uid()
  ) then
    raise exception 'store_already_exists';
  end if;

  update public.profiles
  set account_type = 'merchant'::public.account_type
  where user_id = auth.uid();

  insert into public.user_roles (user_id, role)
  select auth.uid(), 'merchant'::public.app_role
  where not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'merchant'::public.app_role
  );

  insert into public.stores (
    owner_id, name, slug, phone, whatsapp, wilaya_id, commune,
    address_line, latitude, longitude, opening_hours, category, subcategories
  )
  values (
    auth.uid(), btrim(_store_name), btrim(_slug), nullif(btrim(_phone), ''),
    nullif(btrim(_whatsapp), ''), _wilaya_id, nullif(btrim(_commune), ''),
    nullif(btrim(_address_line), ''), _latitude, _longitude, _opening_hours,
    nullif(btrim(_category), ''), coalesce(_subcategories, '{}'::text[])
  )
  returning id into created_store_id;

  return created_store_id;
end;
$function$;

revoke all on function public.create_my_store(
  text, text, text, text, integer, text, text, double precision,
  double precision, jsonb, text, text[]
) from public, anon;
grant execute on function public.create_my_store(
  text, text, text, text, integer, text, text, double precision,
  double precision, jsonb, text, text[]
) to authenticated;

revoke all on function public.become_merchant() from public, anon, authenticated;

-- Read only the signed-in user's account identity; this is not an authorization check.
create or replace function public.get_my_account_type()
returns public.account_type
language sql
stable
security invoker
set search_path = ''
as $$
  select p.account_type
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$$;

revoke all on function public.get_my_account_type() from public, anon;
grant execute on function public.get_my_account_type() to authenticated;
