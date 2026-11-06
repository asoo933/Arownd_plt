-- Arownd database hardening: delivery privacy, shipment access, wallet integrity.
-- Review and apply through the Supabase migration workflow after CI passes.

-- Fail safely before changing the identity relationship.
do $$
begin
  if exists (
    select 1 from public.delivery_companies dc
    left join auth.users au on au.id = dc.user_id
    where au.id is null
  ) then
    raise exception 'delivery_companies contains user_id values that do not match auth.users.id; reconcile before applying';
  end if;
end $$;

alter table public.delivery_companies
  drop constraint if exists delivery_companies_user_id_fkey;
alter table public.delivery_companies
  add constraint delivery_companies_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- Never expose private delivery-company fields through the base table.
drop policy if exists "العملاء يقرأون الشركات المعتمدة" on public.delivery_companies;
drop policy if exists "الشركات ترى بياناتها الخاصة" on public.delivery_companies;
drop policy if exists "شركة التوصيل تقرأ سجلها" on public.delivery_companies;
drop policy if exists "Admin reads all delivery companies" on public.delivery_companies;
drop policy if exists "admin_read_delivery_companies" on public.delivery_companies;
drop policy if exists "المدراء يقرأون جميع الشركات" on public.delivery_companies;
drop policy if exists "Admin updates delivery companies" on public.delivery_companies;
drop policy if exists "admin_update_delivery_companies" on public.delivery_companies;
drop policy if exists "المدراء يعتمدون الشركات" on public.delivery_companies;
create policy "شركة التوصيل تقرأ سجلها"
  on public.delivery_companies for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::app_role));
create policy "شركة التوصيل تحدث بياناتها"
  on public.delivery_companies for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "المستخدم يسجل شركة توصيله" on public.delivery_companies;
create policy "المستخدم يسجل شركة توصيله"
  on public.delivery_companies for insert to authenticated
  with check (
    user_id = auth.uid()
    and coalesce(is_approved, false) = false
    and coalesce(commission_rate, 0) = 0
  );

-- Authenticated users read their own record (or admins read all via RLS).
revoke all privileges on table public.delivery_companies from anon, authenticated;
revoke all privileges (
  id, user_id, company_name, contact_name, contact_phone, email,
  license_number, is_approved, commission_rate, created_at, updated_at
) on table public.delivery_companies from anon, authenticated;
grant select, insert on table public.delivery_companies to authenticated;

-- Public directory intentionally contains only contact fields meant for discovery.
create or replace view public.approved_delivery_companies
with (security_barrier = true)
as
select id, company_name, contact_phone
from public.delivery_companies
where is_approved is true;
revoke all on public.approved_delivery_companies from public;
grant select on public.approved_delivery_companies to anon, authenticated;

-- Coverage and service discovery must use the safe public view, not the private base table.
drop policy if exists "العملاء يقرأون مناطق التغطية" on public.delivery_coverage_areas;
create policy "العملاء يقرأون مناطق التغطية"
  on public.delivery_coverage_areas for select to anon, authenticated
  using (
    exists (
      select 1 from public.approved_delivery_companies c
      where c.id = company_id
    )
  );
drop policy if exists "العملاء يقرأون خدمات التوصيل" on public.delivery_services;
create policy "العملاء يقرأون خدمات التوصيل"
  on public.delivery_services for select to anon, authenticated
  using (
    exists (
      select 1 from public.approved_delivery_companies c
      where c.id = company_id
    )
  );

-- Owners may edit their profile fields, never approval or platform commission.
grant update (company_name, contact_name, contact_phone, email, license_number, updated_at)
  on public.delivery_companies to authenticated;

