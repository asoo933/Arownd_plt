-- Server-controlled merchant offer pricing and promotion lifecycle.
-- The regular price is preserved in old_price while a promotion is active.
-- Clients cannot write price/old_price directly after this migration.

revoke update on table public.store_offers from authenticated;
grant update (
  stock_quantity,
  options,
  is_merchant_hidden,
  last_confirmed_at
) on table public.store_offers to authenticated;

create or replace function public.update_merchant_product_offer(
  _offer_id uuid,
  _store_id uuid,
  _price integer,
  _stock_quantity integer,
  _options jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  offer_row public.store_offers;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_store_owner(_store_id) then
    raise exception 'forbidden';
  end if;
  if _price is null or _price <= 0 or _price > 2147483647 then
    raise exception 'invalid_price';
  end if;
  if _stock_quantity is null or _stock_quantity < 0 or _stock_quantity > 9999 then
    raise exception 'invalid_stock';
  end if;
  if _options is not null and (
    jsonb_typeof(_options) <> 'object'
    or jsonb_typeof(_options->'sizes') <> 'array'
    or jsonb_typeof(_options->'colors') <> 'array'
  ) then
    raise exception 'invalid_offer_options';
  end if;

  select so.*
    into offer_row
  from public.store_offers so
  where so.id = _offer_id
    and so.store_id = _store_id
  for update;

  if not found then
    raise exception 'merchant_offer_not_found';
  end if;

  -- Do not let the ordinary edit form silently replace the regular price
  -- while the offer is discounted. The merchant must end the promotion first.
  if offer_row.old_price is not null and _price <> offer_row.price then
    raise exception 'active_promotion_must_end';
  end if;

  update public.store_offers
  set price = _price,
      stock_quantity = _stock_quantity,
      options = coalesce(_options, options),
      last_confirmed_at = now()
  where id = _offer_id
    and store_id = _store_id;
end;
$function$;

create or replace function public.start_merchant_offer_promotion(
  _offer_id uuid,
  _store_id uuid,
  _sale_price integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  offer_row public.store_offers;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_store_owner(_store_id) then
    raise exception 'forbidden';
  end if;
  if _sale_price is null or _sale_price <= 0 then
    raise exception 'invalid_promotion_price';
  end if;

  select so.*
    into offer_row
  from public.store_offers so
  where so.id = _offer_id
    and so.store_id = _store_id
  for update;

  if not found then
    raise exception 'merchant_offer_not_found';
  end if;
  if offer_row.old_price is not null then
    raise exception 'promotion_already_active';
  end if;
  if _sale_price >= offer_row.price then
    raise exception 'promotion_price_must_be_lower';
  end if;

  update public.store_offers
  set old_price = offer_row.price,
      price = _sale_price,
      last_confirmed_at = now()
  where id = _offer_id
    and store_id = _store_id;
end;
$function$;

create or replace function public.end_merchant_offer_promotion(
  _offer_id uuid,
  _store_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  offer_row public.store_offers;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_store_owner(_store_id) then
    raise exception 'forbidden';
  end if;

  select so.*
    into offer_row
  from public.store_offers so
  where so.id = _offer_id
    and so.store_id = _store_id
  for update;

  if not found then
    raise exception 'merchant_offer_not_found';
  end if;
  if offer_row.old_price is null or offer_row.old_price <= offer_row.price then
    raise exception 'promotion_not_active';
  end if;

  update public.store_offers
  set price = offer_row.old_price,
      old_price = null,
      last_confirmed_at = now()
  where id = _offer_id
    and store_id = _store_id;
end;
$function$;

revoke all on function public.update_merchant_product_offer(uuid, uuid, integer, integer, jsonb) from public, anon;
revoke all on function public.start_merchant_offer_promotion(uuid, uuid, integer) from public, anon;
revoke all on function public.end_merchant_offer_promotion(uuid, uuid) from public, anon;

grant execute on function public.update_merchant_product_offer(uuid, uuid, integer, integer, jsonb) to authenticated;
grant execute on function public.start_merchant_offer_promotion(uuid, uuid, integer) to authenticated;
grant execute on function public.end_merchant_offer_promotion(uuid, uuid) to authenticated;
