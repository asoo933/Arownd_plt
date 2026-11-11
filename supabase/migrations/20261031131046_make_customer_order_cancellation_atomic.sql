-- Make every permitted customer cancellation restore stock exactly once.
create or replace function public.guard_order_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  shipment_status text;
begin
  if new.status is not distinct from old.status then return new; end if;
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if public.has_role(auth.uid(), 'admin'::public.app_role) then return new; end if;

  if old.user_id = auth.uid() then
    if old.status = 'pending' and new.status = 'cancelled' then
      if old.shipment_id is not null then
        select status into shipment_status
        from public.shipments
        where id = old.shipment_id and order_id = old.id
        for update;
        if not found then raise exception 'order_shipment_not_found'; end if;
        if shipment_status <> 'pending' then raise exception 'order_already_processing'; end if;
        update public.shipments set status = 'rejected', updated_at = now()
        where id = old.shipment_id and status = 'pending';
      end if;

      update public.store_offers so
      set stock_quantity = so.stock_quantity + item_totals.quantity, is_available = true
      from (
        select offer_id, sum(quantity)::integer as quantity
        from public.order_items
        where order_id = old.id and offer_id is not null
        group by offer_id
      ) item_totals
      where so.id = item_totals.offer_id;
      return new;
    end if;
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

-- Side effects are owned by the trigger, not duplicated in the cancellation RPC.
create or replace function public.cancel_my_order(_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.orders
  set status = 'cancelled'
  where id = _order_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'order_not_cancellable'; end if;
end;
$$;
revoke execute on function public.cancel_my_order(uuid) from public, anon;
grant execute on function public.cancel_my_order(uuid) to authenticated;
