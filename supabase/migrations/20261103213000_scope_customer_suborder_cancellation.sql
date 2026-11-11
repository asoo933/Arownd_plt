-- Keep the RPC callable by signed-in buyers while moving privileged writes
-- out of the exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.cancel_my_merchant_order(_merchant_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  mo public.merchant_orders;
  parent_order_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select mo.order_id into parent_order_id
  from public.merchant_orders mo
  join public.orders o on o.id = mo.order_id
  where mo.id = _merchant_order_id
    and mo.customer_id = auth.uid()
  for update of o;

  if not found then
    raise exception 'merchant_order_not_found';
  end if;

  select * into mo
  from public.merchant_orders
  where id = _merchant_order_id
    and customer_id = auth.uid()
  for update;

  if not found then
    raise exception 'merchant_order_not_found';
  end if;

  if mo.status <> 'pending' or mo.quoted_at is not null then
    raise exception 'merchant_order_not_cancellable';
  end if;

  update public.merchant_orders
  set status = 'cancelled',
      responded_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = mo.id;

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
  select st.owner_id, 'order', 'ألغى المشتري طلبه',
         'ألغى المشتري طلب هذا المتجر قبل إرسال عرض السعر.',
         pg_catalog.jsonb_build_object(
           'order_id', mo.order_id,
           'merchant_order_id', mo.id,
           'status', 'cancelled'
         )
  from public.stores st
  where st.id = mo.store_id
    and st.owner_id is not null;
end;
$function$;

revoke all on function private.cancel_my_merchant_order(uuid) from public, anon;
grant execute on function private.cancel_my_merchant_order(uuid) to authenticated;

create or replace function public.cancel_my_merchant_order(_merchant_order_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $function$
  select private.cancel_my_merchant_order(_merchant_order_id);
$function$;

revoke all on function public.cancel_my_merchant_order(uuid) from public, anon;
grant execute on function public.cancel_my_merchant_order(uuid) to authenticated;