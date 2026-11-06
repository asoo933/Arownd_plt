-- Fix shipment approval checks to use the restricted public directory.
drop policy if exists "Customers create valid pending shipments" on public.shipments;
create policy "Customers create valid pending shipments"
on public.shipments for insert to authenticated
with check (
  status = 'pending'
  and exists (
    select 1 from public.orders o
    where o.id = shipments.order_id
      and o.user_id = auth.uid()
      and o.delivery_type = 'home'
      and o.shipment_id is null
      and shipments.recipient_name = o.full_name
      and shipments.recipient_phone = o.phone
      and shipments.delivery_address = o.address_line
      and exists (
        select 1
        from public.approved_delivery_companies adc
        join public.delivery_coverage_areas ca on ca.company_id = adc.id
        where adc.id = shipments.company_id
          and ca.wilaya_id = o.wilaya_id
          and ca.is_active = true
          and (coalesce(cardinality(ca.communes), 0) = 0 or o.commune = any(ca.communes))
          and ca.base_fee = shipments.fee
      )
  )
);

-- Reject null and non-array order item payloads.
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
  rate numeric(4,2);
  commission integer := 0;
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
    select commission_rate into rate from public.stores where id = o.store_id;
    commission := commission + round(o.price * q * coalesce(rate, 7) / 100);
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
  set subtotal = sub, total = sub + fee, commission_amount = commission
  where id = oid;
  return oid;
end;
$$;

revoke execute on function public.create_order(jsonb,text,integer,text,text,text,text,text,text) from public, anon;
grant execute on function public.create_order(jsonb,text,integer,text,text,text,text,text,text) to authenticated;
