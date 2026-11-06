-- ============================================================
-- 202610200001_realtime.sql
-- تفعيل Supabase Realtime على الجداول التي تحتاج تحديثات حية.
-- ============================================================

do $$
declare
  t text;
  tables text[] := array[
    'notifications',
    'orders',
    'shipments',
    'store_offers',
    'products',
    'reviews',
    'reservations'
  ];
begin
  foreach t in array tables loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      -- الجدول مُضاف مسبقاً — تخطّي
      null;
    when undefined_table then
      -- الجدول غير موجود — تخطّي
      null;
    end;
  end loop;
end $$;

-- تأكيد replica identity full على الجداول (للحصول على old/new rows في payloads)
alter table public.notifications replica identity full;
alter table public.orders replica identity full;
alter table public.shipments replica identity full;
alter table public.store_offers replica identity full;
alter table public.products replica identity full;
alter table public.reviews replica identity full;
alter table public.reservations replica identity full;