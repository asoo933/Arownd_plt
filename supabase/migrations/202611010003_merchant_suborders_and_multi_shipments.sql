-- Introduce per-store suborders while preserving the customer-facing parent order.
-- Existing orders and order_items remain readable; backfill is additive.

create table if not exists public.merchant_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete restrict,
  customer_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  subtotal integer not null default 0 check (subtotal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, store_id)
);

create index if not exists merchant_orders_store_status_created_idx
  on public.merchant_orders (store_id, status, created_at desc);
create index if not exists merchant_orders_customer_created_idx
  on public.merchant_orders (customer_id, created_at desc);

alter table public.merchant_orders enable row level security;
revoke all on public.merchant_orders from public, anon, authenticated;
grant select on public.merchant_orders to authenticated;

drop policy if exists "Customer and store owner read merchant orders" on public.merchant_orders;
create policy "Customer and store owner read merchant orders"
on public.merchant_orders for select to authenticated
using (
  customer_id = auth.uid()
  or public.is_store_owner(store_id)
  or public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Backfill one suborder per (parent order, store), preserving the current order status.
insert into public.merchant_orders (order_id, store_id, customer_id, status, subtotal)
select
  oi.order_id,
  oi.store_id,
  o.user_id,
  o.status,
  sum(oi.unit_price * oi.quantity)::integer
from public.order_items oi
join public.orders o on o.id = oi.order_id
group by oi.order_id, oi.store_id, o.user_id, o.status
on conflict (order_id, store_id) do update
set subtotal = excluded.subtotal;

alter table public.order_items
  add column if not exists merchant_order_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.order_items'::regclass
      and conname = 'order_items_merchant_order_id_fkey'
  ) then
    alter table public.order_items
      add constraint order_items_merchant_order_id_fkey
      foreign key (merchant_order_id)
      references public.merchant_orders(id)
      on delete set null;
  end if;
end;
$$;

update public.order_items oi
set merchant_order_id = mo.id
from public.merchant_orders mo
where mo.order_id = oi.order_id
  and mo.store_id = oi.store_id
  and oi.merchant_order_id is null;

create index if not exists order_items_merchant_order_id_idx
  on public.order_items (merchant_order_id);

-- New order items automatically create/update their store suborder in the same transaction.
create or replace function public.sync_merchant_order_from_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  customer uuid;
  parent_status text;
  suborder_id uuid;
begin
  select user_id, status
  into customer, parent_status
  from public.orders
  where id = new.order_id;

  if not found then
    raise exception 'parent_order_not_found';
  end if;

  insert into public.merchant_orders (order_id, store_id, customer_id, status, subtotal)
  values (
    new.order_id,
    new.store_id,
    customer,
    case when parent_status in ('confirmed', 'shipped', 'delivered', 'cancelled')
      then parent_status else 'pending' end,
    new.unit_price * new.quantity
  )
  on conflict (order_id, store_id) do update
  set subtotal = public.merchant_orders.subtotal + excluded.subtotal
  returning id into suborder_id;

  new.merchant_order_id := suborder_id;
  return new;
end;
$function$;

drop trigger if exists order_items_sync_merchant_order on public.order_items;
create trigger order_items_sync_merchant_order
before insert on public.order_items
for each row execute function public.sync_merchant_order_from_item();

revoke all on function public.sync_merchant_order_from_item() from public, anon, authenticated;

-- A parent order may now have one shipment for each merchant suborder.
alter table public.shipments
  add column if not exists merchant_order_id uuid
  references public.merchant_orders(id) on delete set null;

drop index if exists public.shipments_one_per_order_idx;

create unique index if not exists shipments_one_per_merchant_order_idx
  on public.shipments (merchant_order_id)
  where merchant_order_id is not null;

create index if not exists shipments_parent_order_idx
  on public.shipments (order_id);

-- Attach historical one-store shipments to their suborder. A historical shipment
-- shared by several stores stays customer/carrier-visible but is not exposed to any one merchant.
update public.shipments s
set merchant_order_id = mo.id
from public.merchant_orders mo
where mo.order_id = s.order_id
  and (
    select count(*)
    from public.merchant_orders all_mo
    where all_mo.order_id = s.order_id
  ) = 1
  and s.merchant_order_id is null;

