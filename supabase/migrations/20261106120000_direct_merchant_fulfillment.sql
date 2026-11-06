-- Direct fulfillment: accepted home-delivery orders are fulfilled by the store
-- unless an existing shipment has already been assigned to an approved carrier.
-- New merchant quotes no longer create an unassigned carrier shipment.

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
  if auth.uid() is null then
    raise exception 'not_authenticated';
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

  if mo.customer_id <> auth.uid() then
    raise exception 'not_authorized';
  end if;
  if mo.status <> 'quoted' then
    raise exception 'quote_response_not_available';
  end if;

  if _accept then
    update public.merchant_orders
    set status = 'confirmed',
        responded_at = now(),
        updated_at = now()
    where id = _merchant_order_id
    returning * into mo;
  else
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
  end if;

  perform public.refresh_parent_order_totals(mo.order_id);

  insert into public.notifications (user_id, type, title, body, data)
  select
    st.owner_id,
    'order',
    case when _accept then 'وافق المشتري على عرضك' else 'رفض المشتري عرض المتجر' end,
    case
      when not _accept then
        'رفض المشتري عرض السعر؛ تم إلغاء هذا الطلب الفرعي وإرجاع الكمية للمخزون.'
      when parent.delivery_type = 'home' then
        'وافق المشتري على السعر النهائي. جهّز الطلب وتولَّ توصيله مباشرة.'
      else
        'وافق المشتري على السعر النهائي. جهّز الطلب وأشعر المشتري عندما يصبح جاهزًا للاستلام من المتجر.'
    end,
    jsonb_build_object(
      'order_id', mo.order_id,
      'merchant_order_id', mo.id
    )
  from public.stores st
  where st.id = mo.store_id
    and st.owner_id is not null;

  return mo;
end;
$function$;

revoke all on function public.customer_respond_to_merchant_order(uuid, boolean)
  from public, anon;
grant execute on function public.customer_respond_to_merchant_order(uuid, boolean)
  to authenticated;


-- The merchant can complete store pickup or direct home delivery.
-- An order assigned to a carrier must remain on the carrier status workflow.
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
  shipment_row public.shipments;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if _status is distinct from 'delivered' then
    raise exception 'merchant_status_transition_forbidden';
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

  if not public.is_store_owner(mo.store_id)
     and not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'not_authorized';
  end if;
  if parent.delivery_type not in ('desk', 'home') or mo.status <> 'confirmed' then
    raise exception 'merchant_order_not_ready_for_fulfillment';
  end if;

  if parent.delivery_type = 'home' then
    select * into shipment_row
    from public.shipments
    where merchant_order_id = mo.id
    for update;

    if found and shipment_row.company_id is not null then
      raise exception 'carrier_managed_order';
    end if;
  end if;

  update public.merchant_orders
  set status = 'delivered',
      updated_at = now()
  where id = _merchant_order_id
  returning * into mo;

  perform public.refresh_parent_order_totals(mo.order_id);
  return mo;
end;
$function$;

-- Status completion must go through the tracking RPC so every handoff
-- has an authenticated, ordered timeline event.
revoke all on function public.merchant_update_merchant_order_status(uuid, text)
  from public, anon, authenticated;


-- Enforce the carrier boundary in the tracking RPC, not only in the UI.
-- Lock parent order before suborder to preserve the checkout/status lock order.
create or replace function public.merchant_update_order_tracking(
  _merchant_order_id uuid,
  _status text,
  _note text default null
)
returns public.merchant_order_tracking_events
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_order public.merchant_orders;
  parent public.orders;
  shipment_row public.shipments;
  v_last_status text;
  v_expected_status text;
  v_event public.merchant_order_tracking_events;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if _status not in ('preparing', 'ready_for_dispatch', 'out_for_delivery', 'delivered') then
    raise exception 'invalid_tracking_status';
  end if;
  if _note is not null and length(_note) > 500 then
    raise exception 'tracking_note_too_long';
  end if;

  select o.* into parent
  from public.orders o
  join public.merchant_orders x on x.order_id = o.id
  where x.id = _merchant_order_id
  for update of o;

  if not found then
    raise exception 'merchant_order_not_found';
  end if;

  select * into v_order
  from public.merchant_orders
  where id = _merchant_order_id
  for update;

  if not public.is_store_owner(v_order.store_id)
     and not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'not_authorized';
  end if;
  if v_order.status <> 'confirmed' then
    raise exception 'merchant_order_not_ready_for_tracking';
  end if;

  if parent.delivery_type = 'home' then
    select * into shipment_row
    from public.shipments
    where merchant_order_id = _merchant_order_id
    for update;

    if found and shipment_row.company_id is not null then
      raise exception 'carrier_managed_order';
    end if;
  elsif parent.delivery_type <> 'desk' then
    raise exception 'unsupported_delivery_type';
  end if;

  select status into v_last_status
  from public.merchant_order_tracking_events
  where merchant_order_id = _merchant_order_id
  order by created_at desc, id desc
  limit 1;

  v_expected_status := case coalesce(v_last_status, 'confirmed')
    when 'confirmed' then 'preparing'
    when 'preparing' then 'ready_for_dispatch'
    when 'ready_for_dispatch' then 'out_for_delivery'
    when 'out_for_delivery' then 'delivered'
    else null
  end;

  if _status is distinct from v_expected_status then
    raise exception 'invalid_tracking_transition';
  end if;

  if _status = 'delivered' then
    perform public.merchant_update_merchant_order_status(_merchant_order_id, 'delivered');
  end if;

  insert into public.merchant_order_tracking_events (
    merchant_order_id,
    status,
    note,
    created_by
  )
  values (
    _merchant_order_id,
    _status,
    nullif(trim(_note), ''),
    auth.uid()
  )
  returning * into v_event;

  return v_event;
end;
$function$;

revoke all on function public.merchant_update_order_tracking(uuid, text, text)
  from public, anon;
grant execute on function public.merchant_update_order_tracking(uuid, text, text)
  to authenticated;

-- Once a merchant starts the direct-fulfillment timeline on a legacy
-- unassigned shipment, prevent a later admin assignment from switching
-- the same order to a carrier halfway through fulfillment.
create or replace function public.prevent_carrier_assignment_after_merchant_tracking()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  company_changed boolean;
begin
  if tg_op = 'INSERT' then
    company_changed := new.company_id is not null;
  else
    company_changed :=
      new.company_id is not null
      and new.company_id is distinct from old.company_id;
  end if;

  if company_changed
     and new.merchant_order_id is not null
     and exists (
       select 1
       from public.merchant_order_tracking_events e
       where e.merchant_order_id = new.merchant_order_id
     ) then
    raise exception 'merchant_fulfillment_already_started';
  end if;

  return new;
end;
$function$;

revoke all on function public.prevent_carrier_assignment_after_merchant_tracking()
  from public, anon, authenticated;

drop trigger if exists prevent_carrier_assignment_after_merchant_tracking
  on public.shipments;
create trigger prevent_carrier_assignment_after_merchant_tracking
before insert or update of company_id on public.shipments
for each row
execute function public.prevent_carrier_assignment_after_merchant_tracking();
