-- Per-store shipping quotes: merchants price delivery after receiving the order;
-- customers approve or decline each store independently.
alter table public.merchant_orders
  add column if not exists shipping_fee integer not null default 0,
  add column if not exists quoted_at timestamptz,
  add column if not exists responded_at timestamptz;

alter table public.merchant_orders
  drop constraint if exists merchant_orders_status_check;
alter table public.merchant_orders
  add constraint merchant_orders_status_check
  check (status = any (array[
    'pending'::text, 'quoted'::text, 'confirmed'::text,
    'shipped'::text, 'delivered'::text, 'cancelled'::text
  ]));

alter table public.merchant_orders
  drop constraint if exists merchant_orders_shipping_fee_check;
alter table public.merchant_orders
  add constraint merchant_orders_shipping_fee_check check (shipping_fee >= 0);

-- COD is the only supported checkout payment method. Existing rows are preserved.
alter table public.orders
  drop constraint if exists orders_payment_method_check;
alter table public.orders
  add constraint orders_payment_method_check check (payment_method = 'cod');

create or replace function public.refresh_parent_order_totals(_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  next_status text;
begin
  select case
    when bool_and(status = 'cancelled') then 'cancelled'
    when bool_and(status in ('delivered', 'cancelled')) then 'delivered'
    when bool_or(status = 'shipped') then 'shipped'
    when bool_or(status in ('confirmed', 'delivered')) then 'confirmed'
    else 'pending'
  end
  into next_status
  from public.merchant_orders
  where order_id = _order_id;

  perform set_config('arownd.internal_aggregate_order_status', 'on', true);

  update public.orders
  set subtotal = coalesce((
        select sum(subtotal) from public.merchant_orders
        where order_id = _order_id and status <> 'cancelled'
      ), 0),
      shipping_fee = coalesce((
        select sum(shipping_fee) from public.merchant_orders
        where order_id = _order_id and status <> 'cancelled'
      ), 0),
      total = coalesce((
        select sum(subtotal + shipping_fee) from public.merchant_orders
        where order_id = _order_id and status <> 'cancelled'
      ), 0),
      status = coalesce(next_status, 'pending')
  where id = _order_id;

  perform set_config('arownd.internal_aggregate_order_status', '', true);
end;
$function$;
revoke all on function public.refresh_parent_order_totals(uuid)
  from public, anon, authenticated;

-- Checkout reserves stock and creates the parent + store suborders, but does
-- not pick a carrier or invent a delivery fee. Each merchant quotes separately.
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
  new_order_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if _delivery_type not in ('home', 'desk') then
    raise exception 'invalid_delivery_type';
  end if;
  if _payment_method is distinct from 'cod' then
    raise exception 'invalid_payment_method';
  end if;
  if _receipt_url is not null or _delivery_company_id is not null then
    raise exception 'unexpected_checkout_payment_or_carrier';
  end if;

  new_order_id := public.create_order(
    _items, _delivery_type, _wilaya_id, _commune, _address_line,
    _full_name, _phone, 'cod', null
  );

  update public.orders
  set delivery_method = case
        when _delivery_type = 'home' then 'delivery'
        else 'store_pickup'
      end,
      shipping_fee = 0,
      total = subtotal,
      shipment_id = null
  where id = new_order_id;

  insert into public.notifications (user_id, type, title, body, data)
  select st.owner_id, 'order', 'طلب شراء جديد',
         'لديك طلب جديد. راجع المنتجات وحدد رسوم التوصيل لإرسال العرض للمشتري.',
         jsonb_build_object(
           'order_id', new_order_id,
           'merchant_order_id', mo.id,
           'url', '/studio/orders/' || new_order_id::text
         )
  from public.merchant_orders mo
  join public.stores st on st.id = mo.store_id
  where mo.order_id = new_order_id
    and st.owner_id is not null;

  return new_order_id;
end;
$function$;

revoke all on function public.create_order_with_delivery(
  jsonb, text, integer, text, text, text, text, text, text, uuid
) from public, anon;
grant execute on function public.create_order_with_delivery(
  jsonb, text, integer, text, text, text, text, text, text, uuid
) to authenticated;

-- The lower-level creator must not remain a public checkout path that accepts
-- payment methods outside the supported COD workflow.
revoke all on function public.create_order(
  jsonb, text, integer, text, text, text, text, text, text
) from public, anon, authenticated;

create or replace function public.merchant_submit_order_quote(
  _merchant_order_id uuid,
  _shipping_fee integer
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
  if _shipping_fee is null or _shipping_fee < 0 or _shipping_fee > 1000000 then
    raise exception 'invalid_shipping_fee';
  end if;

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

  if not public.is_store_owner(mo.store_id)
     and not public.has_role(auth.uid(), 'admin'::public.app_role) then
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
    mo.customer_id, 'order', 'عرض المتجر جاهز للموافقة',
    'قيمة المنتجات: ' || mo.subtotal::text || ' دج، التوصيل: ' ||
      mo.shipping_fee::text || ' دج، الإجمالي: ' ||
      (mo.subtotal + mo.shipping_fee)::text ||
      ' دج. راجع العرض ووافق أو ارفض هذا الطلب.',
    jsonb_build_object(
      'order_id', mo.order_id,
      'merchant_order_id', mo.id,
      'subtotal', mo.subtotal,
      'shipping_fee', mo.shipping_fee,
      'total', mo.subtotal + mo.shipping_fee,
      'url', '/orders/' || mo.order_id::text
    )
  );

  return mo;
end;
$function$;
revoke all on function public.merchant_submit_order_quote(uuid, integer)
  from public, anon;
grant execute on function public.merchant_submit_order_quote(uuid, integer)
  to authenticated;

-- Buyer approval/decline applies to one store only. Stock is restored only
-- for the declined suborder; accepted home-delivery suborders enter the
-- unassigned Arownd shipment queue.
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

    if parent.delivery_type = 'home' then
      insert into public.shipments (
        order_id, merchant_order_id, status, delivery_address,
        recipient_name, recipient_phone, fee, notes
      ) values (
        mo.order_id, mo.id, 'pending', coalesce(parent.address_line, ''),
        parent.full_name, parent.phone, mo.shipping_fee,
        'Awaiting Arownd carrier assignment'
      );
    end if;
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
           then 'وافق المشتري على السعر النهائي. يمكنك متابعة تجهيز الطلب.'
           else 'رفض المشتري عرض السعر؛ تم إلغاء هذا الطلب الفرعي وإرجاع الكمية للمخزون.'
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

-- Arownd assigns an approved carrier only after the buyer accepts the store quote.
create or replace function public.admin_assign_shipment_company(
  _shipment_id uuid,
  _company_id uuid
)
returns public.shipments
language plpgsql
security definer
set search_path = public
as $function$
declare
  shipment_row public.shipments;
  parent_order public.orders;
  company_row public.delivery_companies;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'not_authorized';
  end if;

  select o.* into parent_order
  from public.orders o
  join public.shipments s on s.order_id = o.id
  where s.id = _shipment_id
  for update of o;
  if not found then raise exception 'shipment_not_found'; end if;

  select * into shipment_row
  from public.shipments
  where id = _shipment_id
  for update;
  if shipment_row.status not in ('pending', 'rejected') then
    raise exception 'shipment_not_reassignable';
  end if;

  select * into company_row
  from public.delivery_companies
  where id = _company_id and is_approved is true;
  if not found then raise exception 'delivery_company_unavailable'; end if;

  if not exists (
    select 1
    from public.delivery_coverage_areas ca
    where ca.company_id = _company_id
      and ca.wilaya_id = parent_order.wilaya_id
      and ca.is_active is true
      and (
        coalesce(cardinality(ca.communes), 0) = 0
        or trim(parent_order.commune) = any(ca.communes)
      )
  ) then
    raise exception 'delivery_area_not_covered';
  end if;

  update public.shipments
  set company_id = _company_id,
      status = 'pending',
      updated_at = now()
  where id = _shipment_id
  returning * into shipment_row;

  if company_row.user_id is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      company_row.user_id, 'order', 'طلب توصيل جديد',
      'تم إسناد شحنة جديدة إلى شركتكم. راجعوا بيانات المستلم والعنوان ورسوم التوصيل.',
      jsonb_build_object(
        'shipment_id', shipment_row.id,
        'order_id', shipment_row.order_id,
        'fee', shipment_row.fee
      )
    );
  end if;

  return shipment_row;
