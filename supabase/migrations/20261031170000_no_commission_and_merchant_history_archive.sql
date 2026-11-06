-- Arownd does not charge commissions. Archive terminal merchant history without deleting customer records.
alter table public.stores alter column commission_rate set default 0;
update public.stores set commission_rate = 0 where commission_rate is distinct from 0;
update public.orders set commission_amount = 0 where commission_amount is distinct from 0;

alter table public.reservations
  add column if not exists merchant_archived_at timestamptz;
alter table public.order_items
  add column if not exists merchant_archived_at timestamptz;

create index if not exists idx_reservations_store_merchant_archive
  on public.reservations (store_id, merchant_archived_at);
create index if not exists idx_order_items_store_merchant_archive
  on public.order_items (store_id, merchant_archived_at);

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
set search_path = public, storage
as $$
declare
  it jsonb;
  o public.store_offers;
  pname text;
  q integer;
  sub integer := 0;
  fee integer;
  oid uuid;
  w public.wilayas;
  receipt_path text;
  receipt_meta jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if _items is null
     or jsonb_typeof(_items) is distinct from 'array'
     or jsonb_array_length(_items) < 1
     or jsonb_array_length(_items) > 30 then
    raise exception 'invalid_items';
  end if;
  if _delivery_type not in ('home', 'desk') then raise exception 'invalid_delivery_type'; end if;
  if _payment_method not in ('cod', 'baridimob') then raise exception 'invalid_payment_method'; end if;

  if coalesce(length(trim(_full_name)), 0) < 2
     or length(_full_name) > 120
     or coalesce(length(trim(_phone)), 0) < 8
     or length(_phone) > 30
     or coalesce(length(trim(_commune)), 0) < 2
     or length(_commune) > 100
     or length(coalesce(_address_line, '')) > 300 then
    raise exception 'invalid_order_contact';
  end if;

  if _payment_method = 'baridimob' then
    if coalesce(trim(_receipt_url), '') = '' then raise exception 'receipt_required'; end if;
    if position('/storage/v1/object/sign/receipts/' in _receipt_url) > 0 then
      receipt_path := split_part(
        split_part(_receipt_url, '/storage/v1/object/sign/receipts/', 2), '?', 1
      );
    else
      receipt_path := trim(_receipt_url);
    end if;
    if receipt_path not like auth.uid()::text || '/%' then raise exception 'receipt_not_owned'; end if;
    select metadata into receipt_meta from storage.objects
    where bucket_id = 'receipts' and name = receipt_path;
    if not found or coalesce(receipt_meta->>'mimetype', '') not like 'image/%' then
      raise exception 'receipt_not_found_or_invalid';
    end if;
  elsif _receipt_url is not null then
    raise exception 'unexpected_receipt';
  end if;

  select * into w from public.wilayas where id = _wilaya_id;
  if not found then raise exception 'invalid_wilaya'; end if;
  fee := case when _delivery_type = 'home' then w.home_price else w.desk_price end;

  insert into public.orders (
    user_id, full_name, phone, wilaya_id, commune, address_line,
    delivery_type, payment_method, receipt_url, subtotal, shipping_fee,
    total, commission_amount
  ) values (
    auth.uid(), trim(_full_name), trim(_phone), _wilaya_id, trim(_commune),
    trim(coalesce(_address_line, '')), _delivery_type, _payment_method,
    receipt_path, 0, fee, 0, 0
  ) returning id into oid;

  for it in select value from jsonb_array_elements(_items) loop
    if jsonb_typeof(it) <> 'object' then raise exception 'invalid_item'; end if;
    q := (it->>'quantity')::integer;
    if q is null or q < 1 or q > 20 then raise exception 'invalid_quantity'; end if;
    select * into o from public.store_offers
    where id = (it->>'offer_id')::uuid for update;
    if not found or not o.is_available or o.stock_quantity < q then raise exception 'out_of_stock'; end if;
    select name into pname from public.products where id = o.product_id;
    -- Arownd does not charge a commission.
    insert into public.order_items (
      order_id, offer_id, store_id, product_name, unit_price, quantity, options
    ) values (
      oid, o.id, o.store_id, pname, o.price, q, coalesce(it->'options', '{}'::jsonb)
    );
    update public.store_offers
    set stock_quantity = stock_quantity - q, is_available = (stock_quantity - q) > 0
    where id = o.id;
    sub := sub + o.price * q;
  end loop;

  update public.orders
  set subtotal = sub, total = sub + fee, commission_amount = 0
  where id = oid;
  return oid;
end;
$$;

revoke execute on function public.create_order(jsonb,text,integer,text,text,text,text,text,text) from public, anon;
grant execute on function public.create_order(jsonb,text,integer,text,text,text,text,text,text) to authenticated;


create or replace function public.merchant_archive_reservation(_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.reservations;
begin
  select * into r
  from public.reservations
  where id = _reservation_id
  for update;

  if not found or not public.is_store_owner(r.store_id) then
    raise exception 'forbidden';
  end if;

  if r.status = 'pending' and r.expires_at <= now() then
    update public.reservations set status = 'expired' where id = r.id;
    update public.store_offers
      set stock_quantity = stock_quantity + r.quantity, is_available = true
      where id = r.offer_id;
    r.status := 'expired';
  end if;

  if r.status not in ('collected', 'cancelled', 'expired') then
    raise exception 'reservation_not_deletable';
  end if;

  update public.reservations
  set merchant_archived_at = now()
  where id = r.id and merchant_archived_at is null;

  if not found then
    raise exception 'reservation_already_archived';
  end if;
end;
$$;

revoke execute on function public.merchant_archive_reservation(uuid) from public, anon;
grant execute on function public.merchant_archive_reservation(uuid) to authenticated;

create or replace function public.merchant_archive_order_items(_order_id uuid, _store_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_status text;
  archived_count integer;
begin
  if not public.is_store_owner(_store_id) then
    raise exception 'forbidden';
  end if;

  select o.status into order_status
  from public.orders o
  where o.id = _order_id
    and exists (
      select 1 from public.order_items i
      where i.order_id = o.id and i.store_id = _store_id
    )
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if order_status not in ('delivered', 'cancelled') then
    raise exception 'order_not_deletable';
  end if;

  update public.order_items
  set merchant_archived_at = now()
  where order_id = _order_id
    and store_id = _store_id
    and merchant_archived_at is null;

  get diagnostics archived_count = row_count;
  if archived_count = 0 then
    raise exception 'order_already_archived';
  end if;
end;
$$;

revoke execute on function public.merchant_archive_order_items(uuid, uuid) from public, anon;
grant execute on function public.merchant_archive_order_items(uuid, uuid) to authenticated;
