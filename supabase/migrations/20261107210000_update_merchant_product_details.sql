-- Allow a merchant to edit shared product metadata only while the product has one offer.
-- SECURITY INVOKER preserves products RLS; row locking prevents a concurrent offer insert
-- from passing the single-offer check while this update is in progress.
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

  -- The product row lock conflicts with the FK key-share lock used by a concurrent
  -- store_offers insert, making the single-offer check safe against that race.
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
) is 'Updates a merchant-created product only when the caller owns the store and the product has exactly one offer.';
