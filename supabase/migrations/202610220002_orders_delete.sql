-- أزرار حذف وإدارة الطلبات (العميل صاحب الطلب + التاجر صاحب المتجر + الأدمن)
-- سابقًا: لا صلاحية DELETE ولا سياسة حذف → زر الحذف كان سيفشل بـ permission denied.
-- وأيضًا: لا توجد سياسة تحديث للعميل → زر "إلغاء الطلب" كان يفشل صمتًا (0 صفوف).

grant delete on public.orders to authenticated;

drop policy if exists "Owner deletes order" on public.orders;
create policy "Owner deletes order" on public.orders
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_order_merchant(id)
    or public.has_role(auth.uid(), 'admin')
  );

-- العميل يلغي طلبه فقط، ولا يستطيع تغيير الحالة إلى ما هو مسموح (حماية من التلاعب)
drop policy if exists "Customer cancels own order" on public.orders;
create policy "Customer cancels own order" on public.orders
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and status in ('pending', 'cancelled')
  );
