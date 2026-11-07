-- Align the idempotent checkout RPC with merchant-managed delivery.
-- Both home and desk checkout create the parent order and merchant suborders
-- through create_order() in this transaction. Merchants arrange fulfillment
-- after receiving their own suborders; checkout must not require a carrier.
create or replace function public.create_order_with_delivery(
  _items jsonb,
  _delivery_type text,
  _wilaya_id integer,
  _commune text,
  _address_line text,
  _full_name text,
  _phone text,
  _payment_method text,
  _receipt_url text default null,
  _delivery_company_id uuid default null,
  _idempotency_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $function$
declare
  current_user_id uuid := auth.uid();
  normalized_hash text;
  previous_hash text;
  previous_order_id uuid;
  created_order_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if _idempotency_key is null then
    raise exception 'idempotency_key_required';
  end if;

  if _delivery_type not in ('home', 'desk') then
    raise exception 'invalid_delivery_type';
  end if;

  -- Home delivery must include a usable address. Desk pickup only needs
  -- the buyer's wilaya/commune, as validated by create_order().
  if _delivery_type = 'home'
     and coalesce(length(trim(_address_line)), 0) = 0 then
    raise exception 'delivery_address_required';
  end if;

  -- Carrier assignment is no longer part of checkout. Delivery is managed
  -- by each merchant after the merchant suborder has been created.
  if _delivery_company_id is not null then
    raise exception 'delivery_company_not_supported_at_checkout';
  end if;

  normalized_hash := md5(jsonb_build_object(
    'items', _items,
    'delivery_type', _delivery_type,
    'wilaya_id', _wilaya_id,
    'commune', _commune,
    'address_line', _address_line,
    'full_name', _full_name,
    'phone', _phone,
    'payment_method', _payment_method,
    'receipt_url', _receipt_url,
    'delivery_company_id', _delivery_company_id
  )::text);

  -- Serialize requests for the same user/key. The lock and idempotency row
  -- are transaction-scoped, so a failed order leaves no consumed key.
  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text || ':' || _idempotency_key::text, 0)
  );

  select request_hash, order_id
    into previous_hash, previous_order_id
  from public.checkout_idempotency
  where user_id = current_user_id
    and idempotency_key = _idempotency_key;

  if found then
    if previous_hash <> normalized_hash then
      raise exception 'idempotency_key_reused_with_different_request';
    end if;
    if previous_order_id is null then
      raise exception 'idempotent_order_no_longer_available';
    end if;
    return previous_order_id;
  end if;

  -- create_order() validates the buyer/payment data, locks the offers,
  -- checks current stock/prices, reserves stock and creates order items.
  -- Its triggers create merchant suborders. Any error rolls back all writes.
  created_order_id := public.create_order(
    _items,
    _delivery_type,
    _wilaya_id,
    _commune,
    _address_line,
    _full_name,
    _phone,
    _payment_method,
    _receipt_url
  );

  insert into public.checkout_idempotency (
    user_id, idempotency_key, request_hash, order_id
  ) values (
    current_user_id, _idempotency_key, normalized_hash, created_order_id
  );

  return created_order_id;
end;
$function$;

revoke all on function public.create_order_with_delivery(
  jsonb, text, integer, text, text, text, text, text, text, uuid, uuid
) from public, anon;
grant execute on function public.create_order_with_delivery(
  jsonb, text, integer, text, text, text, text, text, text, uuid, uuid
) to authenticated;
