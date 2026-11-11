-- Enforce the immutable account country as the only catalog market.
-- This migration follows the country foundation and country-aware RPC migrations.
-- It does not run automatically against the live Supabase project.

begin;

-- Account country is assigned at signup from validated Auth metadata.
-- Existing signup clients that do not send country_code remain on the DZ default.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  requested_country_code text;
begin
  requested_country_code := upper(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'country_code'), ''),
      'DZ'
    )
  );

  if not exists (
    select 1 from public.countries c
    where c.code = requested_country_code and c.is_enabled = true
  ) then
    raise exception 'country_not_available';
  end if;

  insert into public.profiles (user_id, full_name, country_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    requested_country_code
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict do nothing;

  return new;
end;
$function$;

grant select (country_code) on public.profiles to authenticated;
revoke update (country_code) on public.profiles from public, anon, authenticated;

-- Protect immutable account/market identity and validate records on creation.
create or replace function public.enforce_account_country_consistency()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  account_country_code text;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_table_name = 'profiles' then
    if tg_op = 'UPDATE' and old.country_code is distinct from new.country_code then
      raise exception 'account_country_is_immutable';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.country_code is distinct from new.country_code then
    raise exception 'record_country_is_immutable';
  end if;

  if tg_table_name = 'stores' then
    select p.country_code into account_country_code
    from public.profiles p where p.user_id = new.owner_id;
  elsif tg_table_name = 'orders' then
    select p.country_code into account_country_code
    from public.profiles p where p.user_id = new.user_id;
  elsif tg_table_name = 'user_addresses' then
    select p.country_code into account_country_code
    from public.profiles p where p.user_id = new.user_id;
  else
    raise exception 'unsupported_country_table';
  end if;

  if account_country_code is null
     or new.country_code is distinct from account_country_code then
    raise exception 'record_country_must_match_account_country';
  end if;

  return new;
end;
$function$;

drop trigger if exists profiles_country_immutable on public.profiles;
create trigger profiles_country_immutable
before update of country_code on public.profiles
for each row execute function public.enforce_account_country_consistency();

drop trigger if exists stores_account_country_guard on public.stores;
create trigger stores_account_country_guard
before insert or update of country_code, owner_id on public.stores
for each row execute function public.enforce_account_country_consistency();

drop trigger if exists orders_account_country_guard on public.orders;
create trigger orders_account_country_guard
before insert or update of country_code, user_id on public.orders
for each row execute function public.enforce_account_country_consistency();

drop trigger if exists user_addresses_account_country_guard on public.user_addresses;
create trigger user_addresses_account_country_guard
before insert or update of country_code, user_id on public.user_addresses
for each row execute function public.enforce_account_country_consistency();

revoke all on function public.enforce_account_country_consistency()
from public, anon, authenticated;

-- Replace global catalog reads with account-country-scoped reads.
drop policy if exists "Stores public read" on public.stores;
create policy "Stores account country read"
on public.stores for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.country_code = stores.country_code
  )
);

drop policy if exists "Offers public read" on public.store_offers;
create policy "Offers account country read"
on public.store_offers for select to authenticated
using (
  exists (
    select 1
    from public.stores s
    join public.profiles p
      on p.user_id = (select auth.uid())
     and p.country_code = s.country_code
    where s.id = store_offers.store_id
  )
);

drop policy if exists "Products public read" on public.products;
create policy "Products account country read"
on public.products for select to authenticated
using (
  exists (
    select 1
    from public.store_offers so
    join public.stores s on s.id = so.store_id
    join public.profiles p
      on p.user_id = (select auth.uid())
     and p.country_code = s.country_code
    where so.product_id = products.id
  )
);

drop policy if exists "Images public read" on public.product_images;
create policy "Images account country read"
on public.product_images for select to authenticated
using (
  exists (
    select 1
    from public.store_offers so
    join public.stores s on s.id = so.store_id
    join public.profiles p
      on p.user_id = (select auth.uid())
     and p.country_code = s.country_code
    where so.id = product_images.offer_id
  )
);

-- Approved reviews are market-scoped; users retain access to their own reviews.
drop policy if exists "Reviews public and own read" on public.reviews;
create policy "Reviews account country and own read"
on public.reviews for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    status = 'approved'::public.review_status
    and (
      (
        target_type = 'store'::public.review_target_type
        and exists (
          select 1
          from public.stores s
          join public.profiles p
            on p.user_id = (select auth.uid())
           and p.country_code = s.country_code
          where s.id = reviews.target_id
        )
      )
      or (
        target_type = 'product'::public.review_target_type
        and exists (
          select 1
          from public.store_offers so
          join public.stores s on s.id = so.store_id
          join public.profiles p
            on p.user_id = (select auth.uid())
           and p.country_code = s.country_code
          where so.product_id = reviews.target_id
        )
      )
    )
  )
);

-- Saved addresses must remain in the immutable account market.
drop policy if exists "Users insert own addresses" on public.user_addresses;
create policy "Users insert own addresses in account country"
on public.user_addresses for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.country_code = user_addresses.country_code
  )
);

drop policy if exists "Users update own addresses" on public.user_addresses;
create policy "Users update own addresses in account country"
on public.user_addresses for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.country_code = user_addresses.country_code
  )
);

comment on column public.profiles.country_code is
'Immutable account market selected during registration. Catalog visibility is enforced by RLS using this value.';

commit;