-- Tighten shipment and tracking visibility: a merchant sees only the shipment
-- assigned to their own suborder, not every shipment in the customer's parent order.
drop policy if exists "المتاجر تقرأ شحنات طلباتها" on public.shipments;
create policy "Merchants read only their suborder shipments"
on public.shipments for select to authenticated
using (
  exists (
    select 1
    from public.merchant_orders mo
    where mo.id = shipments.merchant_order_id
      and public.is_store_owner(mo.store_id)
  )
);

create policy "Customers read shipments for their own orders"
on public.shipments for select to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = shipments.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "أطراف الشحنة تقرأ سجلات الحالة" on public.shipment_status_logs;
create policy "Order parties read scoped shipment logs"
on public.shipment_status_logs for select to authenticated
using (
  exists (
    select 1
    from public.shipments s
    join public.orders o on o.id = s.order_id
    left join public.merchant_orders mo on mo.id = s.merchant_order_id
    left join public.delivery_companies dc on dc.id = s.company_id
    where s.id = shipment_status_logs.shipment_id
      and (
        o.user_id = auth.uid()
        or (mo.id is not null and public.is_store_owner(mo.store_id))
        or dc.user_id = auth.uid()
        or public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

drop policy if exists "أطراف الشحنة تقرأ نقاط التتبع" on public.shipment_tracking;
create policy "Order parties read scoped shipment tracking"
on public.shipment_tracking for select to authenticated
using (
  exists (
    select 1
    from public.shipments s
    join public.orders o on o.id = s.order_id
    left join public.merchant_orders mo on mo.id = s.merchant_order_id
    left join public.delivery_companies dc on dc.id = s.company_id
    where s.id = shipment_tracking.shipment_id
      and (
        o.user_id = auth.uid()
        or (mo.id is not null and public.is_store_owner(mo.store_id))
        or dc.user_id = auth.uid()
        or public.has_role(auth.uid(), 'admin'::public.app_role)
      )
  )
);

-- Permit only the trusted merchant-suborder RPC to update the aggregate parent status.
create or replace function public.guard_order_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  actor_is_admin boolean := false;
  actor_is_customer boolean := false;
  actor_is_merchant boolean := false;
begin
  if new.status is not distinct from old.status then return new; end if;
  if current_setting('arownd.internal_aggregate_order_status', true) = 'on' then
    return new;
  end if;
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  actor_is_admin := public.has_role(auth.uid(), 'admin'::public.app_role);
  actor_is_customer := old.user_id = auth.uid();
  actor_is_merchant := public.is_order_merchant(old.id);

  if not actor_is_admin then
    if actor_is_customer then
      if not (old.status = 'pending' and new.status = 'cancelled') then
        raise exception 'customer_order_transition_forbidden';
      end if;
      if exists (
        select 1 from public.merchant_orders mo
        where mo.order_id = old.id and mo.status <> 'pending'
      ) then
        raise exception 'order_already_processing';
      end if;
    elsif actor_is_merchant then
      raise exception 'merchant_order_status_requires_suborder_rpc';
    else
      raise exception 'not_authorized';
    end if;
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    perform 1
    from public.shipments
    where order_id = old.id
    for update;

    if exists (
      select 1 from public.shipments
      where order_id = old.id and status not in ('pending', 'rejected')
    ) then
      raise exception 'order_already_processing';
    end if;

    update public.shipments
    set status = 'rejected', updated_at = now()
    where order_id = old.id and status = 'pending';

    update public.merchant_orders
    set status = 'cancelled', updated_at = now()
    where order_id = old.id and status <> 'cancelled';

    update public.store_offers so
    set stock_quantity = so.stock_quantity + item_totals.quantity, is_available = true
    from (
      select offer_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = old.id and offer_id is not null
      group by offer_id
    ) item_totals
    where so.id = item_totals.offer_id;
  end if;

  return new;
end;
$function$;
revoke all on function public.guard_order_status_transition() from public, anon, authenticated;

-- Merchant status changes are scoped to one store suborder, never the parent order.
create or replace function public.merchant_update_merchant_order_status(
  _merchant_order_id uuid,
  _status text
)
returns public.merchant_orders
language plpgsql
security definer
set search_path = public
as $function$
declare
  row_data public.merchant_orders;
  aggregate_status text;
  parent_order_status text;
  parent_delivery_type text;
  parent_order_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if _status is null or _status not in ('confirmed', 'shipped', 'delivered') then
    raise exception 'invalid_merchant_order_status';
  end if;

  select order_id into parent_order_id
  from public.merchant_orders
  where id = _merchant_order_id;

  if not found then
    raise exception 'merchant_order_not_found';
  end if;

  select status, delivery_type
  into parent_order_status, parent_delivery_type
  from public.orders
  where id = parent_order_id
  for update;

  if not found or parent_order_status = 'cancelled' then
    raise exception 'parent_order_not_active';
  end if;

  if _status = 'delivered' and parent_delivery_type <> 'desk' then
    raise exception 'delivery_company_must_confirm_delivery';
  end if;

  select * into row_data
  from public.merchant_orders
  where id = _merchant_order_id
  for update;

  if not public.is_store_owner(row_data.store_id)
     and not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'not_authorized';
  end if;

  if not (
    (row_data.status = 'pending' and _status = 'confirmed')
    or (row_data.status = 'confirmed' and _status = 'shipped')
    or (row_data.status = 'shipped' and _status = 'delivered')
  ) then
    raise exception 'merchant_order_status_transition_forbidden';
  end if;

  update public.merchant_orders
  set status = _status,
      updated_at = now()
  where id = _merchant_order_id
  returning * into row_data;

  select case
    when bool_and(status = 'cancelled') then 'cancelled'
    when bool_and(status in ('delivered', 'cancelled')) then 'delivered'
    when bool_and(status in ('shipped', 'delivered', 'cancelled')) then 'shipped'
    when bool_and(status in ('confirmed', 'shipped', 'delivered', 'cancelled')) then 'confirmed'
    else 'pending'
  end
  into aggregate_status
  from public.merchant_orders
  where order_id = row_data.order_id;

  perform set_config('arownd.internal_aggregate_order_status', 'on', true);
  update public.orders
  set status = aggregate_status
  where id = row_data.order_id
    and status is distinct from aggregate_status;
  perform set_config('arownd.internal_aggregate_order_status', '', true);

  return row_data;
end;
$function$;

revoke all on function public.merchant_update_merchant_order_status(uuid, text)
  from public, anon;
grant execute on function public.merchant_update_merchant_order_status(uuid, text)
  to authenticated;

-- Archive a merchant's completed suborder independently of other stores in the parent order.
create or replace function public.merchant_archive_order_items(_order_id uuid, _store_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  suborder_status text;
  archived_count integer;
begin
  if not public.is_store_owner(_store_id) then
    raise exception 'forbidden';
  end if;

  select status into suborder_status
  from public.merchant_orders
  where order_id = _order_id
    and store_id = _store_id
  for update;

  if not found then
    raise exception 'merchant_order_not_found';
  end if;

  if suborder_status not in ('delivered', 'cancelled') then
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
$function$;

revoke all on function public.merchant_archive_order_items(uuid, uuid) from public, anon;
grant execute on function public.merchant_archive_order_items(uuid, uuid) to authenticated;

-- For home delivery, only the assigned delivery company may complete the merchant suborder.
-- Desk pickup remains merchant-confirmed because no carrier shipment exists.
create or replace function public.update_shipment_status(
  _shipment_id uuid,
  _status text,
  _note text default null
)
returns public.shipments
language plpgsql
security definer
set search_path = public
as $function$
declare
  shipment_row public.shipments;
  aggregate_status text;
  parent_order_id uuid;
  parent_order_status text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if _status is null or _status not in (
    'pending', 'accepted', 'rejected', 'picked_up',
    'in_transit', 'delivered', 'failed', 'returned'
  ) then
    raise exception 'invalid_shipment_status';
  end if;

  if _note is not null and length(_note) > 1000 then
    raise exception 'shipment_note_too_long';
  end if;

  select order_id into parent_order_id
  from public.shipments
  where id = _shipment_id;

  if not found then
    raise exception 'shipment_not_found';
  end if;

  -- Lock parent first to keep lock ordering consistent with cancellation and merchant updates.
  select status into parent_order_status
  from public.orders
  where id = parent_order_id
  for update;

  if not found or parent_order_status = 'cancelled' then
    raise exception 'parent_order_not_active';
  end if;

  select * into shipment_row
  from public.shipments
  where id = _shipment_id
  for update;

  if not found then
    raise exception 'shipment_not_found';
  end if;

  if not public.has_role(auth.uid(), 'admin'::public.app_role)
     and not exists (
       select 1 from public.delivery_companies dc
       where dc.id = shipment_row.company_id
         and dc.user_id = auth.uid()
     ) then
    raise exception 'not_authorized';
  end if;

  if shipment_row.status = _status then
    return shipment_row;
  end if;

  perform set_config('arownd.shipment_status_note', coalesce(nullif(trim(_note), ''), ''), true);

  update public.shipments
  set status = _status,
      updated_at = now()
  where id = _shipment_id
  returning * into shipment_row;

  perform set_config('arownd.shipment_status_note', '', true);

  if _status = 'delivered' and shipment_row.merchant_order_id is not null then
    update public.merchant_orders
    set status = 'delivered',
        updated_at = now()
    where id = shipment_row.merchant_order_id;

    select case
      when bool_and(status = 'cancelled') then 'cancelled'
      when bool_and(status in ('delivered', 'cancelled')) then 'delivered'
      when bool_and(status in ('shipped', 'delivered', 'cancelled')) then 'shipped'
      when bool_and(status in ('confirmed', 'shipped', 'delivered', 'cancelled')) then 'confirmed'
      else 'pending'
    end
    into aggregate_status
    from public.merchant_orders
    where order_id = shipment_row.order_id;

    perform set_config('arownd.internal_aggregate_order_status', 'on', true);
    update public.orders
    set status = aggregate_status
    where id = shipment_row.order_id
      and status is distinct from aggregate_status;
    perform set_config('arownd.internal_aggregate_order_status', '', true);
  end if;

  return shipment_row;
end;
$function$;

revoke all on function public.update_shipment_status(uuid, text, text)
  from public, anon;
grant execute on function public.update_shipment_status(uuid, text, text)
  to authenticated;

-- Replace the first-pass checkout RPC: create one shipment per merchant suborder.
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
  _delivery_company_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $function$
declare
  company_row record;
  merchant_row record;
  delivery_fee numeric;
  order_id uuid;
  shipment_id uuid;
  first_shipment_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if _delivery_type is distinct from 'home' then
    raise exception 'invalid_delivery_type';
  end if;

  if _delivery_company_id is null then
    raise exception 'delivery_company_required';
  end if;

  select dc.company_name, dc.contact_phone
  into company_row
  from public.delivery_companies dc
  where dc.id = _delivery_company_id
    and dc.is_approved is true;

  if not found then
    raise exception 'delivery_company_unavailable';
  end if;

  -- create_order locks offers, deducts stock, and the item trigger creates suborders.
  order_id := public.create_order(
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

  for merchant_row in
    select mo.id, mo.store_id
    from public.merchant_orders mo
    where mo.order_id = order_id
    order by mo.store_id
  loop
    select ca.base_fee
    into delivery_fee
    from public.delivery_coverage_areas ca
    where ca.company_id = _delivery_company_id
      and ca.wilaya_id = _wilaya_id
      and ca.is_active is true
      and (
        coalesce(cardinality(ca.communes), 0) = 0
        or trim(_commune) = any(ca.communes)
      )
    order by ca.base_fee asc
    limit 1;

    if not found then
      raise exception 'delivery_area_not_covered';
    end if;

    insert into public.shipments (
      order_id,
      merchant_order_id,
      company_id,
      status,
      delivery_address,
      recipient_name,
      recipient_phone,
      fee,
      notes
    ) values (
      order_id,
      merchant_row.id,
      _delivery_company_id,
      'pending',
      trim(coalesce(_address_line, '')),
      trim(_full_name),
      trim(_phone),
      delivery_fee,
      'المتجر: ' || merchant_row.store_id::text
        || ' — شركة التوصيل: ' || company_row.company_name
        || ' — الهاتف: ' || coalesce(company_row.contact_phone, '')
    )
    returning id into shipment_id;

    if first_shipment_id is null then
      first_shipment_id := shipment_id;
    end if;
  end loop;

  if first_shipment_id is null then
    raise exception 'merchant_orders_not_created';
  end if;

  -- Legacy pointer retained for older screens; new code reads shipments by order_id.
  update public.orders
  set shipment_id = first_shipment_id,
      delivery_method = 'delivery'
  where id = order_id;

  return order_id;
end;
$function$;

revoke all on function public.create_order_with_delivery(
  jsonb, text, integer, text, text, text, text, text, text, uuid
) from public, anon;
grant execute on function public.create_order_with_delivery(
  jsonb, text, integer, text, text, text, text, text, text, uuid
) to authenticated;
