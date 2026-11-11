-- Protect shared product metadata across both Native and Web clients.
-- RLS scopes updates to the creator/merchant/store owner. The trigger performs
-- the locked single-offer check so direct Web updates receive an explicit error.
-- Existing authenticated grants are column-scoped to product metadata, so the RPC
-- remains SECURITY INVOKER and relies on RLS rather than bypassing it.

create or replace function private.guard_merchant_product_metadata_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  offer_count bigint;
begin
  if new.name is not distinct from old.name
     and new.description is not distinct from old.description
     and new.brand is not distinct from old.brand
     and new.category is not distinct from old.category then
    return new;
  end if;

  if actor_id is null
     or new.created_by is distinct from actor_id
     or public.get_my_account_type() is distinct from 'merchant'::public.account_type
     or not exists (
       select 1
       from public.user_roles ur
       where ur.user_id = actor_id
         and ur.role = 'merchant'::public.app_role
     ) then
    raise exception 'merchant_product_update_forbidden';
  end if;

  if nullif(btrim(new.name), '') is null
     or char_length(btrim(new.name)) > 120
     or char_length(coalesce(new.brand, '')) > 80
     or char_length(coalesce(new.description, '')) > 3000
     or not exists (
       select 1
       from public.categories c
       where c.id = new.category
         and c.is_active = true
     ) then
    raise exception 'invalid_merchant_product_details';
  end if;

  new.name := btrim(new.name);
  new.brand := nullif(btrim(coalesce(new.brand, '')), '');
  new.description := nullif(btrim(coalesce(new.description, '')), '');

  -- Upgrade the UPDATE row lock to FOR UPDATE so concurrent offer inserts
  -- (which take a foreign-key KEY SHARE lock) cannot race the offer-count check.
  perform 1
  from public.products p
  where p.id = old.id
  for update;

  if not found then
    raise exception 'merchant_product_not_found';
  end if;

  select count(*)
    into offer_count
  from public.store_offers so
  where so.product_id = old.id;

  if offer_count <> 1
     or not exists (
       select 1
       from public.store_offers so
       join public.stores s on s.id = so.store_id
       where so.product_id = old.id
         and s.owner_id = actor_id
     ) then
    raise exception 'merchant_product_shared';
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_merchant_product_metadata_update() from public, anon;
grant execute on function private.guard_merchant_product_metadata_update() to authenticated;

drop trigger if exists guard_merchant_product_metadata_update on public.products;
create trigger guard_merchant_product_metadata_update
before update of name, description, brand, category
on public.products
for each row
execute function private.guard_merchant_product_metadata_update();

drop policy if exists "Creators update products" on public.products;
create policy "Creators update single-offer products"
on public.products
for update
to authenticated
using (
  created_by = (select auth.uid())
  and public.get_my_account_type() = 'merchant'::public.account_type
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'merchant'::public.app_role
  )
  and exists (
    select 1
    from public.store_offers so
    join public.stores s on s.id = so.store_id
    where so.product_id = products.id
      and s.owner_id = (select auth.uid())
  )
)
with check (
  created_by = (select auth.uid())
  and public.get_my_account_type() = 'merchant'::public.account_type
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'merchant'::public.app_role
  )
  and exists (
    select 1
    from public.store_offers so
    join public.stores s on s.id = so.store_id
    where so.product_id = products.id
      and s.owner_id = (select auth.uid())
  )
);

create or replace function public.update_merchant_product_details(
  _offer_id uuid,
  _store_id uuid,
  _name text,
  _description text,
  _brand text,
  _category text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  target_product_id uuid;
  offer_count bigint;
begin
  if actor_id is null then
    raise exception 'not_authenticated';
  end if;

  if public.get_my_account_type() is distinct from 'merchant'::public.account_type then
    raise exception 'merchant_account_required';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = actor_id
      and ur.role = 'merchant'::public.app_role
  ) then
    raise exception 'merchant_role_required';
  end if;

  if not exists (
    select 1
    from public.stores s
    where s.id = _store_id
      and s.owner_id = actor_id
  ) then
    raise exception 'merchant_store_not_found';
  end if;

  if _offer_id is null
     or _store_id is null
     or nullif(btrim(_name), '') is null
     or char_length(btrim(_name)) > 120
     or char_length(coalesce(_brand, '')) > 80
     or char_length(coalesce(_description, '')) > 3000
     or _category is null then
    raise exception 'invalid_merchant_product_details';
  end if;

  if not exists (
    select 1
    from public.categories c
    where c.id = _category
      and c.is_active = true
  ) then
    raise exception 'invalid_merchant_product_category';
  end if;

  select p.id
    into target_product_id
  from public.products p
  join public.store_offers so on so.product_id = p.id
  where so.id = _offer_id
    and so.store_id = _store_id
    and p.created_by = actor_id
  for update of p;

  if target_product_id is null then
    raise exception 'merchant_product_not_editable';
  end if;

  select count(*)
    into offer_count
  from public.store_offers so
  where so.product_id = target_product_id;

  if offer_count <> 1 then
    raise exception 'merchant_product_shared';
  end if;

  update public.products p
  set
    name = btrim(_name),
    description = nullif(btrim(coalesce(_description, '')), ''),
    brand = nullif(btrim(coalesce(_brand, '')), ''),
    category = _category
  where p.id = target_product_id
    and p.created_by = actor_id
  returning p.id into target_product_id;

  if target_product_id is null then
    raise exception 'merchant_product_not_updated';
  end if;

  return target_product_id;
end;
$function$;

revoke all on function public.update_merchant_product_details(
  uuid, uuid, text, text, text, text
) from public, anon;

grant execute on function public.update_merchant_product_details(
  uuid, uuid, text, text, text, text
) to authenticated;

comment on function public.update_merchant_product_details(
  uuid, uuid, text, text, text, text
) is 'Updates merchant-created product metadata only when its sole offer belongs to the caller.';
