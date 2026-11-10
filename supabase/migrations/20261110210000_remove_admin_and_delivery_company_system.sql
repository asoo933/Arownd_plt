-- Remove the legacy Delivery Company and platform Admin systems while preserving
-- customer/merchant accounts, orders, merchant-managed fulfillment, COD and support.
begin;

-- Remove every privileged policy before removing the authorization helpers/types.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname in ('public','storage')
      and (
        coalesce(qual,'') ilike '%is_platform_admin%'
        or coalesce(with_check,'') ilike '%is_platform_admin%'
        or coalesce(qual,'') ilike '%has_role(%'
        or coalesce(with_check,'') ilike '%has_role(%'
        or coalesce(qual,'') ilike '%delivery_companies%'
        or coalesce(with_check,'') ilike '%delivery_companies%'
        or coalesce(qual,'') ilike '%delivery_coverage_areas%'
        or coalesce(with_check,'') ilike '%delivery_coverage_areas%'
      )
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Rebuild the two enums without the retired roles/account type.
drop function if exists public.has_role(uuid, public.app_role);
drop function if exists public.get_my_account_type();

alter table public.user_roles drop constraint if exists user_roles_no_admin_role;
delete from public.user_roles where role::text in ('admin','delivery_company');
update public.profiles set account_type = 'personal' where account_type::text = 'delivery_company';
alter table public.profiles alter column account_type drop default;

alter type public.app_role rename to app_role_legacy;
create type public.app_role as enum ('customer','merchant');
alter table public.user_roles
  alter column role type public.app_role
  using role::text::public.app_role;
drop type public.app_role_legacy;

alter type public.account_type rename to account_type_legacy;
create type public.account_type as enum ('personal','merchant');
alter table public.profiles
  alter column account_type type public.account_type
  using account_type::text::public.account_type;
drop type public.account_type_legacy;
alter table public.profiles alter column account_type set default 'personal'::public.account_type;

create function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and _user_id = auth.uid()
    and exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.role = _role
    );
$function$;

create function public.get_my_account_type()
returns public.account_type
language sql
stable
set search_path = ''
as $function$
  select p.account_type
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1;
$function$;

-- Merchant account conversion and store creation no longer reference carriers.
create or replace function public.become_merchant()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_type public.account_type;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select p.account_type into current_type
  from public.profiles p where p.user_id = auth.uid() for update;
  if not found then raise exception 'profile_not_found'; end if;

  update public.profiles
  set account_type = 'merchant'::public.account_type
  where user_id = auth.uid();

  insert into public.user_roles (user_id, role)
  select auth.uid(), 'merchant'::public.app_role
  where not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'merchant'::public.app_role
  );
end;
$function$;

create or replace function public.create_my_store(
  _store_name text, _slug text, _phone text, _whatsapp text,
  _wilaya_id integer, _commune text, _address_line text,
  _latitude double precision, _longitude double precision,
  _opening_hours jsonb, _category text default null,
  _subcategories text[] default '{}'::text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_type public.account_type;
  created_store_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if nullif(btrim(_store_name), '') is null
     or nullif(btrim(_slug), '') is null
     or _wilaya_id is null
     or _opening_hours is null
     or jsonb_typeof(_opening_hours) <> 'object'
     or nullif(_opening_hours ->> 'open', '') is null
     or nullif(_opening_hours ->> 'close', '') is null then
    raise exception 'invalid_store_input';
  end if;
  if _category is not null and not exists (
    select 1 from public.categories c
    where c.id = _category and c.parent_id is null and c.is_active = true
  ) then raise exception 'invalid_store_category'; end if;
  if exists (
    select 1 from unnest(coalesce(_subcategories, '{}'::text[])) selected(id)
    where not exists (
      select 1 from public.categories c
      where c.id = selected.id and c.parent_id = _category and c.is_active = true
    )
  ) then raise exception 'invalid_store_subcategory'; end if;

  select p.account_type into current_type
  from public.profiles p where p.user_id = auth.uid() for update;
  if not found then raise exception 'profile_not_found'; end if;
  if exists (select 1 from public.stores s where s.owner_id = auth.uid()) then
    raise exception 'store_already_exists';
  end if;

  update public.profiles set account_type = 'merchant'::public.account_type
  where user_id = auth.uid();
  insert into public.user_roles (user_id, role)
  select auth.uid(), 'merchant'::public.app_role
  where not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'merchant'::public.app_role
  );

  insert into public.stores (
    owner_id, name, slug, phone, whatsapp, wilaya_id, commune,
    address_line, latitude, longitude, opening_hours, category, subcategories
  ) values (
    auth.uid(), btrim(_store_name), btrim(_slug), nullif(btrim(_phone), ''),
    nullif(btrim(_whatsapp), ''), _wilaya_id, nullif(btrim(_commune), ''),
    nullif(btrim(_address_line), ''), _latitude, _longitude, _opening_hours,
    nullif(btrim(_category), ''), coalesce(_subcategories, '{}'::text[])
  ) returning id into created_store_id;
  return created_store_id;
