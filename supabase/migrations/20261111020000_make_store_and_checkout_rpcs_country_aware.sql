-- Make the existing store and checkout RPCs persist authoritative country data.
-- This migration must run after 20261111013000_introduce_country_and_region_foundation.sql.
-- Existing RPC signatures and client payloads remain unchanged.
-- The legacy wilaya_id input intentionally supports only regions mapped to wilayas;
-- additional countries require their own region-aware client/API contract before enablement.

begin;

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
  _subcategories text[] default '{}'::text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_type public.account_type;
  current_country_code text;
  selected_region_id bigint;
  created_store_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

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
    select 1 from public.categories c
    where c.id = _category and c.parent_id is null and c.is_active = true
  ) then raise exception 'invalid_store_category'; end if;

  if exists (
    select 1 from unnest(coalesce(_subcategories, '{}'::text[])) selected(id)
    where not exists (
      select 1 from public.categories c
      where c.id = selected.id and c.parent_id = _category and c.is_active = true
    )
  ) then raise exception 'invalid_store_subcategory'; end if;

  select p.account_type, p.country_code
    into current_type, current_country_code
  from public.profiles p
  where p.user_id = auth.uid()
  for update;

  if not found then raise exception 'profile_not_found'; end if;

  select r.id into selected_region_id
  from public.country_regions r
  join public.countries c on c.code = r.country_code
  where r.country_code = current_country_code
    and r.legacy_wilaya_id = _wilaya_id
    and r.region_type = 'wilaya'
    and r.is_enabled
    and c.is_enabled;

  if selected_region_id is null then
    raise exception 'store_region_not_available_for_account_country';
  end if;

  if exists (select 1 from public.stores s where s.owner_id = auth.uid()) then
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
    owner_id, name, slug, phone, whatsapp, wilaya_id,
    country_code, region_id, commune, address_line, latitude,
    longitude, opening_hours, category, subcategories
  ) values (
    auth.uid(), btrim(_store_name), btrim(_slug),
    nullif(btrim(_phone), ''), nullif(btrim(_whatsapp), ''),
    _wilaya_id, current_country_code, selected_region_id,
    nullif(btrim(_commune), ''), nullif(btrim(_address_line), ''),
    _latitude, _longitude, _opening_hours,
    nullif(btrim(_category), ''), coalesce(_subcategories, '{}'::text[])
  ) returning id into created_store_id;

  return created_store_id;
end;
$function$;

