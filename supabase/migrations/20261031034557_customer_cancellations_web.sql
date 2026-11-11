-- Safe customer cancellation flows for reservations and orders.
-- Both functions validate ownership and status inside a single transaction.

create or replace function public.cancel_reservation(_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.reservations;
  affected integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into r
  from public.reservations
  where id = _reservation_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'reservation_not_found';
  end if;

  if r.status <> 'pending' then
    raise exception 'reservation_not_cancellable';
  end if;

  update public.reservations
  set status = 'cancelled'
  where id = r.id and status = 'pending';

  if r.offer_id is not null then
    update public.store_offers
    set stock_quantity = stock_quantity + r.quantity,
        is_available = true
    where id = r.offer_id;
    get diagnostics affected = row_count;
    if affected <> 1 then
      raise exception 'reservation_stock_restore_failed';
    end if;
  end if;
end;
$$;

revoke all on function public.cancel_reservation(uuid) from anon, public;
grant execute on function public.cancel_reservation(uuid) to authenticated;

create or replace function public.cancel_my_order(_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
  shipment_status text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into o
  from public.orders
  where id = _order_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if o.status <> 'pending' then
    raise exception 'order_not_cancellable';
  end if;

  if o.shipment_id is not null then
    select status into shipment_status
    from public.shipments
    where id = o.shipment_id and order_id = o.id
    for update;

    if not found then
      raise exception 'order_shipment_not_found';
    end if;

    if shipment_status <> 'pending' then
      raise exception 'order_already_processing';
    end if;

    update public.shipments
    set status = 'rejected', updated_at = now()
    where id = o.shipment_id;
  end if;

  update public.store_offers so
  set stock_quantity = so.stock_quantity + item_totals.quantity,
      is_available = true
  from (
    select offer_id, sum(quantity)::integer as quantity
    from public.order_items
    where order_id = o.id and offer_id is not null
    group by offer_id
  ) as item_totals
  where so.id = item_totals.offer_id;

  update public.orders
  set status = 'cancelled'
  where id = o.id and status = 'pending';
end;
$$;

revoke all on function public.cancel_my_order(uuid) from anon, public;
grant execute on function public.cancel_my_order(uuid) to authenticated;

notify pgrst, 'reload schema';
