-- Create the order and its home-delivery shipment in one transaction.
-- The company approval and coverage are revalidated server-side; the client preflight is not trusted.

create or replace function public.create_order_with_delivery(
  _items jsonb,
  _delivery_type text,
  _wilaya_id integer,
  _commune text,
  _address_line text,
  _full_name text,
  _phone text,
  _payment_method text,
  _receipt_url text default null,
  _delivery_company_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $function$
declare
  company_row record;
  delivery_fee numeric;
  order_id uuid;
  shipment_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if _delivery_type is distinct from 'home' then
    raise exception 'invalid_delivery_type';
  end if;

  if _delivery_company_id is null then
    raise exception 'delivery_company_required';
  end if;

  select dc.company_name, dc.contact_phone
  into company_row
  from public.delivery_companies dc
  where dc.id = _delivery_company_id
    and dc.is_approved is true;

  if not found then
    raise exception 'delivery_company_unavailable';
  end if;

  select ca.base_fee
  into delivery_fee
  from public.delivery_coverage_areas ca
  where ca.company_id = _delivery_company_id
    and ca.wilaya_id = _wilaya_id
    and ca.is_active is true
    and (
      coalesce(cardinality(ca.communes), 0) = 0
      or trim(_commune) = any(ca.communes)
    )
  order by ca.base_fee asc
  limit 1;

  if not found then
    raise exception 'delivery_area_not_covered';
  end if;

  -- create_order locks offers and reserves stock; any later failure rolls it all back.
  order_id := public.create_order(
    _items,
    _delivery_type,
    _wilaya_id,
    _commune,
    _address_line,
    _full_name,
    _phone,
    _payment_method,
    _receipt_url
  );

  insert into public.shipments (
    order_id,
    company_id,
    status,
    delivery_address,
    recipient_name,
    recipient_phone,
    fee,
    notes
  ) values (
    order_id,
    _delivery_company_id,
    'pending',
    trim(coalesce(_address_line, '')),
    trim(_full_name),
    trim(_phone),
    delivery_fee,
    'شركة التوصيل: ' || company_row.company_name
      || ' — الهاتف: ' || coalesce(company_row.contact_phone, '')
  )
  returning id into shipment_id;

  perform public.link_order_shipment(order_id, shipment_id, 'delivery');

  return order_id;
end;
$function$;

revoke all on function public.create_order_with_delivery(
  jsonb, text, integer, text, text, text, text, text, text, uuid
) from public, anon;
grant execute on function public.create_order_with_delivery(
  jsonb, text, integer, text, text, text, text, text, text, uuid
) to authenticated;