end;
$function$;

-- Remove Admin bypass from order status transitions; customers can cancel
-- their own pending order and merchants use the guarded suborder RPCs.
create or replace function public.guard_order_status_transition()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  actor_is_customer boolean := false;
  actor_is_merchant boolean := false;
begin
  if new.status is not distinct from old.status then return new; end if;
  if current_setting('arownd.internal_aggregate_order_status', true) = 'on' then
    return new;
  end if;
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  actor_is_customer := old.user_id = auth.uid();
  actor_is_merchant := public.is_order_merchant(old.id);
  if actor_is_customer then
    if not (old.status = 'pending' and new.status = 'cancelled') then
      raise exception 'customer_order_transition_forbidden';
    end if;
    if exists (
      select 1 from public.merchant_orders mo
      where mo.order_id = old.id and mo.status <> 'pending'
    ) then raise exception 'order_already_processing'; end if;
  elsif actor_is_merchant then
    raise exception 'merchant_order_status_requires_suborder_rpc';
  else
    raise exception 'not_authorized';
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    perform 1 from public.shipments where order_id = old.id for update;
    if exists (
      select 1 from public.shipments
      where order_id = old.id and status not in ('pending','rejected')
    ) then raise exception 'order_already_processing'; end if;

    update public.shipments
    set status = 'rejected', updated_at = now()
    where order_id = old.id and status = 'pending';

    update public.merchant_orders
    set status = 'cancelled', updated_at = now()
    where order_id = old.id and status <> 'cancelled';

    update public.store_offers so
    set stock_quantity = so.stock_quantity + item_totals.quantity,
        is_available = true
    from (
      select offer_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = old.id and offer_id is not null
      group by offer_id
    ) item_totals
    where so.id = item_totals.offer_id;
  end if;
  return new;
end;
$function$;

-- Keep customer/merchant order timeline and COD, without carrier authorization.
create or replace function public.fetch_merchant_order_tracking(_merchant_order_id uuid)
returns setof public.merchant_order_tracking_events
language plpgsql
security definer
set search_path = 'public'
as $function$
declare v_order public.merchant_orders;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_order from public.merchant_orders where id = _merchant_order_id;
  if not found then raise exception 'merchant_order_not_found'; end if;
  if v_order.customer_id <> auth.uid()
     and not public.is_store_owner(v_order.store_id) then
    raise exception 'not_authorized';
  end if;
  return query
    select e.* from public.merchant_order_tracking_events e
    where e.merchant_order_id = _merchant_order_id
    order by e.created_at asc, e.id asc;
end;
$function$;

