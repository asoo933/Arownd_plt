-- Generic country region persistence and account-scoped store/checkout RPCs.
-- This migration is intentionally additive: legacy wilaya/daira columns and RPCs
-- remain available for old clients and historical Algeria records.
-- It does NOT enable any country.

begin;

-- Generic administrative level references. Existing DZ values are retained.
alter table public.profiles
  add column if not exists secondary_region_id bigint;
alter table public.stores
  add column if not exists secondary_region_id bigint;
alter table public.user_addresses
  add column if not exists secondary_region_id bigint;
alter table public.orders
  add column if not exists secondary_region_id bigint;

update public.profiles
set secondary_region_id = daira_region_id
where secondary_region_id is null and daira_region_id is not null;
update public.user_addresses
set secondary_region_id = daira_region_id
where secondary_region_id is null and daira_region_id is not null;
update public.orders
set secondary_region_id = daira_region_id
where secondary_region_id is null and daira_region_id is not null;

-- Legacy IDs remain nullable-compatible columns, not generic location keys.
alter table public.stores alter column wilaya_id drop not null;
alter table public.user_addresses alter column wilaya_id drop not null;
alter table public.orders alter column wilaya_id drop not null;

do $constraints$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_country_secondary_region_fkey') then
    alter table public.profiles add constraint profiles_country_secondary_region_fkey
      foreign key (country_code, secondary_region_id)
      references public.country_regions(country_code, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stores_country_secondary_region_fkey') then
    alter table public.stores add constraint stores_country_secondary_region_fkey
      foreign key (country_code, secondary_region_id)
      references public.country_regions(country_code, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_addresses_country_secondary_region_fkey') then
    alter table public.user_addresses add constraint user_addresses_country_secondary_region_fkey
      foreign key (country_code, secondary_region_id)
      references public.country_regions(country_code, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_country_secondary_region_fkey') then
    alter table public.orders add constraint orders_country_secondary_region_fkey
      foreign key (country_code, secondary_region_id)
      references public.country_regions(country_code, id) on delete restrict;
  end if;
end
$constraints$;

create index if not exists profiles_country_secondary_region_idx
  on public.profiles(country_code, secondary_region_id);
create index if not exists stores_country_secondary_region_idx
  on public.stores(country_code, secondary_region_id);
create index if not exists user_addresses_country_secondary_region_idx
  on public.user_addresses(country_code, secondary_region_id);
create index if not exists orders_country_secondary_region_idx
  on public.orders(country_code, secondary_region_id);

-- Phone numbers are stored in canonical international form by the mobile app.
-- The trigger below validates the country calling code for new/changed records.
alter table public.user_addresses
  drop constraint if exists user_addresses_phone_check;

-- Reuse the existing trigger attachments so their ordering and dependencies
-- remain unchanged while replacing the DZ-only validation behavior.
create or replace function public.enforce_daira_region_selection()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  selected_country_enabled boolean;
  selected_calling_code text;
  primary_level public.country_region_levels;
  secondary_level public.country_region_levels;
  primary_region public.country_regions;
  secondary_region public.country_regions;
  primary_legacy_wilaya integer;
  row_user_id uuid;
  phone_changed boolean := false;
begin
  -- Status, quote, and other unrelated updates to historical records must keep
  -- working even when their market is currently disabled.
  if tg_op = 'UPDATE'
     and old.country_code is not distinct from new.country_code
     and old.region_id is not distinct from new.region_id
     and old.secondary_region_id is not distinct from new.secondary_region_id
     and old.wilaya_id is not distinct from new.wilaya_id then
    if tg_table_name = 'profiles' then
      phone_changed := old.phone is distinct from new.phone;
    elsif tg_table_name in ('stores','orders','user_addresses') then
      phone_changed := old.phone is distinct from new.phone;
    end if;
    if not phone_changed then return new; end if;
  end if;

  if tg_table_name = 'profiles' then
    row_user_id := new.user_id;
  elsif tg_table_name = 'stores' then
    row_user_id := new.owner_id;
  else
    row_user_id := new.user_id;
  end if;

  select c.is_enabled, c.calling_code
    into selected_country_enabled, selected_calling_code
  from public.countries c
  where c.code = new.country_code;

  if not found or selected_country_enabled is distinct from true then
    raise exception 'country_disabled';
  end if;

  -- Profiles may exist before a delivery location is supplied.
  if tg_table_name = 'profiles' and new.region_id is null then
    if new.secondary_region_id is not null then
      raise exception 'secondary_region_requires_primary';
    end if;
    new.wilaya_id := null;
    new.daira_region_id := null;
    return new;
  end if;

  if new.region_id is null then
    raise exception 'primary_region_required';
  end if;

  select * into primary_level
  from public.country_region_levels
  where country_code = new.country_code and level = 1;

  if not found then raise exception 'country_region_levels_not_configured'; end if;

  select * into primary_region
  from public.country_regions r
  where r.id = new.region_id
    and r.country_code = new.country_code
    and r.parent_id is null
    and r.is_enabled
    and r.region_type = any(primary_level.region_types);

  if not found then raise exception 'invalid_primary_region'; end if;

  select r.legacy_wilaya_id into primary_legacy_wilaya
  from public.country_regions r
  where r.id = primary_region.id and r.country_code = new.country_code;

  if exists (
    select 1 from public.country_region_levels l
    where l.country_code = new.country_code
      and l.level = 2
      and l.is_required
  ) and new.secondary_region_id is null then
    raise exception 'secondary_region_required';
  end if;

  if new.secondary_region_id is not null then
    select * into secondary_level
    from public.country_region_levels
    where country_code = new.country_code and level = 2;

    if not found then raise exception 'secondary_region_not_supported'; end if;

    select * into secondary_region
    from public.country_regions r
    where r.id = new.secondary_region_id
      and r.country_code = new.country_code
      and r.parent_id = new.region_id
      and r.is_enabled
      and r.region_type = any(secondary_level.region_types);

    if not found then raise exception 'invalid_secondary_region'; end if;
  end if;

  -- Preserve legacy identifiers only for the original Algeria data model.
  if new.country_code = 'DZ' then
    if primary_legacy_wilaya is null then
      raise exception 'legacy_wilaya_mapping_missing';
    end if;
    new.wilaya_id := primary_legacy_wilaya;
    if tg_table_name in ('profiles','orders','user_addresses') then
      new.daira_region_id := new.secondary_region_id;
    end if;
  else
    new.wilaya_id := null;
    if tg_table_name in ('profiles','orders','user_addresses') then
      new.daira_region_id := null;
    end if;
  end if;

  -- Validate canonical phone values against the account market when supplied.
  if new.phone is not null and length(btrim(new.phone)) > 0 then
    if new.phone !~ '^\\+[1-9][0-9]{7,14}$'
       or left(new.phone, length(selected_calling_code)) <> selected_calling_code then
      raise exception 'invalid_country_phone';
    end if;
  end if;

  return new;
end;
$function$;

-- Account country is authoritative. A client cannot submit another market or
-- choose a browsing market as the checkout/store country.
create or replace function public.create_my_store_for_account(
  _store_name text,
  _slug text,
  _phone text,
  _whatsapp text,
  _region_id bigint,
  _secondary_region_id bigint,
  _commune text,
  _address_line text,
  _latitude double precision,
  _longitude double precision,
  _opening_hours jsonb,
  _category text,
  _subcategories text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_country_code text;
  created_store_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  if nullif(btrim(_store_name), '') is null
     or nullif(btrim(_slug), '') is null
     or _region_id is null
     or _opening_hours is null
     or jsonb_typeof(_opening_hours) <> 'object'
     or nullif(_opening_hours ->> 'open', '') is null
     or nullif(_opening_hours ->> 'close', '') is null then
    raise exception 'invalid_store_input';
  end if;

  select p.country_code into current_country_code
  from public.profiles p
  where p.user_id = auth.uid()
  for update;

  if not found then raise exception 'profile_not_found'; end if;

  if _category is not null and not exists (
    select 1 from public.categories c
    where c.id = _category and c.parent_id is null and c.is_active
  ) then raise exception 'invalid_store_category'; end if;

  if exists (
    select 1 from unnest(coalesce(_subcategories, '{}'::text[])) selected(id)
    where not exists (
      select 1 from public.categories c
      where c.id = selected.id and c.parent_id = _category and c.is_active
    )
  ) then raise exception 'invalid_store_subcategory'; end if;

  if exists (select 1 from public.stores s where s.owner_id = auth.uid()) then
    raise exception 'store_already_exists';
  end if;

  insert into public.stores (
    owner_id, name, slug, phone, whatsapp, wilaya_id,
    country_code, region_id, secondary_region_id, commune, address_line,
    latitude, longitude, opening_hours, category, subcategories
  ) values (
    auth.uid(), btrim(_store_name), btrim(_slug),
    nullif(btrim(_phone), ''), nullif(btrim(_whatsapp), ''), null,
    current_country_code, _region_id, _secondary_region_id,
    nullif(btrim(_commune), ''), nullif(btrim(_address_line), ''),
    _latitude, _longitude, _opening_hours,
    nullif(btrim(_category), ''), coalesce(_subcategories, '{}'::text[])
  ) returning id into created_store_id;

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

  return created_store_id;
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
  legacy_wilaya_id integer;
  it jsonb;
  offer_row public.store_offers;
  product_name text;
  quantity integer;
  subtotal_amount integer := 0;
  created_order_id uuid;
  normalized_hash text;
  previous_hash text;
  previous_order_id uuid;
begin
  if current_user_id is null then raise exception 'not_authenticated'; end if;
  if _idempotency_key is null then raise exception 'idempotency_key_required'; end if;
  if _payment_method is distinct from 'cod' then raise exception 'invalid_payment_method'; end if;
  if _receipt_url is not null then raise exception 'unexpected_receipt'; end if;
  if _delivery_type is null or _delivery_type not in ('home','desk') then raise exception 'invalid_delivery_type'; end if;
  if _items is null or jsonb_typeof(_items) is distinct from 'array'
     or jsonb_array_length(_items) < 1 or jsonb_array_length(_items) > 30 then
    raise exception 'invalid_items';
  end if;
  if _region_id is null or nullif(btrim(_commune), '') is null
     or nullif(btrim(_address_line), '') is null
     or length(_address_line) > 300
     or length(btrim(_full_name)) < 2 or length(_full_name) > 120
     or _phone is null or length(_phone) > 30 then
    raise exception 'invalid_order_contact';
  end if;

  select p.country_code, c.currency_code
    into account_country_code, account_currency_code
  from public.profiles p
  join public.countries c on c.code = p.country_code
  where p.user_id = current_user_id;

  if not found then raise exception 'profile_not_found'; end if;

  select r.legacy_wilaya_id into legacy_wilaya_id
  from public.country_regions r
  where r.id = _region_id
    and r.country_code = account_country_code
    and r.parent_id is null
    and r.is_enabled;

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
    address_line, delivery_type, payment_method, receipt_url,
    subtotal, shipping_fee, total, commission_amount
  ) values (
    current_user_id, btrim(_full_name), btrim(_phone), legacy_wilaya_id,
    account_country_code, _region_id, _secondary_region_id,
    case when account_country_code = 'DZ' then _secondary_region_id else null end,
    account_currency_code, btrim(_commune), btrim(_address_line),
    _delivery_type, 'cod', null, 0, 0, 0, 0
  ) returning id into created_order_id;

  for it in select value from jsonb_array_elements(_items) loop
    if jsonb_typeof(it) <> 'object' then raise exception 'invalid_item'; end if;

    begin
      quantity := (it ->> 'quantity')::integer;
    exception when others then
      raise exception 'invalid_quantity';
    end;

    if quantity is null or quantity < 1 or quantity > 20 then raise exception 'invalid_quantity'; end if;

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

    subtotal_amount := subtotal_amount + offer_row.price * quantity;
  end loop;

  update public.orders
  set subtotal = subtotal_amount,
      total = subtotal_amount,
      shipping_fee = 0,
      commission_amount = 0
  where id = created_order_id;

  insert into public.checkout_idempotency (
    user_id, idempotency_key, request_hash, order_id
  ) values (
    current_user_id, _idempotency_key, normalized_hash, created_order_id
  );

  return created_order_id;
end;
$function$;

revoke all on function public.create_my_store_for_account(
  text,text,text,text,bigint,bigint,text,text,double precision,double precision,jsonb,text,text[]
) from public, anon;
grant execute on function public.create_my_store_for_account(
  text,text,text,text,bigint,bigint,text,text,double precision,double precision,jsonb,text,text[]
) to authenticated;

revoke all on function public.create_checkout_order_for_account(
  jsonb,text,bigint,bigint,text,text,text,text,text,text,uuid
) from public, anon;
grant execute on function public.create_checkout_order_for_account(
  jsonb,text,bigint,bigint,text,text,text,text,text,text,uuid
) to authenticated;

comment on function public.create_my_store_for_account(
  text,text,text,text,bigint,bigint,text,text,double precision,double precision,jsonb,text,text[]
) is 'Creates a store in the authenticated account country using validated country administrative regions.';
comment on function public.create_checkout_order_for_account(
  jsonb,text,bigint,bigint,text,text,text,text,text,text,uuid
) is 'Creates an idempotent COD order in the authenticated account country using validated country administrative regions.';

commit;
