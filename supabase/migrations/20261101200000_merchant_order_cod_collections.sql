-- Track COD collection independently for each merchant suborder.
-- Collection is recorded only after that suborder is delivered.
-- No payment amount is accepted from the client; it is calculated server-side.

alter table public.merchant_orders
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists paid_amount integer,
  add column if not exists paid_at timestamptz;

alter table public.merchant_orders
  drop constraint if exists merchant_orders_payment_status_check;
alter table public.merchant_orders
  add constraint merchant_orders_payment_status_check
  check (
    (payment_status = 'unpaid' and paid_amount is null and paid_at is null)
    or
    (payment_status = 'paid' and paid_amount is not null and paid_amount >= 0 and paid_at is not null)
  );

create table if not exists public.merchant_order_cod_collections (
  id uuid primary key default gen_random_uuid(),
  merchant_order_id uuid not null unique
    references public.merchant_orders(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  amount integer not null check (amount >= 0),
  collection_channel text not null
    check (collection_channel in ('carrier', 'store_pickup')),
  collected_by uuid not null references auth.users(id) on delete restrict,
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists merchant_order_cod_collections_order_id_idx
  on public.merchant_order_cod_collections(order_id);

alter table public.merchant_order_cod_collections enable row level security;
revoke all on public.merchant_order_cod_collections from public, anon, authenticated;
grant select on public.merchant_order_cod_collections to authenticated;

drop policy if exists merchant_order_cod_collections_read_participants
  on public.merchant_order_cod_collections;
create policy merchant_order_cod_collections_read_participants
  on public.merchant_order_cod_collections
  for select to authenticated
  using (
    exists (
      select 1
      from public.merchant_orders mo
      where mo.id = merchant_order_cod_collections.merchant_order_id
        and (
          mo.customer_id = auth.uid()
          or public.is_store_owner(mo.store_id)
          or public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  );

drop policy if exists merchant_order_cod_collections_read_assigned_carrier
  on public.merchant_order_cod_collections;
create policy merchant_order_cod_collections_read_assigned_carrier
  on public.merchant_order_cod_collections
  for select to authenticated
  using (
    exists (
      select 1
      from public.shipments s
      join public.delivery_companies dc on dc.id = s.company_id
      where s.merchant_order_id = merchant_order_cod_collections.merchant_order_id
        and dc.user_id = auth.uid()
    )
  );

create or replace function public.collect_merchant_order_cod(
  _merchant_order_id uuid
)
returns public.merchant_order_cod_collections
language plpgsql
security definer
set search_path = public
as $function$
declare
  mo public.merchant_orders;
  parent_order public.orders;
  shipment_row public.shipments;
  collection_row public.merchant_order_cod_collections;
  channel text;
  expected_amount integer;
  is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  is_admin := public.has_role(auth.uid(), 'admin'::public.app_role);

  select o.* into parent_order
  from public.orders o
  join public.merchant_orders x on x.order_id = o.id
  where x.id = _merchant_order_id
  for update of o;

  if not found then
    raise exception 'merchant_order_not_found';
  end if;

  select * into mo
  from public.merchant_orders
  where id = _merchant_order_id
  for update;

  expected_amount := mo.subtotal + mo.shipping_fee;
  if expected_amount < 0 then
    raise exception 'invalid_cod_amount';
  end if;

  if parent_order.delivery_type = 'home' then
    select * into shipment_row
    from public.shipments
    where merchant_order_id = mo.id
    for update;

    if not found or shipment_row.status <> 'delivered' then
      raise exception 'shipment_not_delivered';
    end if;

    if shipment_row.company_id is null then
      raise exception 'shipment_company_not_assigned';
    end if;

    if not is_admin and not exists (
      select 1
      from public.delivery_companies dc
      where dc.id = shipment_row.company_id
        and dc.user_id = auth.uid()
    ) then
      raise exception 'not_authorized';
    end if;

    channel := 'carrier';
  elsif parent_order.delivery_type = 'desk' then
    if mo.status <> 'delivered' then
      raise exception 'store_pickup_not_completed';
    end if;

    if not is_admin and not public.is_store_owner(mo.store_id) then
      raise exception 'not_authorized';
    end if;

    channel := 'store_pickup';
  else
    raise exception 'unsupported_delivery_type';
  end if;

  -- Authorize the assigned carrier/store owner before returning an existing
  -- record. Otherwise an authenticated user could probe another order's COD row.
  if mo.payment_status = 'paid' then
    select * into collection_row
    from public.merchant_order_cod_collections
    where merchant_order_id = mo.id;
    if found then
      return collection_row;
    end if;
    raise exception 'cod_payment_record_inconsistent';
  end if;

  insert into public.merchant_order_cod_collections (
    merchant_order_id, order_id, amount, collection_channel, collected_by
  ) values (
    mo.id, mo.order_id, expected_amount, channel, auth.uid()
  )
  returning * into collection_row;

  update public.merchant_orders
  set payment_status = 'paid',
      paid_amount = expected_amount,
      paid_at = collection_row.collected_at,
      updated_at = now()
  where id = mo.id;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    mo.customer_id,
    'order',
    'تم تسجيل الدفع عند الاستلام',
    'تم تسجيل استلام مبلغ ' || expected_amount::text || ' دج لهذا الطلب.',
    jsonb_build_object(
      'order_id', mo.order_id,
      'merchant_order_id', mo.id,
      'amount', expected_amount,
      'payment_status', 'paid'
    )
  );

  return collection_row;
end;
$function$;

revoke all on function public.collect_merchant_order_cod(uuid)
  from public, anon;
grant execute on function public.collect_merchant_order_cod(uuid)
  to authenticated;