create or replace function public.merchant_reject_order(_merchant_order_id uuid, _reason text default null)
returns public.merchant_orders
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  mo public.merchant_orders;
  parent_order public.orders;
  safe_reason text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select o.* into parent_order
  from public.orders o join public.merchant_orders x on x.order_id = o.id
  where x.id = _merchant_order_id for update of o;
  if not found then raise exception 'merchant_order_not_found'; end if;
  select * into mo from public.merchant_orders where id = _merchant_order_id for update;
  if not public.is_store_owner(mo.store_id) then raise exception 'not_authorized'; end if;
  if parent_order.status = 'cancelled' then raise exception 'parent_order_cancelled'; end if;
  if mo.status <> 'pending' or mo.quoted_at is not null then
    raise exception 'merchant_rejection_not_available';
  end if;

  safe_reason := left(coalesce(nullif(btrim(_reason), ''),
    'المتجر غير قادر على توفير المنتجات'), 500);
  update public.merchant_orders
  set status = 'cancelled', responded_at = now(), updated_at = now()
  where id = _merchant_order_id returning * into mo;

  update public.store_offers so
  set stock_quantity = so.stock_quantity + item_totals.quantity, is_available = true
  from (
    select offer_id, sum(quantity)::integer as quantity
    from public.order_items
    where merchant_order_id = mo.id and offer_id is not null
    group by offer_id
  ) item_totals
  where so.id = item_totals.offer_id;

  perform public.refresh_parent_order_totals(mo.order_id);
  insert into public.notifications (user_id, type, title, body, data)
  values (
    mo.customer_id, 'order', 'تعذر توفير طلب أحد المتاجر',
    'ألغى المتجر هذا الطلب قبل إرسال عرض السعر. السبب: ' || safe_reason,
    jsonb_build_object('order_id', mo.order_id, 'merchant_order_id', mo.id,
      'status', 'cancelled', 'reason', safe_reason)
  );
  return mo;
end;
$function$;

create or replace function public.merchant_submit_order_quote(_merchant_order_id uuid, _shipping_fee integer)
returns public.merchant_orders
language plpgsql
security definer
set search_path = 'public'
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
  from public.orders o join public.merchant_orders x on x.order_id = o.id
  where x.id = _merchant_order_id for update of o;
  if not found then raise exception 'merchant_order_not_found'; end if;
  select * into mo from public.merchant_orders where id = _merchant_order_id for update;
  if not public.is_store_owner(mo.store_id) then raise exception 'not_authorized'; end if;
  if parent.status = 'cancelled' or mo.status <> 'pending' then
    raise exception 'quote_not_available';
  end if;
  if parent.delivery_type = 'desk' and _shipping_fee <> 0 then
    raise exception 'pickup_shipping_must_be_free';
  end if;

  update public.merchant_orders
  set shipping_fee = _shipping_fee, status = 'quoted', quoted_at = now(), updated_at = now()
  where id = _merchant_order_id returning * into mo;
  perform public.refresh_parent_order_totals(mo.order_id);
  insert into public.notifications (user_id, type, title, body, data)
  values (
    mo.customer_id, 'order', 'عرض المتجر جاهز للموافقة',
    'قيمة المنتجات: ' || mo.subtotal::text || ' دج، التوصيل: ' ||
      mo.shipping_fee::text || ' دج، الإجمالي: ' ||
      (mo.subtotal + mo.shipping_fee)::text ||
      ' دج. راجع العرض ووافق أو ارفض هذا الطلب.',
    jsonb_build_object('order_id', mo.order_id, 'merchant_order_id', mo.id,
      'subtotal', mo.subtotal, 'shipping_fee', mo.shipping_fee,
      'total', mo.subtotal + mo.shipping_fee, 'url', '/orders/' || mo.order_id::text)
  );
  return mo;
end;
$function$;

