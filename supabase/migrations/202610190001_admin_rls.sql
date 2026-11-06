-- ============================================================
-- 202610190001_admin_rls.sql
-- صلاحيات المدير (admin): قراءة/تعديل جميع الصفوف (profiles, user_roles,
-- orders, delivery_companies, shipments) لتمكين لوحة الإدارة (admin.index.tsx
-- و admin.delivery-companies.tsx) من العمل.
-- ============================================================

-- 1. profiles — المدير يقرأ جميع الملفات الشخصية
drop policy if exists "Admin reads all profiles" on public.profiles;
create policy "Admin reads all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 2. user_roles — المدير يقرأ جميع الأدوار
drop policy if exists "Admin reads all roles" on public.user_roles;
create policy "Admin reads all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 3. orders — المدير يقرأ جميع الطلبات
drop policy if exists "Admin reads all orders" on public.orders;
create policy "Admin reads all orders" on public.orders
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 4. delivery_companies — المدير يقرأ ويعدّل جميع الشركات
drop policy if exists "Admin reads all delivery companies" on public.delivery_companies;
create policy "Admin reads all delivery companies" on public.delivery_companies
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admin updates delivery companies" on public.delivery_companies;
create policy "Admin updates delivery companies" on public.delivery_companies
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 5. shipments — المدير يقرأ جميع الشحنات
drop policy if exists "Admin reads all shipments" on public.shipments;
create policy "Admin reads all shipments" on public.shipments
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 6. stores — المدير يقرأ جميع المتاجر (للإدارة)
drop policy if exists "Admin reads all stores" on public.stores;
create policy "Admin reads all stores" on public.stores
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 7. store_offers — المدير يقرأ جميع العروض
drop policy if exists "Admin reads all offers" on public.store_offers;
create policy "Admin reads all offers" on public.store_offers
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 8. products — المدير يقرأ جميع المنتجات
drop policy if exists "Admin reads all products" on public.products;
create policy "Admin reads all products" on public.products
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 9. reservations — المدير يقرأ جميع الحجوزات
drop policy if exists "Admin reads all reservations" on public.reservations;
create policy "Admin reads all reservations" on public.reservations
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 10. reviews — المدير يقرأ جميع المراجعات
drop policy if exists "Admin reads all reviews" on public.reviews;
create policy "Admin reads all reviews" on public.reviews
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 11. notifications — المدير يقرأ جميع الإشعارات (للتشخيص)
drop policy if exists "Admin reads all notifications" on public.notifications;
create policy "Admin reads all notifications" on public.notifications
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 12. shipment_status_logs & shipment_tracking — المدير يقرأ
drop policy if exists "Admin reads all shipment logs" on public.shipment_status_logs;
create policy "Admin reads all shipment logs" on public.shipment_status_logs
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admin reads all tracking" on public.shipment_tracking;
create policy "Admin reads all tracking" on public.shipment_tracking
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 13. product_images — المدير يقرأ
drop policy if exists "Admin reads all product images" on public.product_images;
create policy "Admin reads all product images" on public.product_images
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 14. delivery_coverage_areas & delivery_services — المدير يقرأ
drop policy if exists "Admin reads all coverage areas" on public.delivery_coverage_areas;
create policy "Admin reads all coverage areas" on public.delivery_coverage_areas
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admin reads all delivery services" on public.delivery_services;
create policy "Admin reads all delivery services" on public.delivery_services
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 15. إشعارات تغيّر حالة الشحنة (لإبقاء العميل مُطّلعاً)
-- ============================================================
create or replace function public.notify_shipment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _user_id uuid;
begin
  if new.status is distinct from old.status then
    select user_id into _user_id from public.orders where id = new.order_id;
    if _user_id is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        _user_id,
        'order',
        'تحديث حالة الشحنة',
        case new.status
          when 'accepted' then 'تم قبول طلب الشحن الخاص بك'
          when 'picked_up' then 'تم استلام طردك من المتجر'
          when 'in_transit' then 'طلبك في الطريق إليك'
          when 'delivered' then 'تم توصيل طلبك بنجاح ✅'
          when 'failed' then 'تعذّر توصيل طلبك — سيتم إعادة المحاولة'
          when 'returned' then 'تم إرجاع طلبك'
          when 'rejected' then 'تم رفض طلب الشحن'
          else "حالة الشحنة: " || new.status
        end,
        jsonb_build_object('shipment_id', new.id, 'order_id', new.order_id, 'status', new.status)
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists shipments_notify_status on public.shipments;
create trigger shipments_notify_status
after update of status on public.shipments
for each row execute function public.notify_shipment_status();