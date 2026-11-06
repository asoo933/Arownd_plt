-- ============================================
-- هجرة: إكمال backend — سياسات RLS ناقصة + وظائف مساعدة
-- التاريخ: 2026-10-18
-- الوصف: إصلاح الفجوات المكتشفة بين الواجهة والباكند:
--   1. العملاء يقرأون شركات التوصيل المعتمدة (checkout)
--   2. العملاء يقرأون مناطق التغطية/الخدمات (رسوم التوصيل)
--   3. العملاء يُدرجون شحنات لطلباتهم (createOrderWithDelivery)
--   4. المتاجر تقرأ شحنات طلباتها (studio.shipments)
--   5. شركات التوصيل تُدرج سجلات الحالة ونقاط التتبع
--   6. المدراء يعتمدون/يُلغون اعتماد شركات التوصيل
--   7. دالة link_order_shipment (ربط طلب بشحنة)
-- ============================================

-- 1. فهرس فريد: مستخدم واحد = شركة توصيل واحدة
create unique index if not exists idx_delivery_companies_user_id
  on public.delivery_companies (user_id);

-- 2. شركات التوصيل: قراءة عامة للشركات المعتمدة (للعملاء في checkout)
drop policy if exists "العملاء يقرأون الشركات المعتمدة" on public.delivery_companies;
create policy "العملاء يقرأون الشركات المعتمدة" on public.delivery_companies
  for select to anon, authenticated
  using (is_approved = true);

-- 3. شركات التوصيل: صلاحيات المدير (قراءة/تحديث الكل)
drop policy if exists "المدراء يقرأون جميع الشركات" on public.delivery_companies;
create policy "المدراء يقرأون جميع الشركات" on public.delivery_companies
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "المدراء يعتمدون الشركات" on public.delivery_companies;
create policy "المدراء يعتمدون الشركات" on public.delivery_companies
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- 4. مناطق التغطية: قراءة عامة (للعملاء لحساب رسوم التوصيل)
drop policy if exists "العملاء يقرأون مناطق التغطية" on public.delivery_coverage_areas;
create policy "العملاء يقرأون مناطق التغطية" on public.delivery_coverage_areas
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.delivery_companies c
      where c.id = company_id and c.is_approved = true
    )
  );

-- 5. خدمات التوصيل: قراءة عامة
drop policy if exists "العملاء يقرأون خدمات التوصيل" on public.delivery_services;
create policy "العملاء يقرأون خدمات التوصيل" on public.delivery_services
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.delivery_companies c
      where c.id = company_id and c.is_approved = true
    )
  );

-- 6. الشحنات: إدراج من العميل (إذا كان الطلب ملكه)
drop policy if exists "العملاء يُدرجون شحنات طلباتهم" on public.shipments;
create policy "العملاء يُدرجون شحنات طلباتهم" on public.shipments
  for insert to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- 7. الشحنات: قراءة من المتجر (owner of the order's store)
drop policy if exists "المتاجر تقرأ شحنات طلباتها" on public.shipments;
create policy "المتاجر تقرأ شحنات طلباتها" on public.shipments
  for select to authenticated
  using (public.is_order_merchant(order_id));

-- 8. سجلات الحالة: إدراج من شركة التوصيل (owner of the shipment)
drop policy if exists "شركات التوصيل تُدرج سجلات الحالة" on public.shipment_status_logs;
create policy "شركات التوصيل تُدرج سجلات الحالة" on public.shipment_status_logs
  for insert to authenticated
  with check (
    exists (
      select 1 from public.shipments s
      join public.delivery_companies c on c.id = s.company_id
      where s.id = shipment_id and c.user_id = auth.uid()
    )
  );

-- 9. نقاط التتبع: إدراج من شركة التوصيل (owner of the shipment)
drop policy if exists "شركات التوصيل تُدرج نقاط التتبع" on public.shipment_tracking;
create policy "شركات التوصيل تُدرج نقاط التتبع" on public.shipment_tracking
  for insert to authenticated
  with check (
    exists (
      select 1 from public.shipments s
      join public.delivery_companies c on c.id = s.company_id
      where s.id = shipment_id and c.user_id = auth.uid()
    )
  );

-- 10. دالة ربط طلب بشحنة (security definer) — تُستدعى من العميل/المتجر
create or replace function public.link_order_shipment(
  _order_id uuid,
  _shipment_id uuid,
  _delivery_method text default 'delivery'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  -- التحقق: الطلب ملك المستخدم أو متجره
  if not exists (
    select 1 from public.orders o
    where o.id = _order_id
      and (o.user_id = auth.uid() or public.is_order_merchant(o.id))
  ) then
    raise exception 'not_authorized';
  end if;
  update public.orders
  set shipment_id = _shipment_id,
      delivery_method = _delivery_method
  where id = _order_id;
end;
$$;

grant execute on function public.link_order_shipment(uuid, uuid, text) to authenticated;

-- 11. تعليقات
comment on function public.link_order_shipment(uuid, uuid, text) is 'ربط طلب بشحنة (يُستدعى من العميل أو المتجر).';

-- ============================================
-- نهاية الهجرة
-- ============================================