create or replace function public.merchant_update_merchant_order_status(
  _merchant_order_id uuid, _status text
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
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if _status is distinct from 'delivered' then
    raise exception 'merchant_status_transition_forbidden';
  end if;
  select o.* into parent
  from public.orders o join public.merchant_orders x on x.order_id = o.id
  where x.id = _merchant_order_id for update of o;
  if not found then raise exception 'merchant_order_not_found'; end if;
  select * into mo from public.merchant_orders where id = _merchant_order_id for update;
  if not public.is_store_owner(mo.store_id) then raise exception 'not_authorized'; end if;
  if parent.delivery_type not in ('desk','home')
     or mo.status not in ('confirmed','shipped') then
    raise exception 'merchant_order_not_ready_for_fulfillment';
  end if;
  update public.merchant_orders
  set status = 'delivered', updated_at = now()
  where id = _merchant_order_id returning * into mo;
  perform public.refresh_parent_order_totals(mo.order_id);
  return mo;
end;
$function$;

revoke all on function public.merchant_update_merchant_order_status(uuid,text)
  from public, anon, authenticated;

create or replace function public.merchant_update_order_tracking(
  _merchant_order_id uuid, _status text, _note text default null
)
returns public.merchant_order_tracking_events
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_order public.merchant_orders;
  parent public.orders;
  v_last_status text;
  v_expected_status text;
  v_event public.merchant_order_tracking_events;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if _status not in ('preparing','ready_for_dispatch','out_for_delivery','delivered') then
    raise exception 'invalid_tracking_status';
  end if;
  if _note is not null and length(_note) > 500 then
    raise exception 'tracking_note_too_long';
  end if;

  select o.* into parent
  from public.orders o join public.merchant_orders x on x.order_id = o.id
  where x.id = _merchant_order_id for update of o;
  if not found then raise exception 'merchant_order_not_found'; end if;
  select * into v_order from public.merchant_orders where id = _merchant_order_id for update;
  if not public.is_store_owner(v_order.store_id) then raise exception 'not_authorized'; end if;
  if v_order.status not in ('confirmed','shipped') then
    raise exception 'merchant_order_not_ready_for_tracking';
  end if;
  if parent.delivery_type not in ('home','desk') then
    raise exception 'unsupported_delivery_type';
  end if;

  select status into v_last_status
  from public.merchant_order_tracking_events
  where merchant_order_id = _merchant_order_id
  order by created_at desc, id desc limit 1;
  if v_last_status is null and v_order.status = 'shipped' then
    v_last_status := case when parent.delivery_type = 'desk'
      then 'ready_for_dispatch' else 'out_for_delivery' end;
  end if;

  v_expected_status := case coalesce(v_last_status,'confirmed')
    when 'confirmed' then 'preparing'
    when 'preparing' then 'ready_for_dispatch'
    when 'ready_for_dispatch' then
      case when parent.delivery_type = 'desk' then 'delivered' else 'out_for_delivery' end
    when 'out_for_delivery' then 'delivered'
    else null
  end;
  if _status is distinct from v_expected_status then
    raise exception 'invalid_tracking_transition';
  end if;
  if _status = 'delivered' then
    perform public.merchant_update_merchant_order_status(_merchant_order_id,'delivered');
  end if;
  insert into public.merchant_order_tracking_events(
    merchant_order_id,status,note,created_by
  ) values (
    _merchant_order_id,_status,nullif(trim(_note),''),auth.uid()
  ) returning * into v_event;
  return v_event;
end;
$function$;

revoke all on function public.merchant_update_order_tracking(uuid,text,text)
  from public, anon;
grant execute on function public.merchant_update_order_tracking(uuid,text,text)
  to authenticated;

-- COD collection now belongs only to the merchant for home delivery or pickup.
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
    raise exception case when parent_order.delivery_type = 'desk'
      then 'store_pickup_not_completed' else 'merchant_delivery_not_completed' end;
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
    'تم تسجيل استلام مبلغ ' || expected_amount::text || ' دج لهذا الطلب.',
    jsonb_build_object('order_id',mo.order_id,'merchant_order_id',mo.id,
      'amount',expected_amount,'payment_status','paid','collection_channel',channel)
  );
  return collection_row;
end;
$function$;