create or replace function public.create_order(
  _items jsonb,
  _delivery_type text,
  _wilaya_id integer,
  _commune text,
  _address_line text,
  _full_name text,
  _phone text,
  _payment_method text,
  _receipt_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  it jsonb;
  o public.store_offers;
  pname text;
  q integer;
  sub integer := 0;
  fee integer;
  oid uuid;
  w public.wilayas;
  selected_country_code text;
  selected_region_id bigint;
  selected_currency_code text;
  offer_store_country_code text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  if _items is null
     or jsonb_typeof(_items) is distinct from 'array'
     or jsonb_array_length(_items) < 1
     or jsonb_array_length(_items) > 30 then
    raise exception 'invalid_items';
  end if;

  if _delivery_type not in ('home', 'desk') then
    raise exception 'invalid_delivery_type';
  end if;
  if _payment_method is distinct from 'cod' then
    raise exception 'invalid_payment_method';
  end if;

  if coalesce(length(trim(_full_name)), 0) < 2
     or length(_full_name) > 120
     or coalesce(length(trim(_phone)), 0) < 8
     or length(_phone) > 30
     or coalesce(length(trim(_commune)), 0) < 2
     or length(_commune) > 100
     or length(coalesce(_address_line, '')) > 300 then
    raise exception 'invalid_order_contact';
  end if;

  if _receipt_url is not null then
    raise exception 'unexpected_receipt';
  end if;

  select * into w
  from public.wilayas
  where id = _wilaya_id;
  if not found then raise exception 'invalid_wilaya'; end if;

  select r.country_code, r.id, c.currency_code
    into selected_country_code, selected_region_id, selected_currency_code
  from public.country_regions r
  join public.countries c on c.code = r.country_code
  where r.legacy_wilaya_id = _wilaya_id
    and r.region_type = 'wilaya'
    and r.is_enabled
    and c.is_enabled;

  if selected_region_id is null then
    raise exception 'checkout_region_not_available';
  end if;

  fee := case
    when _delivery_type = 'home' then w.home_price
    else w.desk_price
  end;

  insert into public.orders (
    user_id, full_name, phone, wilaya_id, country_code, region_id,
    currency_code, commune, address_line, delivery_type, payment_method,
    receipt_url, subtotal, shipping_fee, total, commission_amount
  ) values (
    auth.uid(), trim(_full_name), trim(_phone), _wilaya_id,
    selected_country_code, selected_region_id, selected_currency_code,
    trim(_commune), trim(coalesce(_address_line, '')),
    _delivery_type, _payment_method, null, 0, fee, 0, 0
  ) returning id into oid;

  for it in select value from jsonb_array_elements(_items) loop
    if jsonb_typeof(it) <> 'object' then
      raise exception 'invalid_item';
    end if;

    q := (it->>'quantity')::integer;
    if q is null or q < 1 or q > 20 then
      raise exception 'invalid_quantity';
    end if;

    select * into o
    from public.store_offers
    where id = (it->>'offer_id')::uuid
    for update;

    if not found or not o.is_available or o.stock_quantity < q then
      raise exception 'out_of_stock';
    end if;

    select s.country_code into offer_store_country_code
    from public.stores s
    where s.id = o.store_id;

    if offer_store_country_code is null
       or offer_store_country_code is distinct from selected_country_code then
      raise exception 'order_store_country_mismatch';
    end if;

    select p.name into pname
    from public.products p
    where p.id = o.product_id;

    -- Preserve the existing merchant-managed order-item and stock behavior.
    insert into public.order_items (
      order_id, offer_id, store_id, product_name,
      unit_price, quantity, options
    ) values (
      oid, o.id, o.store_id, pname, o.price, q,
      coalesce(it->'options', '{}'::jsonb)
    );

    update public.store_offers
    set stock_quantity = stock_quantity - q,
        is_available = (stock_quantity - q) > 0
    where id = o.id;

    sub := sub + o.price * q;
  end loop;

  update public.orders
  set subtotal = sub,
      total = sub + fee,
      commission_amount = 0
  where id = oid;

  return oid;
end;
$function$;

-- Keep the existing client contract and idempotency hash byte-for-byte compatible.
-- Country, region and currency are resolved authoritatively by create_order().
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
  _idempotency_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
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
  if _payment_method is distinct from 'cod' then
    raise exception 'invalid_payment_method';
  end if;
  if _receipt_url is not null then
    raise exception 'unexpected_receipt';
  end if;
  if _delivery_type is null or _delivery_type not in ('home','desk') then
    raise exception 'invalid_delivery_type';
  end if;
  if coalesce(length(trim(_address_line)),0) = 0 then
    raise exception 'delivery_address_required';
  end if;

  normalized_hash := md5(jsonb_build_object(
    'items',_items,'delivery_type',_delivery_type,'wilaya_id',_wilaya_id,
    'commune',_commune,'address_line',_address_line,'full_name',_full_name,
    'phone',_phone,'payment_method',_payment_method,'receipt_url',_receipt_url,
    -- Preserve the legacy null carrier key for in-flight retries from older builds.
    'delivery_company_id',null
  )::text);

  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text || ':' || _idempotency_key::text,0)
  );

  select request_hash,order_id
    into previous_hash,previous_order_id
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

  created_order_id := public.create_order(
    _items,_delivery_type,_wilaya_id,_commune,_address_line,
    _full_name,_phone,_payment_method,_receipt_url
  );

  insert into public.checkout_idempotency (
    user_id,idempotency_key,request_hash,order_id
  ) values (
    current_user_id,_idempotency_key,normalized_hash,created_order_id
  );

  return created_order_id;
end;
$function$;

comment on function public.create_my_store(
  text,text,text,text,integer,text,text,double precision,double precision,jsonb,text,text[]
) is
  'Creates a merchant store using the account country and a validated legacy-wilaya region mapping.';

comment on function public.create_order(
  jsonb,text,integer,text,text,text,text,text,text
) is
  'Creates a COD order with country, region and currency resolved from the selected wilaya and validates every store belongs to that market.';

comment on function public.create_order_with_delivery(
  jsonb,text,integer,text,text,text,text,text,text,uuid
) is
  'Idempotent checkout wrapper. Country, region and currency are resolved by create_order without changing the client request hash.';

commit;
