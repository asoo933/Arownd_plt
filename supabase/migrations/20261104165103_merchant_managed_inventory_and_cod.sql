-- The merchant suborder table was added after the original Realtime publication
-- migration. Publish both tables consumed by the buyer's live order timeline.
do $
begin
  alter publication supabase_realtime add table public.merchant_orders;
exception
  when duplicate_object then null;
end
$;

do $
begin
  alter publication supabase_realtime add table public.merchant_order_tracking_events;
exception
  when duplicate_object then null;
end
$;

-- Allow Realtime to deliver tracking events only to the order participants.
-- The existing RPC remains the write path; direct INSERT/UPDATE/DELETE stay revoked.
grant select on public.merchant_order_tracking_events to authenticated;
drop policy if exists merchant_order_tracking_events_read_participants
  on public.merchant_order_tracking_events;
create policy merchant_order_tracking_events_read_participants
  on public.merchant_order_tracking_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.merchant_orders mo
      where mo.id = merchant_order_tracking_events.merchant_order_id
        and (
          mo.customer_id = auth.uid()
          or public.is_store_owner(mo.store_id)
          or public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  );

-- Cover foreign-key lookups identified by the database performance advisor.
create index if not exists checkout_idempotency_order_id_idx
  on public.checkout_idempotency (order_id)
  where order_id is not null;
create index if not exists merchant_order_tracking_events_created_by_idx
  on public.merchant_order_tracking_events (created_by);

-- Separate an offer's merchant visibility choice from stock availability.
-- Restocking/cancelling a reservation must not republish an offer the merchant hid.
alter table public.store_offers
  add column if not exists is_merchant_hidden boolean not null default false;

-- Existing unavailable rows with positive stock were manually hidden.
update public.store_offers
set is_merchant_hidden = true
where is_available = false
  and stock_quantity > 0
  and is_merchant_hidden = false;

create or replace function public.sync_store_offer_availability()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  new.is_merchant_hidden := coalesce(new.is_merchant_hidden, false);
  new.is_available := new.stock_quantity > 0 and not new.is_merchant_hidden;
  return new;
end;
$function$;

drop trigger if exists sync_store_offer_availability on public.store_offers;
create trigger sync_store_offer_availability
before insert or update of stock_quantity, is_merchant_hidden, is_available
on public.store_offers
for each row
execute function public.sync_store_offer_availability();

-- A merchant who fulfills a home-delivery order must be allowed to record COD
-- after delivery when no carrier shipment is assigned. Carrier collections
-- continue to require a delivered shipment and the assigned carrier account.
alter table public.merchant_order_cod_collections
  drop constraint if exists merchant_order_cod_collections_collection_channel_check;
alter table public.merchant_order_cod_collections
  add constraint merchant_order_cod_collections_collection_channel_check
  check (collection_channel in ('carrier', 'store_pickup', 'merchant_delivery'));

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
  has_carrier_shipment boolean := false;
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

    has_carrier_shipment := found and shipment_row.company_id is not null;

    if has_carrier_shipment then
      if shipment_row.status <> 'delivered' then
        raise exception 'shipment_not_delivered';
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
    else
      if mo.status <> 'delivered' then
        raise exception 'merchant_delivery_not_completed';
      end if;

      if not is_admin and not public.is_store_owner(mo.store_id) then
        raise exception 'not_authorized';
      end if;

      channel := 'merchant_delivery';
    end if;
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

  -- Authorization is checked before returning an existing record, so an
  -- unrelated authenticated user cannot probe another order's COD record.
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
      'payment_status', 'paid',
      'collection_channel', channel
    )
  );

  return collection_row;
end;
$function$;

revoke all on function public.collect_merchant_order_cod(uuid)
  from public, anon;
grant execute on function public.collect_merchant_order_cod(uuid)
  to authenticated;
