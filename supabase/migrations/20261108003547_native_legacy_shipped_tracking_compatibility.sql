-- Keep the Native merchant tracking workflow compatible with legacy shipped suborders.
create or replace function public.merchant_update_merchant_order_status(
 _merchant_order_id uuid,_status text
)
returns public.merchant_orders
language plpgsql security definer set search_path=public
as $function$
declare
 mo public.merchant_orders;
 parent public.orders;
 shipment_row public.shipments;
begin
 if auth.uid() is null then raise exception 'not_authenticated'; end if;
 if _status is distinct from 'delivered' then raise exception 'merchant_status_transition_forbidden'; end if;
 select o.* into parent from public.orders o join public.merchant_orders x on x.order_id=o.id where x.id=_merchant_order_id for update of o;
 if not found then raise exception 'merchant_order_not_found'; end if;
 select * into mo from public.merchant_orders where id=_merchant_order_id for update;
 if not public.is_store_owner(mo.store_id) and not public.has_role(auth.uid(),'admin'::public.app_role) then raise exception 'not_authorized'; end if;
 if parent.delivery_type not in ('desk','home') or mo.status not in ('confirmed','shipped') then raise exception 'merchant_order_not_ready_for_fulfillment'; end if;
 if parent.delivery_type='home' then
  select * into shipment_row from public.shipments where merchant_order_id=mo.id for update;
  if found and shipment_row.company_id is not null then raise exception 'carrier_managed_order'; end if;
 end if;
 update public.merchant_orders set status='delivered',updated_at=now() where id=_merchant_order_id returning * into mo;
 perform public.refresh_parent_order_totals(mo.order_id);
 return mo;
end;
$function$;
revoke all on function public.merchant_update_merchant_order_status(uuid,text) from public,anon,authenticated;

create or replace function public.merchant_update_order_tracking(
 _merchant_order_id uuid,_status text,_note text default null
)
returns public.merchant_order_tracking_events
language plpgsql security definer set search_path=public
as $function$
declare
 v_order public.merchant_orders;
 parent public.orders;
 shipment_row public.shipments;
 v_last_status text;
 v_expected_status text;
 v_event public.merchant_order_tracking_events;
begin
 if auth.uid() is null then raise exception 'not_authenticated'; end if;
 if _status not in ('preparing','ready_for_dispatch','out_for_delivery','delivered') then raise exception 'invalid_tracking_status'; end if;
 if _note is not null and length(_note)>500 then raise exception 'tracking_note_too_long'; end if;
 select o.* into parent from public.orders o join public.merchant_orders x on x.order_id=o.id where x.id=_merchant_order_id for update of o;
 if not found then raise exception 'merchant_order_not_found'; end if;
 select * into v_order from public.merchant_orders where id=_merchant_order_id for update;
 if not public.is_store_owner(v_order.store_id) and not public.has_role(auth.uid(),'admin'::public.app_role) then raise exception 'not_authorized'; end if;
 if v_order.status not in ('confirmed','shipped') then raise exception 'merchant_order_not_ready_for_tracking'; end if;
 if parent.delivery_type='home' then
  select * into shipment_row from public.shipments where merchant_order_id=_merchant_order_id for update;
  if found and shipment_row.company_id is not null then raise exception 'carrier_managed_order'; end if;
 elsif parent.delivery_type<>'desk' then raise exception 'unsupported_delivery_type'; end if;
 select status into v_last_status from public.merchant_order_tracking_events where merchant_order_id=_merchant_order_id order by created_at desc,id desc limit 1;
 if v_last_status is null and v_order.status='shipped' then
  v_last_status:=case when parent.delivery_type='desk' then 'ready_for_dispatch' else 'out_for_delivery' end;
 end if;
 v_expected_status:=case coalesce(v_last_status,'confirmed')
  when 'confirmed' then 'preparing'
  when 'preparing' then 'ready_for_dispatch'
  when 'ready_for_dispatch' then case when parent.delivery_type='desk' then 'delivered' else 'out_for_delivery' end
  when 'out_for_delivery' then 'delivered'
  else null end;
 if _status is distinct from v_expected_status then raise exception 'invalid_tracking_transition'; end if;
 if _status='delivered' then perform public.merchant_update_merchant_order_status(_merchant_order_id,'delivered'); end if;
 insert into public.merchant_order_tracking_events(merchant_order_id,status,note,created_by)
 values(_merchant_order_id,_status,nullif(trim(_note),''),auth.uid()) returning * into v_event;
 return v_event;
end;
$function$;
revoke all on function public.merchant_update_order_tracking(uuid,text,text) from public,anon;
grant execute on function public.merchant_update_order_tracking(uuid,text,text) to authenticated;
