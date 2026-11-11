-- Arownd: harden orders, shipments, wallet receipts and storage access.
-- Store verification defaults are intentionally unchanged.

update storage.buckets set public = true where id in ('store-media', 'product-media');
update storage.buckets set public = false where id = 'receipts';

drop policy if exists "Owner deletes order" on public.orders;
revoke delete on public.orders from public, anon, authenticated;

drop policy if exists "Customer cancels own order" on public.orders;
create policy "Customer cancels own pending order"
on public.orders for update to authenticated
using (user_id = auth.uid() and status = 'pending')
with check (user_id = auth.uid() and status = 'cancelled');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass and conname = 'orders_status_allowed'
  ) then
    alter table public.orders add constraint orders_status_allowed
      check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));
  end if;
end $$;

create or replace function public.guard_order_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if public.has_role(auth.uid(), 'admin'::public.app_role) then return new; end if;

  if old.user_id = auth.uid() then
    if old.status = 'pending' and new.status = 'cancelled' then return new; end if;
    raise exception 'customer_order_transition_forbidden';
  end if;

  if public.is_order_merchant(old.id) then
    if (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('shipped', 'cancelled'))
      or (old.status = 'shipped' and new.status = 'delivered') then
      return new;
    end if;
    raise exception 'merchant_order_transition_forbidden';
  end if;

  raise exception 'not_authorized';
end;
$$;

drop trigger if exists guard_order_status_transition on public.orders;
create trigger guard_order_status_transition
before update of status on public.orders
for each row execute function public.guard_order_status_transition();

drop policy if exists "Receipts owner read" on storage.objects;
drop policy if exists "Receipt owner or order participant read" on storage.objects;
create policy "Receipt owner or order participant read"
on storage.objects for select to authenticated
using (
  bucket_id = 'receipts'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1 from public.orders o
      where o.receipt_url = storage.objects.name
        and (o.user_id = auth.uid()
          or public.is_order_merchant(o.id)
          or public.has_role(auth.uid(), 'admin'::public.app_role))
    )
    or exists (
      select 1 from public.wallet_transactions wt
      where wt.receipt_url = storage.objects.name
        and (wt.user_id = auth.uid()
          or public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  )
);

drop policy if exists "الشركات ترى شحناتها" on public.shipments;
create policy "Delivery companies read own shipments"
on public.shipments for select to authenticated
using (
  exists (
    select 1 from public.delivery_companies dc
    where dc.id = shipments.company_id and dc.user_id = auth.uid()
  )
);
create policy "Delivery companies update own shipment status"
on public.shipments for update to authenticated
using (
  exists (
    select 1 from public.delivery_companies dc
    where dc.id = shipments.company_id and dc.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.delivery_companies dc
    where dc.id = shipments.company_id and dc.user_id = auth.uid()
  )
);

drop policy if exists "العملاء يُدرجون شحنات طلباتهم" on public.shipments;
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
        from public.delivery_companies dc
        join public.delivery_coverage_areas ca on ca.company_id = dc.id
        where dc.id = shipments.company_id
          and dc.is_approved = true
          and ca.wilaya_id = o.wilaya_id
          and ca.is_active = true
          and (coalesce(cardinality(ca.communes), 0) = 0 or o.commune = any(ca.communes))
          and ca.base_fee = shipments.fee
      )
  )
);

create unique index if not exists shipments_one_per_order_idx
on public.shipments(order_id);

revoke insert on public.shipments from public, anon, authenticated;
grant insert (order_id, company_id, status, pickup_address, delivery_address,
              recipient_name, recipient_phone, fee, notes)
on public.shipments to authenticated;
revoke delete on public.shipments from public, anon, authenticated;

create or replace function public.guard_shipment_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if public.has_role(auth.uid(), 'admin'::public.app_role) then return new; end if;

  if old.status = 'pending'
     and new.status = 'rejected'
     and exists (
       select 1 from public.orders o
       where o.id = old.order_id and o.user_id = auth.uid()
     ) then
    return new;
  end if;

  if not exists (
    select 1 from public.delivery_companies dc
    where dc.id = old.company_id and dc.user_id = auth.uid()
  ) then
    raise exception 'not_authorized';
  end if;

  if (old.status = 'pending' and new.status in ('accepted', 'rejected'))
    or (old.status = 'accepted' and new.status in ('picked_up', 'failed'))
    or (old.status = 'picked_up' and new.status in ('in_transit', 'failed'))
    or (old.status = 'in_transit' and new.status in ('delivered', 'failed', 'returned'))
    or (old.status = 'failed' and new.status = 'returned') then
    return new;
  end if;

  raise exception 'shipment_status_transition_forbidden';
end;
$$;

drop trigger if exists guard_shipment_status_transition on public.shipments;
create trigger guard_shipment_status_transition
before update of status on public.shipments
for each row execute function public.guard_shipment_status_transition();

drop policy if exists "Users insert own pending wallet transactions" on public.wallet_transactions;
create policy "Users insert own pending wallet transactions"
on public.wallet_transactions for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and type in ('topup', 'withdraw')
  and (
    type = 'withdraw'
    or (
      receipt_url is not null
      and receipt_url like auth.uid()::text || '/%'
      and exists (
        select 1 from storage.objects so
        where so.bucket_id = 'receipts' and so.name = wallet_transactions.receipt_url
      )
    )
  )
);

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
  if jsonb_typeof(_items) <> 'array'
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

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when _user_id = auth.uid()
      or exists (
        select 1 from public.user_roles r
        where r.user_id = auth.uid() and r.role = 'admin'::public.app_role
      )
    then exists (
      select 1 from public.user_roles r
      where r.user_id = _user_id and r.role = _role
    )
    else false
  end;
$$;

revoke execute on function public.has_role(uuid,public.app_role) from public, anon;
grant execute on function public.has_role(uuid,public.app_role) to authenticated;
