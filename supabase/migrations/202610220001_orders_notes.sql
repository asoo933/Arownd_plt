-- إضافة عمود ملاحظات التاجر على الطلب
-- كان الكود يكتب في orders.notes قبل وجود العمود (فشل صامت في runtime).
alter table public.orders
  add column if not exists notes text;

comment on column public.orders.notes is 'ملاحظة التاجر على الطلب (تحفظ ضمنيًا مع تحديث الحالة)';