create or replace function public.admin_set_delivery_company_approval(
  _company_id uuid,
  _is_approved boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'not_authorized';
  end if;
  update public.delivery_companies
  set is_approved = _is_approved
  where id = _company_id;
  if not found then
    raise exception 'delivery_company_not_found';
  end if;
end;
$function$;
revoke all on function public.admin_set_delivery_company_approval(uuid, boolean) from public, anon;
grant execute on function public.admin_set_delivery_company_approval(uuid, boolean) to authenticated;

-- Shipment histories and GPS coordinates are private to the order parties.
drop policy if exists "سجلات الحالة قابلة للقراءة" on public.shipment_status_logs;
drop policy if exists "Admin reads all shipment logs" on public.shipment_status_logs;
drop policy if exists "أطراف الشحنة تقرأ سجلات الحالة" on public.shipment_status_logs;
create policy "أطراف الشحنة تقرأ سجلات الحالة"
  on public.shipment_status_logs for select to authenticated
  using (
    exists (
      select 1 from public.shipments s
      join public.orders o on o.id = s.order_id
      left join public.delivery_companies dc on dc.id = s.company_id
      where s.id = shipment_status_logs.shipment_id
        and (
          o.user_id = auth.uid()
          or public.is_order_merchant(o.id)
          or dc.user_id = auth.uid()
          or public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

drop policy if exists "نقاط التتبع قابلة للقراءة" on public.shipment_tracking;
drop policy if exists "Admin reads all tracking" on public.shipment_tracking;
drop policy if exists "أطراف الشحنة تقرأ نقاط التتبع" on public.shipment_tracking;
create policy "أطراف الشحنة تقرأ نقاط التتبع"
  on public.shipment_tracking for select to authenticated
  using (
    exists (
      select 1 from public.shipments s
      join public.orders o on o.id = s.order_id
      left join public.delivery_companies dc on dc.id = s.company_id
      where s.id = shipment_tracking.shipment_id
        and (
          o.user_id = auth.uid()
          or public.is_order_merchant(o.id)
          or dc.user_id = auth.uid()
          or public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- Ensure a caller cannot link a shipment belonging to a different order.
create or replace function public.link_order_shipment(
  _order_id uuid, _shipment_id uuid, _delivery_method text default 'delivery'
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if _delivery_method not in ('store_pickup', 'delivery') then
    raise exception 'invalid_delivery_method';
  end if;
  if not exists (
    select 1 from public.orders o
    where o.id = _order_id
      and (o.user_id = auth.uid() or public.is_order_merchant(o.id))
  ) then raise exception 'not_authorized'; end if;
  if not exists (
    select 1 from public.shipments s
    where s.id = _shipment_id and s.order_id = _order_id
  ) then raise exception 'shipment_order_mismatch'; end if;
  update public.orders
  set shipment_id = _shipment_id, delivery_method = _delivery_method
  where id = _order_id;
end;
$function$;
revoke all on function public.link_order_shipment(uuid, uuid, text) from public, anon;
grant execute on function public.link_order_shipment(uuid, uuid, text) to authenticated;

-- Ensure amount signs match transaction semantics without duplicating an existing constraint.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.wallet_transactions'::regclass
      and conname in ('wallet_tx_amount_sign', 'wallet_transactions_amount_sign_check')
  ) then
    alter table public.wallet_transactions
      add constraint wallet_transactions_amount_sign_check
      check (
        (type in ('topup', 'refund') and amount > 0)
        or (type in ('withdraw', 'purchase') and amount < 0)
      ) not valid;
  end if;
end
$$;
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.wallet_transactions'::regclass
      and conname = 'wallet_transactions_amount_sign_check'
      and not convalidated
  ) then
    alter table public.wallet_transactions
      validate constraint wallet_transactions_amount_sign_check;
  end if;
end
$$;

-- A customer may submit pending transactions, but cannot update them.
revoke all on table public.wallet_transactions from anon;
revoke update, delete on table public.wallet_transactions from authenticated;
grant update (status) on table public.wallet_transactions to authenticated;

-- Close direct client execution of trigger-only SECURITY DEFINER routines.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.notify_order_status() from public, anon, authenticated;
revoke all on function public.notify_reservation_status() from public, anon, authenticated;
revoke all on function public.notify_shipment_status() from public, anon, authenticated;
revoke all on function public.notify_wallet_transaction() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.update_target_rating() from public, anon, authenticated;

alter function public.update_updated_at_column() set search_path = public;
alter table public.schema_migrations enable row level security;
