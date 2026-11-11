-- Use the order's stored currency in COD collection notifications.
create or replace function public.collect_merchant_order_cod(_merchant_order_id uuid)
returns public.merchant_order_cod_collections
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  mo public.merchant_orders;
  parent_order public.orders;
  collection_row public.merchant_order_cod_collections;
  channel text;
  expected_amount integer;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select o.* into parent_order
  from public.orders o join public.merchant_orders x on x.order_id = o.id
  where x.id = _merchant_order_id for update of o;
  if not found then raise exception 'merchant_order_not_found'; end if;
  select * into mo from public.merchant_orders where id = _merchant_order_id for update;
  if not public.is_store_owner(mo.store_id) then raise exception 'not_authorized'; end if;

  expected_amount := mo.subtotal + mo.shipping_fee;
  if expected_amount < 0 then raise exception 'invalid_cod_amount'; end if;
  if mo.status <> 'delivered' then
    if parent_order.delivery_type = 'desk' then
      raise exception 'store_pickup_not_completed';
    else
      raise exception 'merchant_delivery_not_completed';
    end if;
  end if;
  channel := case parent_order.delivery_type
    when 'home' then 'merchant_delivery'
    when 'desk' then 'store_pickup'
    else null
  end;
  if channel is null then raise exception 'unsupported_delivery_type'; end if;

  if mo.payment_status = 'paid' then
    select * into collection_row
    from public.merchant_order_cod_collections
    where merchant_order_id = mo.id;
    if found then return collection_row; end if;
    raise exception 'cod_payment_record_inconsistent';
  end if;

  insert into public.merchant_order_cod_collections(
    merchant_order_id,order_id,amount,collection_channel,collected_by
  ) values (mo.id,mo.order_id,expected_amount,channel,auth.uid())
  returning * into collection_row;

  update public.merchant_orders
  set payment_status = 'paid', paid_amount = expected_amount,
      paid_at = collection_row.collected_at, updated_at = now()
  where id = mo.id;

  insert into public.notifications(user_id,type,title,body,data)
  values (
    mo.customer_id,'order','تم تسجيل الدفع عند الاستلام',
    'تم تسجيل استلام مبلغ ' || expected_amount::text || ' ' || parent_order.currency_code || ' لهذا الطلب.',
    jsonb_build_object('order_id',mo.order_id,'merchant_order_id',mo.id,
      'amount',expected_amount,'currency_code',parent_order.currency_code,
      'payment_status','paid','collection_channel',channel)
  );
  return collection_row;
end;
$function$;