-- The current Android checkout contract no longer accepts a carrier identifier.
drop function if exists public.create_order_with_delivery(
  jsonb,text,integer,text,text,text,text,text,text,uuid,uuid
);
drop function if exists public.create_order_with_delivery_unkeyed(
  jsonb,text,integer,text,text,text,text,text,text,uuid
);

create function public.create_order_with_delivery(
  _items jsonb,
  _delivery_type text,
  _wilaya_id integer,
  _commune text,
  _address_line text,
  _full_name text,
  _phone text,
  _payment_method text,
  _receipt_url text default null,
  _idempotency_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $function$
declare
  current_user_id uuid := auth.uid();
  normalized_hash text;
  previous_hash text;
  previous_order_id uuid;
  created_order_id uuid;
begin
  if current_user_id is null then raise exception 'not_authenticated'; end if;
  if _idempotency_key is null then raise exception 'idempotency_key_required'; end if;
  if _delivery_type is null or _delivery_type not in ('home','desk') then
    raise exception 'invalid_delivery_type';
  end if;
  if coalesce(length(trim(_address_line)),0) = 0 then
    raise exception 'delivery_address_required';
  end if;

  normalized_hash := md5(jsonb_build_object(
    'items',_items,'delivery_type',_delivery_type,'wilaya_id',_wilaya_id,
    'commune',_commune,'address_line',_address_line,'full_name',_full_name,
    'phone',_phone,'payment_method',_payment_method,'receipt_url',_receipt_url
  )::text);

  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text || ':' || _idempotency_key::text,0)
  );
  select request_hash,order_id into previous_hash,previous_order_id
  from public.checkout_idempotency
  where user_id = current_user_id and idempotency_key = _idempotency_key;
  if found then
    if previous_hash <> normalized_hash then
      raise exception 'idempotency_key_reused_with_different_request';
    end if;
    if previous_order_id is null then
      raise exception 'idempotent_order_no_longer_available';
    end if;
    return previous_order_id;
  end if;

  created_order_id := public.create_order(
    _items,_delivery_type,_wilaya_id,_commune,_address_line,
    _full_name,_phone,_payment_method,_receipt_url
  );
  insert into public.checkout_idempotency(user_id,idempotency_key,request_hash,order_id)
  values(current_user_id,_idempotency_key,normalized_hash,created_order_id);
  return created_order_id;
end;
$function$;
revoke all on function public.create_order_with_delivery(
  jsonb,text,integer,text,text,text,text,text,text,uuid
) from public, anon;
grant execute on function public.create_order_with_delivery(
  jsonb,text,integer,text,text,text,text,text,text,uuid
) to authenticated;

-- Support remains customer-facing. Staff replies are inserted from the
-- Supabase Dashboard/service role with sender_role='support'; the trigger
-- still creates the customer's in-app notification.
update public.support_messages set sender_role = 'support' where sender_role = 'admin';
alter table public.support_messages drop constraint if exists support_messages_sender_role_check;
alter table public.support_messages
  add constraint support_messages_sender_role_check
  check (sender_role = any (array['customer'::text,'support'::text]));

create or replace function public.handle_support_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare v_conversation_user_id uuid;
begin
  update public.support_conversations
  set last_message_at = new.created_at, updated_at = now()
  where id = new.conversation_id
  returning user_id into v_conversation_user_id;

  if new.sender_role = 'support' then
    insert into public.notifications(user_id,type,title,body,data)
    values (
      v_conversation_user_id,'system','رد جديد من دعم Arownd',left(new.message,180),
      jsonb_build_object('kind','support_reply','conversation_id',new.conversation_id,
        'message_id',new.id,'url','/support/' || new.conversation_id::text)
    );
  end if;
  return new;
end;
$function$;

create policy "Merchants add products" on public.products
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.has_role((select auth.uid()), 'merchant'::public.app_role)
  );
