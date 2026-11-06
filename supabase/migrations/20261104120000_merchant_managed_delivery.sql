-- Delivery is fulfilled by the merchant by default. No carrier account or
-- shipment assignment is required after the buyer approves the merchant quote.
-- Existing shipment rows and carrier workflows remain available for historical
-- orders, but new home-delivery orders stay under merchant responsibility.

create or replace function public.customer_respond_to_merchant_order(
  _merchant_order_id uuid,
  _accept boolean
)
returns public.merchant_orders
language plpgsql
security definer
set search_path = public
as $function$
declare
  mo public.merchant_orders;
  parent public.orders;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  select o.* into parent
  from public.orders o
  join public.merchant_orders x on x.order_id = o.id
  where x.id = _merchant_order_id
  for update of o;
  if not found then raise exception 'merchant_order_not_found'; end if;

  select * into mo
  from public.merchant_orders
  where id = _merchant_order_id
  for update;

  if mo.customer_id <> auth.uid() then raise exception 'not_authorized'; end if;
  if mo.status <> 'quoted' then raise exception 'quote_response_not_available'; end if;

  if _accept then
    update public.merchant_orders
    set status = 'confirmed', responded_at = now(), updated_at = now()
    where id = _merchant_order_id
    returning * into mo;
  else
    update public.merchant_orders
    set status = 'cancelled', responded_at = now(), updated_at = now()
    where id = _merchant_order_id
    returning * into mo;

    update public.store_offers so
    set stock_quantity = so.stock_quantity + item_totals.quantity,
        is_available = true
    from (
      select offer_id, sum(quantity)::integer as quantity
      from public.order_items
      where merchant_order_id = mo.id and offer_id is not null
      group by offer_id
    ) item_totals
    where so.id = item_totals.offer_id;
  end if;

  perform public.refresh_parent_order_totals(mo.order_id);

  insert into public.notifications (user_id, type, title, body, data)
  select st.owner_id, 'order',
         case when _accept then 'وافق المشتري على عرضك' else 'رفض المشتري عرض المتجر' end,
         case when _accept
           then 'وافق المشتري على عرضك. جهّز الطلب وتولَّ توصيله إلى العميل.'
           else 'رفض المشتري عرض السعر؛ تم إلغاء الطلب الفرعي وإرجاع الكمية للمخزون.'
         end,
         jsonb_build_object('order_id', mo.order_id, 'merchant_order_id', mo.id)
  from public.stores st
  where st.id = mo.store_id and st.owner_id is not null;

  return mo;
end;
$function$;
revoke all on function public.customer_respond_to_merchant_order(uuid, boolean)
  from public, anon;
grant execute on function public.customer_respond_to_merchant_order(uuid, boolean)
  to authenticated;

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
  mo public.merchant_orders;
  parent public.orders;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if _status is distinct from 'delivered' then
    raise exception 'merchant_status_transition_forbidden';
  end if;

  select o.* into parent
  from public.orders o
  join public.merchant_orders x on x.order_id = o.id
  where x.id = _merchant_order_id
  for update of o;
  if not found then raise exception 'merchant_order_not_found'; end if;

  select * into mo from public.merchant_orders
  where id = _merchant_order_id for update;

  if not public.is_store_owner(mo.store_id)
     and not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'not_authorized';
  end if;
  if parent.delivery_type not in ('desk', 'home') or mo.status <> 'confirmed' then
    raise exception 'merchant_order_not_ready_for_completion';
  end if;

  update public.merchant_orders
  set status = 'delivered', updated_at = now()
  where id = _merchant_order_id
  returning * into mo;

  perform public.refresh_parent_order_totals(mo.order_id);

  insert into public.notifications (user_id, type, title, body, data)
  values (
    mo.customer_id, 'order', 'تم تسليم طلبك من المتجر',
    'أكمل المتجر توصيل طلبك. يمكنك مراجعة تفاصيل الطلب من حسابك.',
    jsonb_build_object('order_id', mo.order_id, 'merchant_order_id', mo.id,
                       'url', '/orders/' || mo.order_id::text)
  );

  return mo;
end;
$function$;
revoke all on function public.merchant_update_merchant_order_status(uuid, text)
  from public, anon;
grant execute on function public.merchant_update_merchant_order_status(uuid, text)
  to authenticated;
