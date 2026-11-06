-- Remove the application-level admin role and all client-facing admin access.
-- Privileged review/approval remains available to the project owner through Supabase Dashboard.

begin;

-- Remove policies that granted platform-wide visibility or mutation.
drop policy if exists "Admin reads all coverage areas" on public.delivery_coverage_areas;
drop policy if exists "Admin reads all delivery services" on public.delivery_services;
drop policy if exists "Admin reads all notifications" on public.notifications;
drop policy if exists "Admin reads all orders" on public.orders;
drop policy if exists "admin_read_orders" on public.orders;
drop policy if exists "Admin reads all profiles" on public.profiles;
drop policy if exists "admin_read_profiles" on public.profiles;
drop policy if exists "Admin reads all reservations" on public.reservations;
drop policy if exists "Admin reads all reviews" on public.reviews;
drop policy if exists "Admin reads all shipments" on public.shipments;
drop policy if exists "Admin reads all roles" on public.user_roles;
drop policy if exists "Admin reads all wallet transactions" on public.wallet_transactions;
drop policy if exists "Admin updates wallet transactions" on public.wallet_transactions;

-- Replace mixed participant policies with ownership-only predicates.
drop policy if exists "شركة التوصيل تقرأ سجلها" on public.delivery_companies;
create policy "شركة التوصيل تقرأ سجلها" on public.delivery_companies
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "merchant_order_cod_collections_read_participants" on public.merchant_order_cod_collections;
create policy "merchant_order_cod_collections_read_participants"
  on public.merchant_order_cod_collections for select to authenticated
  using (
    exists (
      select 1 from public.merchant_orders mo
      where mo.id = merchant_order_cod_collections.merchant_order_id
        and (mo.customer_id = (select auth.uid()) or public.is_store_owner(mo.store_id))
    )
  );

drop policy if exists "Customer and store owner read merchant orders" on public.merchant_orders;
create policy "Customer and store owner read merchant orders"
  on public.merchant_orders for select to authenticated
  using (customer_id = (select auth.uid()) or public.is_store_owner(store_id));

drop policy if exists "Order parties read scoped shipment logs" on public.shipment_status_logs;
create policy "Order parties read scoped shipment logs"
  on public.shipment_status_logs for select to authenticated
  using (
    exists (
      select 1
      from public.shipments s
      join public.orders o on o.id = s.order_id
      left join public.merchant_orders mo on mo.id = s.merchant_order_id
      left join public.delivery_companies dc on dc.id = s.company_id
      where s.id = shipment_status_logs.shipment_id
        and (
          o.user_id = (select auth.uid())
          or (mo.id is not null and public.is_store_owner(mo.store_id))
          or dc.user_id = (select auth.uid())
        )
    )
  );

drop policy if exists "Order parties read scoped shipment tracking" on public.shipment_tracking;
create policy "Order parties read scoped shipment tracking"
  on public.shipment_tracking for select to authenticated
  using (
    exists (
      select 1
      from public.shipments s
      join public.orders o on o.id = s.order_id
      left join public.merchant_orders mo on mo.id = s.merchant_order_id
      left join public.delivery_companies dc on dc.id = s.company_id
      where s.id = shipment_tracking.shipment_id
        and (
          o.user_id = (select auth.uid())
          or (mo.id is not null and public.is_store_owner(mo.store_id))
          or dc.user_id = (select auth.uid())
        )
    )
  );

drop policy if exists "Receipt owner or order participant read" on storage.objects;
create policy "Receipt owner or order participant read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.orders o
        where o.receipt_url = objects.name
          and (o.user_id = (select auth.uid()) or public.is_order_merchant(o.id))
      )
      or exists (
        select 1 from public.wallet_transactions wt
        where wt.receipt_url = objects.name
          and wt.user_id = (select auth.uid())
      )
    )
  );

-- has_role can only answer for the caller's own role; no cross-user privilege lookup.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select auth.uid() is not null
    and _user_id = auth.uid()
    and exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = _role
    );
$function$;

-- Remove the existing platform-wide admin account role, but preserve the auth user and all other data.
delete from public.user_roles where role = 'admin'::public.app_role;

-- A database constraint makes it impossible to assign this role again through any SQL/API path.
alter table public.user_roles
  drop constraint if exists user_roles_no_admin_role;
alter table public.user_roles
  add constraint user_roles_no_admin_role
  check (role <> 'admin'::public.app_role);

-- No client should ever mutate role assignments directly.
revoke insert, update, delete on table public.user_roles from anon, authenticated;

-- Admin-only RPC endpoints are no longer part of the application. Owner-level review is done in Supabase.
drop function if exists public.admin_assign_shipment_company(uuid, uuid);
drop function if exists public.admin_set_delivery_company_approval(uuid, boolean);

commit;