create policy "Merchants create own store" on public.stores
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.has_role((select auth.uid()), 'merchant'::public.app_role)
    and is_verified = true
  );
create policy "merchant_order_tracking_events_read_participants"
  on public.merchant_order_tracking_events for select to authenticated
  using (
    exists (
      select 1 from public.merchant_orders mo
      where mo.id = merchant_order_tracking_events.merchant_order_id
        and (mo.customer_id = (select auth.uid()) or public.is_store_owner(mo.store_id))
    )
  );

create policy "Customers read own support conversations"
  on public.support_conversations for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Customers read own support messages"
  on public.support_messages for select to authenticated
  using (
    exists (
      select 1 from public.support_conversations c
      where c.id = support_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );
create policy "Customers send own support messages"
  on public.support_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and sender_role = 'customer'
    and exists (
      select 1 from public.support_conversations c
      where c.id = support_messages.conversation_id
        and c.user_id = (select auth.uid())
        and c.status = 'open'
    )
  );

-- Carrier-specific authorization and RPCs are removed; customer/merchant
-- shipment reads and the merchant tracking timeline remain.
drop policy if exists "Delivery companies read own shipments" on public.shipments;
drop policy if exists "Platform admins read all shipments" on public.shipments;
drop policy if exists "Platform admins read all shipment status logs" on public.shipment_status_logs;
drop policy if exists "Order parties read scoped shipment logs" on public.shipment_status_logs;
create policy "Order parties read scoped shipment logs"
  on public.shipment_status_logs for select to authenticated
  using (
    exists (
      select 1
      from public.shipments s
      join public.orders o on o.id = s.order_id
      left join public.merchant_orders mo on mo.id = s.merchant_order_id
      where s.id = shipment_status_logs.shipment_id
        and (
          o.user_id = (select auth.uid())
          or (mo.id is not null and public.is_store_owner(mo.store_id))
        )
    )
  );

drop policy if exists "merchant_order_cod_collections_read_assigned_carrier"
  on public.merchant_order_cod_collections;
alter table public.merchant_order_cod_collections
  drop constraint if exists merchant_order_cod_collections_collection_channel_check;
alter table public.merchant_order_cod_collections
  add constraint merchant_order_cod_collections_collection_channel_check
  check (collection_channel = any (array['store_pickup'::text,'merchant_delivery'::text]));

drop trigger if exists guard_delivery_company_sensitive_fields on public.delivery_companies;
drop trigger if exists set_delivery_account_type_on_registration on public.delivery_companies;
drop trigger if exists sync_approved_delivery_company_public_directory on public.delivery_companies;
drop trigger if exists guard_shipment_company_assignment on public.shipments;
drop trigger if exists guard_shipment_status_transition on public.shipments;
drop trigger if exists prevent_carrier_assignment_after_merchant_tracking on public.shipments;

drop function if exists public.admin_set_delivery_company_approval(uuid,boolean);
drop function if exists public.merchant_assign_delivery_company(uuid,uuid);
drop function if exists public.guard_delivery_company_sensitive_fields();
drop function if exists public.set_delivery_account_type_on_registration();
drop function if exists public.guard_shipment_company_assignment();
drop function if exists public.guard_shipment_status_transition();
drop function if exists public.prevent_carrier_assignment_after_merchant_tracking();
drop function if exists public.update_shipment_status(uuid,text,text);
drop function if exists private.sync_approved_delivery_company_public_directory();

drop view if exists public.approved_delivery_companies;
drop table if exists private.approved_delivery_companies_public;
drop table if exists public.delivery_coverage_areas;
drop table if exists public.delivery_companies;
drop table if exists public.platform_admin_audit_logs;

alter table public.shipments drop constraint if exists shipments_company_id_fkey;
alter table public.shipments drop column if exists company_id;

drop function if exists public.is_platform_admin();

-- Strip any stale platform-admin claim without changing other auth metadata.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) - 'platform_role'
where raw_app_meta_data ? 'platform_role';

commit;