end;
$function$;
revoke all on function public.admin_assign_shipment_company(uuid, uuid)
  from public, anon;
grant execute on function public.admin_assign_shipment_company(uuid, uuid)
  to authenticated;

-- Merchants can no longer confirm a purchase directly: they must send a quote,
-- then the customer confirms it. Store-pickup completion remains merchant-owned.
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
  if parent.delivery_type <> 'desk' or mo.status <> 'confirmed' then
    raise exception 'merchant_order_not_ready_for_pickup_completion';
  end if;

  update public.merchant_orders
  set status = 'delivered', updated_at = now()
  where id = _merchant_order_id
  returning * into mo;

  perform public.refresh_parent_order_totals(mo.order_id);
  return mo;
end;
$function$;
revoke all on function public.merchant_update_merchant_order_status(uuid, text)
  from public, anon;
grant execute on function public.merchant_update_merchant_order_status(uuid, text)
  to authenticated;

-- Carrier status changes advance only the matching store suborder.
create or replace function public.sync_merchant_order_from_shipment()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  next_status text;
begin
  if new.status is not distinct from old.status or new.merchant_order_id is null then
    return new;
  end if;

  if new.status in ('picked_up', 'in_transit') then
    next_status := 'shipped';
  elsif new.status = 'delivered' then
    next_status := 'delivered';
  else
    return new;
  end if;

  update public.merchant_orders
  set status = next_status, updated_at = now()
  where id = new.merchant_order_id
    and status in ('confirmed', 'shipped');

  perform public.refresh_parent_order_totals(new.order_id);
  return new;
end;
$function$;
revoke all on function public.sync_merchant_order_from_shipment()
  from public, anon, authenticated;

drop trigger if exists shipments_sync_merchant_order on public.shipments;
create trigger shipments_sync_merchant_order
after update of status on public.shipments
for each row execute function public.sync_merchant_order_from_shipment();
