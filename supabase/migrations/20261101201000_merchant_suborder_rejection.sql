-- Allow a merchant to decline its own unquoted suborder when stock or fulfilment
-- is unavailable. Restore only the inventory reserved by that suborder.

create or replace function public.merchant_reject_order(
  _merchant_order_id uuid,
  _reason text default null
)
returns public.merchant_orders
language plpgsql
security definer
set search_path = public
as $function$
declare
  mo public.merchant_orders;
  parent_order public.orders;
  safe_reason text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

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

  if not public.is_store_owner(mo.store_id)
     and not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'not_authorized';
  end if;

  -- A quote already sent must be decided by the buyer; do not silently
  -- withdraw or mutate the buyer-facing final price.
  if parent_order.status = 'cancelled' then
    raise exception 'parent_order_cancelled';
  end if;

  if mo.status <> 'pending' or mo.quoted_at is not null then
    raise exception 'merchant_rejection_not_available';
  end if;

  safe_reason := left(
    coalesce(nullif(btrim(_reason), ''), 'المتجر غير قادر على توفير المنتجات'),
    500
  );

  update public.merchant_orders
  set status = 'cancelled',
      responded_at = now(),
      updated_at = now()
  where id = _merchant_order_id
  returning * into mo;

  update public.store_offers so
  set stock_quantity = so.stock_quantity + item_totals.quantity,
      is_available = true
  from (
    select offer_id, sum(quantity)::integer as quantity
    from public.order_items
    where merchant_order_id = mo.id
      and offer_id is not null
    group by offer_id
  ) item_totals
  where so.id = item_totals.offer_id;

  perform public.refresh_parent_order_totals(mo.order_id);

  insert into public.notifications (user_id, type, title, body, data)
  values (
    mo.customer_id,
    'order',
    'تعذر توفير طلب أحد المتاجر',
    'ألغى المتجر هذا الطلب قبل إرسال عرض السعر. السبب: ' || safe_reason,
    jsonb_build_object(
      'order_id', mo.order_id,
      'merchant_order_id', mo.id,
      'status', 'cancelled',
      'reason', safe_reason
    )
  );

  return mo;
end;
$function$;

revoke all on function public.merchant_reject_order(uuid, text)
  from public, anon;
grant execute on function public.merchant_reject_order(uuid, text)
  to authenticated;
