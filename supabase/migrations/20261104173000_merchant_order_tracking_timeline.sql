create table if not exists public.merchant_order_tracking_events (
  id uuid primary key default gen_random_uuid(),
  merchant_order_id uuid not null references public.merchant_orders(id) on delete cascade,
  status text not null check (status in ('preparing','ready_for_dispatch','out_for_delivery','delivered')),
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists merchant_order_tracking_events_order_created_idx
  on public.merchant_order_tracking_events (merchant_order_id, created_at);
alter table public.merchant_order_tracking_events enable row level security;
revoke all on public.merchant_order_tracking_events from anon, authenticated;

create or replace function public.merchant_update_order_tracking(_merchant_order_id uuid, _status text, _note text default null)
returns public.merchant_order_tracking_events language plpgsql security definer set search_path = public
as $function$
declare
  v_order public.merchant_orders;
  v_last_status text;
  v_expected_status text;
  v_event public.merchant_order_tracking_events;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if _status not in ('preparing','ready_for_dispatch','out_for_delivery','delivered') then raise exception 'invalid_tracking_status'; end if;
  if _note is not null and length(_note) > 500 then raise exception 'tracking_note_too_long'; end if;
  select * into v_order from public.merchant_orders where id = _merchant_order_id for update;
  if not found then raise exception 'merchant_order_not_found'; end if;
  if not public.is_store_owner(v_order.store_id) and not public.has_role(auth.uid(), 'admin'::public.app_role) then raise exception 'not_authorized'; end if;
  if v_order.status <> 'confirmed' then raise exception 'merchant_order_not_ready_for_tracking'; end if;
  select status into v_last_status from public.merchant_order_tracking_events
    where merchant_order_id = _merchant_order_id order by created_at desc, id desc limit 1;
  v_expected_status := case coalesce(v_last_status, 'confirmed')
    when 'confirmed' then 'preparing' when 'preparing' then 'ready_for_dispatch'
    when 'ready_for_dispatch' then 'out_for_delivery' when 'out_for_delivery' then 'delivered' else null end;
  if _status is distinct from v_expected_status then raise exception 'invalid_tracking_transition'; end if;
  if _status = 'delivered' then perform public.merchant_update_merchant_order_status(_merchant_order_id, 'delivered'); end if;
  insert into public.merchant_order_tracking_events(merchant_order_id,status,note,created_by)
    values (_merchant_order_id,_status,nullif(trim(_note),''),auth.uid()) returning * into v_event;
  return v_event;
end;
$function$;

create or replace function public.fetch_merchant_order_tracking(_merchant_order_id uuid)
returns setof public.merchant_order_tracking_events language plpgsql security definer set search_path = public
as $function$
declare v_order public.merchant_orders;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_order from public.merchant_orders where id = _merchant_order_id;
  if not found then raise exception 'merchant_order_not_found'; end if;
  if v_order.customer_id <> auth.uid() and not public.is_store_owner(v_order.store_id)
     and not public.has_role(auth.uid(), 'admin'::public.app_role) then raise exception 'not_authorized'; end if;
  return query select e.* from public.merchant_order_tracking_events e
    where e.merchant_order_id = _merchant_order_id order by e.created_at asc,e.id asc;
end;
$function$;
revoke all on function public.merchant_update_order_tracking(uuid,text,text) from public,anon;
grant execute on function public.merchant_update_order_tracking(uuid,text,text) to authenticated;
revoke all on function public.fetch_merchant_order_tracking(uuid) from public,anon;
grant execute on function public.fetch_merchant_order_tracking(uuid) to authenticated;
