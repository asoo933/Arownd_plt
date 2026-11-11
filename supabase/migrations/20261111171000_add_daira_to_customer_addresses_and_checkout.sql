-- Persist and validate Algeria's daira selection for customer addresses and orders.
-- Existing rows remain readable with a NULL daira_region_id.
-- New or location-edited records must provide a daira belonging to their selected wilaya.

begin;

alter table public.profiles add column if not exists daira_region_id bigint;
alter table public.user_addresses add column if not exists daira_region_id bigint;
alter table public.orders add column if not exists daira_region_id bigint;

alter table public.profiles
  add constraint profiles_daira_region_fkey
  foreign key (country_code, daira_region_id)
  references public.country_regions(country_code, id) on delete restrict;
alter table public.user_addresses
  add constraint user_addresses_daira_region_fkey
  foreign key (country_code, daira_region_id)
  references public.country_regions(country_code, id) on delete restrict;
alter table public.orders
  add constraint orders_daira_region_fkey
  foreign key (country_code, daira_region_id)
  references public.country_regions(country_code, id) on delete restrict;

create index if not exists profiles_daira_region_idx
  on public.profiles(country_code, daira_region_id);
create index if not exists user_addresses_daira_region_idx
  on public.user_addresses(country_code, daira_region_id);
create index if not exists orders_daira_region_idx
  on public.orders(country_code, daira_region_id);

-- Preserve the existing profile column allowlist while permitting the new field.
grant select (daira_region_id) on public.profiles to authenticated;
grant insert (daira_region_id) on public.profiles to authenticated;
grant update (daira_region_id) on public.profiles to authenticated;

-- Preserve existing per-column grants for saved addresses and customer order reads.
grant select (daira_region_id) on public.user_addresses to authenticated;
grant insert (daira_region_id) on public.user_addresses to authenticated;
grant update (daira_region_id) on public.user_addresses to authenticated;
grant select (daira_region_id) on public.orders to authenticated;

create or replace function public.enforce_daira_region_selection()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  selected_wilaya_region_id bigint;
  selected_daira_parent_id bigint;
  selected_wilaya_id integer;
begin
  -- A profile may legitimately have no delivery location yet.
  if tg_table_name = 'profiles'
     and new.wilaya_id is null
     and new.daira_region_id is null then
    return new;
  end if;

  if tg_table_name = 'orders' and new.daira_region_id is null then
    -- The trusted checkout wrapper temporarily allows the legacy order
    -- creator to insert the parent order before attaching the daira.
    if tg_op = 'INSERT'
       and coalesce(current_setting('arownd.checkout_daira_pending', true), 'off') = 'on' then
      return new;
    end if;
    -- Existing orders without a daira may still receive unrelated status updates.
    if tg_op = 'UPDATE'
       and old.daira_region_id is null
       and new.daira_region_id is null
       and new.wilaya_id is not distinct from old.wilaya_id
       and new.region_id is not distinct from old.region_id
       and new.country_code is not distinct from old.country_code then
      return new;
    end if;
    raise exception 'daira_required';
  elsif new.daira_region_id is null then
    raise exception 'daira_required';
  end if;

  select r.id
    into selected_wilaya_region_id
  from public.country_regions r
  join public.countries c on c.code = r.country_code
  where r.country_code = new.country_code
    and r.legacy_wilaya_id = new.wilaya_id
    and r.region_type = 'wilaya'
    and r.is_enabled
    and c.is_enabled;

  if selected_wilaya_region_id is null then
    raise exception 'wilaya_not_available';
  end if;

  if tg_table_name <> 'orders' then
    new.region_id := selected_wilaya_region_id;
  elsif new.region_id is distinct from selected_wilaya_region_id then
    raise exception 'order_wilaya_region_mismatch';
  end if;

  select d.parent_id, p.legacy_wilaya_id
    into selected_daira_parent_id, selected_wilaya_id
  from public.country_regions d
  join public.country_regions p
    on p.country_code = d.country_code
   and p.id = d.parent_id
  where d.country_code = new.country_code
    and d.id = new.daira_region_id
    and d.region_type = 'daira'
    and d.is_enabled
    and p.region_type = 'wilaya'
    and p.is_enabled;

  if selected_daira_parent_id is null
     or selected_daira_parent_id is distinct from selected_wilaya_region_id
     or selected_wilaya_id is distinct from new.wilaya_id then
    raise exception 'daira_wilaya_mismatch';
  end if;

  return new;
