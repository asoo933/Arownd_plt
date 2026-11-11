begin;

create or replace function public.merchant_submit_order_quote(
  _merchant_order_id uuid,
  _shipping_fee integer
)
returns public.merchant_orders
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  mo public.merchant_orders;
  parent public.orders;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if _shipping_fee is null or _shipping_fee < 0 or _shipping_fee > 1000000 then
    raise exception 'invalid_shipping_fee';
  end if;

  select o.* into parent
  from public.orders o
  join public.merchant_orders x on x.order_id = o.id
  where x.id = _merchant_order_id
  for update of o;
  if not found then raise exception 'merchant_order_not_found'; end if;

  select * into mo
  from public.merchant_orders
  where id = _merchant_order_id
  for update;

  if not public.is_store_owner(mo.store_id)
     and not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'not_authorized';
  end if;
  if parent.status = 'cancelled' or mo.status <> 'pending' then
    raise exception 'quote_not_available';
  end if;
  if parent.delivery_type = 'desk' and _shipping_fee <> 0 then
    raise exception 'pickup_shipping_must_be_free';
  end if;

  update public.merchant_orders
  set shipping_fee = _shipping_fee,
      status = 'quoted',
      quoted_at = now(),
      updated_at = now()
  where id = _merchant_order_id
  returning * into mo;

  perform public.refresh_parent_order_totals(mo.order_id);

  insert into public.notifications (user_id, type, title, body, data)
  values (
    mo.customer_id,
    'order',
    'عرض المتجر جاهز للموافقة',
    'قيمة المنتجات: ' || mo.subtotal::text || ' ' || parent.currency_code ||
      '، التوصيل: ' || mo.shipping_fee::text || ' ' || parent.currency_code ||
      '، الإجمالي: ' || (mo.subtotal + mo.shipping_fee)::text || ' ' ||
      parent.currency_code || '. راجع العرض ووافق أو ارفض هذا الطلب.',
    jsonb_build_object(
      'order_id', mo.order_id,
      'merchant_order_id', mo.id,
      'subtotal', mo.subtotal,
      'shipping_fee', mo.shipping_fee,
      'total', mo.subtotal + mo.shipping_fee,
      'currency_code', parent.currency_code,
      'url', '/orders/' || mo.order_id::text
    )
  );

  return mo;
end;
$function$;

create or replace function public.create_checkout_order_for_account(
  _items jsonb,
  _delivery_type text,
  _region_id bigint,
  _secondary_region_id bigint,
  _commune text,
  _address_line text,
  _full_name text,
  _phone text,
  _payment_method text,
  _receipt_url text,
  _idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
  account_country_code text;
  account_currency_code text;
  it jsonb;
  offer_row public.store_offers;
  product_name text;
  quantity integer;
  created_order_id uuid;
  normalized_hash text;
  previous_hash text;
  previous_order_id uuid;
begin
  if current_user_id is null then raise exception 'not_authenticated'; end if;
  if _idempotency_key is null then raise exception 'idempotency_key_required'; end if;
  if _payment_method is distinct from 'cod' then raise exception 'invalid_payment_method'; end if;
  if _receipt_url is not null then raise exception 'unexpected_receipt'; end if;
  if _delivery_type is null or _delivery_type not in ('home', 'desk') then raise exception 'invalid_delivery_type'; end if;
  if _items is null or jsonb_typeof(_items) is distinct from 'array'
     or jsonb_array_length(_items) < 1 or jsonb_array_length(_items) > 30 then
    raise exception 'invalid_items';
  end if;
  if _region_id is null
     or nullif(btrim(_commune), '') is null
     or length(_commune) > 100
     or nullif(btrim(_address_line), '') is null
     or length(_address_line) > 300
     or length(btrim(_full_name)) < 2
     or length(_full_name) > 120
     or _phone is null or length(_phone) > 30 then
    raise exception 'invalid_order_contact';
  end if;

  select p.country_code, c.currency_code
    into account_country_code, account_currency_code
  from public.profiles p
  join public.countries c on c.code = p.country_code
  where p.user_id = current_user_id;
  if not found then raise exception 'profile_not_found'; end if;

  normalized_hash := md5(jsonb_build_object(
    'items', _items,
    'delivery_type', _delivery_type,
    'country_code', account_country_code,
    'region_id', _region_id,
    'secondary_region_id', _secondary_region_id,
    'commune', _commune,
    'address_line', _address_line,
    'full_name', _full_name,
    'phone', _phone,
    'payment_method', _payment_method,
    'receipt_url', _receipt_url
  )::text);

  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text || ':' || _idempotency_key::text, 0)
  );

  select ci.request_hash, ci.order_id
    into previous_hash, previous_order_id
  from public.checkout_idempotency ci
  where ci.user_id = current_user_id
    and ci.idempotency_key = _idempotency_key;

  if found then
    if previous_hash <> normalized_hash then
      raise exception 'idempotency_key_reused_with_different_request';
    end if;
    if previous_order_id is null then raise exception 'idempotent_order_no_longer_available'; end if;
    return previous_order_id;
  end if;

  insert into public.orders (
    user_id, full_name, phone, wilaya_id, country_code, region_id,
    secondary_region_id, daira_region_id, currency_code, commune,
    address_line, delivery_type, delivery_method, payment_method, receipt_url,
    subtotal, shipping_fee, total, commission_amount
  ) values (
    current_user_id, btrim(_full_name), btrim(_phone), null,
    account_country_code, _region_id, _secondary_region_id, null,
    account_currency_code, btrim(_commune), btrim(_address_line),
    _delivery_type,
    case when _delivery_type = 'home' then 'delivery' else 'store_pickup' end,
    'cod', null, 0, 0, 0, 0
  ) returning id into created_order_id;

  for it in select value from jsonb_array_elements(_items) loop
    if jsonb_typeof(it) <> 'object' then raise exception 'invalid_item'; end if;

    begin
      quantity := (it ->> 'quantity')::integer;
    exception when others then
      raise exception 'invalid_quantity';
    end;
    if quantity is null or quantity < 1 or quantity > 20 then raise exception 'invalid_quantity'; end if;
    if it ->> 'offer_id' is null then raise exception 'invalid_item'; end if;

    select * into offer_row
    from public.store_offers
    where id = (it ->> 'offer_id')::uuid
    for update;
    if not found or not offer_row.is_available or offer_row.stock_quantity < quantity then
      raise exception 'out_of_stock';
    end if;

    if not exists (
      select 1 from public.stores s
      where s.id = offer_row.store_id
        and s.country_code = account_country_code
    ) then
      raise exception 'order_store_country_mismatch';
    end if;

    select p.name into product_name
    from public.products p where p.id = offer_row.product_id;

    insert into public.order_items (
      order_id, offer_id, store_id, product_name, unit_price, quantity, options
    ) values (
      created_order_id, offer_row.id, offer_row.store_id, product_name,
      offer_row.price, quantity, coalesce(it -> 'options', '{}'::jsonb)
    );

    update public.store_offers
    set stock_quantity = stock_quantity - quantity,
        is_available = (stock_quantity - quantity) > 0
    where id = offer_row.id;
  end loop;

  perform public.refresh_parent_order_totals(created_order_id);

  insert into public.checkout_idempotency (
    user_id, idempotency_key, request_hash, order_id
  ) values (
    current_user_id, _idempotency_key, normalized_hash, created_order_id
  );

  return created_order_id;
end;
$function$;

commit;