-- Enforce safe status transitions for orders containing multiple stores.
create or replace function public.guard_order_status_transition()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  shipment_status text;
  actor_is_admin boolean := false;
  actor_is_customer boolean := false;
  actor_is_merchant boolean := false;
begin
  if new.status is not distinct from old.status then return new; end if;
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  actor_is_admin := public.has_role(auth.uid(), 'admin'::public.app_role);
  actor_is_customer := old.user_id = auth.uid();
  actor_is_merchant := public.is_order_merchant(old.id);

  if not actor_is_admin then
    if actor_is_customer then
      if not (old.status = 'pending' and new.status = 'cancelled') then
        raise exception 'customer_order_transition_forbidden';
      end if;
    elsif actor_is_merchant then
      if exists (
        select 1 from public.order_items oi
        where oi.order_id = old.id
          and not public.is_store_owner(oi.store_id)
      ) then
        raise exception 'multi_store_order_requires_admin_or_delivery_workflow';
      end if;

      if not (
        (old.status = 'pending' and new.status = 'confirmed')
        or (old.status = 'confirmed' and new.status = 'shipped')
        or (old.status = 'shipped' and new.status = 'delivered')
      ) then
        raise exception 'merchant_order_transition_forbidden';
      end if;
    else
      raise exception 'not_authorized';
    end if;
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
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
  end if;

  return new;
end;
$$;