end;
$function$;

drop trigger if exists profiles_daira_region_guard on public.profiles;
create trigger profiles_daira_region_guard
before insert or update of country_code, wilaya_id, region_id, daira_region_id
on public.profiles
for each row execute function public.enforce_daira_region_selection();

drop trigger if exists user_addresses_daira_region_guard on public.user_addresses;
create trigger user_addresses_daira_region_guard
before insert or update of country_code, wilaya_id, region_id, daira_region_id
on public.user_addresses
for each row execute function public.enforce_daira_region_selection();

drop trigger if exists orders_daira_region_guard on public.orders;
create trigger orders_daira_region_guard
before insert or update of country_code, wilaya_id, region_id, daira_region_id
on public.orders
for each row execute function public.enforce_daira_region_selection();

-- The new named-argument contract requires the daira and includes it in the
-- server-side idempotency hash. The existing trusted creator still calculates
-- prices, validates the account market, reserves stock and creates order rows.
create or replace function public.create_order_with_delivery(
  _items jsonb,
  _delivery_type text,
  _wilaya_id integer,
  _daira_region_id bigint,
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
  if current_user_id is null then raise exception 'not_authenticated'; end if;
  if _idempotency_key is null then raise exception 'idempotency_key_required'; end if;
  if _payment_method is distinct from 'cod' then raise exception 'invalid_payment_method'; end if;
  if _receipt_url is not null then raise exception 'unexpected_receipt'; end if;
  if _daira_region_id is null then raise exception 'daira_required'; end if;
  if _delivery_type is null or _delivery_type not in ('home','desk') then raise exception 'invalid_delivery_type'; end if;
  if coalesce(length(trim(_address_line)),0) = 0 then raise exception 'delivery_address_required'; end if;

  normalized_hash := md5(jsonb_build_object(
    'items',_items,'delivery_type',_delivery_type,'wilaya_id',_wilaya_id,
    'daira_region_id',_daira_region_id,'commune',_commune,
    'address_line',_address_line,'full_name',_full_name,'phone',_phone,
    'payment_method',_payment_method,'receipt_url',_receipt_url,
    'delivery_company_id',null
  )::text);

  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text || ':' || _idempotency_key::text,0)
  );

  select request_hash, order_id
    into previous_hash, previous_order_id
  from public.checkout_idempotency
  where user_id = current_user_id and idempotency_key = _idempotency_key;

  if found then
    if previous_hash <> normalized_hash then
      raise exception 'idempotency_key_reused_with_different_request';
    end if;
    if previous_order_id is null then
      raise exception 'idempotent_order_no_longer_available';
    end if;
    return previous_order_id;
  end if;

  perform set_config('arownd.checkout_daira_pending', 'on', true);
  created_order_id := public.create_order(
    _items,_delivery_type,_wilaya_id,_commune,_address_line,
    _full_name,_phone,_payment_method,_receipt_url
  );
  update public.orders
  set daira_region_id = _daira_region_id
  where id = created_order_id and user_id = current_user_id;
  if not found then raise exception 'order_daira_update_failed'; end if;
  perform set_config('arownd.checkout_daira_pending', 'off', true);

  insert into public.checkout_idempotency (
    user_id,idempotency_key,request_hash,order_id
  ) values (
    current_user_id,_idempotency_key,normalized_hash,created_order_id
  );

  return created_order_id;
end;
$function$;

-- Legacy RPC signatures cannot create an order without a daira.
revoke all on function public.create_order_with_delivery(jsonb,text,integer,text,text,text,text,text,text,uuid)
  from public, anon, authenticated;
revoke all on function public.create_order(jsonb,text,integer,text,text,text,text,text,text)
  from public, anon, authenticated;
revoke all on function public.create_order_with_delivery(jsonb,text,integer,bigint,text,text,text,text,text,text,uuid)
  from public, anon;
grant execute on function public.create_order_with_delivery(jsonb,text,integer,bigint,text,text,text,text,text,text,uuid)
  to authenticated;

comment on column public.profiles.daira_region_id is
  'Selected daira. NULL is retained only for profiles without a saved delivery location.';
comment on column public.user_addresses.daira_region_id is
  'Selected daira. NULL is retained only for legacy saved addresses until updated.';
comment on column public.orders.daira_region_id is
  'Daira snapshot for the order. NULL is retained only for legacy orders.';

commit;
