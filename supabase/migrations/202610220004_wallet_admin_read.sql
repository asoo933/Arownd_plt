-- واجهة المحفظة (تابع): قراءة الأدمن لكل العمليات
-- سياسة القراءة في 0003 محصورة بصاحب العملية — لوحة إدارة المحافظ في /admin
-- تحتاج رؤية عمليات كل المستخدمين لمراجعة/اعتماد الشحنات والسحوبات.

drop policy if exists "Admin reads all wallet transactions" on public.wallet_transactions;
create policy "Admin reads all wallet transactions" on public.wallet_transactions
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
