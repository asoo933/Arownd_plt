begin;

create or replace function public.merchant_submit_order_quote(
  _merchant_order_id uuid,
  _shipping_fee integer
)
returns public.merchant_orders
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  mo public.merchant_orders;
  parent public.orders;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if _shipping_fee is null or _shipping_fee < 0 or _shipping_fee > 1000000 then
    raise exception 'invalid_shipping_fee';
  end if;

  select o.* into parent
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

  -- The platform admin role was removed from app_role.
  -- Only the owner of the merchant store may submit this quote.
  if not public.is_store_owner(mo.store_id) then
    raise exception 'not_authorized';
  end if;

  if parent.status = 'cancelled' or mo.status <> 'pending' then
    raise exception 'quote_not_available';
  end if;

  if parent.delivery_type = 'desk' and _shipping_fee <> 0 then
    raise exception 'pickup_shipping_must_be_free';
  end if;

  update public.merchant_orders
  set shipping_fee = _shipping_fee,
      status = 'quoted',
      quoted_at = now(),
      updated_at = now()
  where id = _merchant_order_id
  returning * into mo;

  perform public.refresh_parent_order_totals(mo.order_id);

  insert into public.notifications (user_id, type, title, body, data)
  values (
    mo.customer_id,
    'order',
    'عرض المتجر جاهز للموافقة',
    'قيمة المنتجات: ' || mo.subtotal::text || ' ' || parent.currency_code ||
      '، التوصيل: ' || mo.shipping_fee::text || ' ' || parent.currency_code ||
      '، الإجمالي: ' || (mo.subtotal + mo.shipping_fee)::text || ' ' ||
      parent.currency_code || '. راجع العرض ووافق أو ارفض هذا الطلب.',
    jsonb_build_object(
      'order_id', mo.order_id,
      'merchant_order_id', mo.id,
      'subtotal', mo.subtotal,
      'shipping_fee', mo.shipping_fee,
      'total', mo.subtotal + mo.shipping_fee,
      'currency_code', parent.currency_code,
      'url', '/orders/' || mo.order_id::text
    )
  );

  return mo;
end;
$function$;

commit;