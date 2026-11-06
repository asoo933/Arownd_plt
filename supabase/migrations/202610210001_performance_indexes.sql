-- ============================================
-- هجرة: فهارس الأداء لتقوية الخادم
-- التاريخ: 2026-10-21
-- الوصف: إضافة فهارس على الحقول الأكثر استخداماً في الاستعلامات
-- لتقليل زمن الاستجابة واستهلاك وحدة الحساب في Supabase.
-- ============================================

-- جدول الطلبات: البحث حسب المستخدم وتاريخ الإنشاء
create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_user_created on public.orders (user_id, created_at desc);

-- جدول المنتجات: البحث حسب المنشئ وتاريخ الإنشاء
create index if not exists idx_products_created_by on public.products (created_by);
create index if not exists idx_products_created_at on public.products (created_at desc);
create index if not exists idx_products_category on public.products (category);

-- جدول المتاجر: البحث حسب المالك وتاريخ الإنشاء
create index if not exists idx_stores_owner_id on public.stores (owner_id);
create index if not exists idx_stores_created_at on public.stores (created_at desc);
create index if not exists idx_stores_verified on public.stores (is_verified);

-- جدول عروض المتاجر: البحث حسب المتجر والمنتج
create index if not exists idx_store_offers_store_id on public.store_offers (store_id);
create index if not exists idx_store_offers_product_id on public.store_offers (product_id);
create index if not exists idx_store_offers_available on public.store_offers (is_available);

-- جدول عناصر الطلب: البحث حسب الطلب والمتجر
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_order_items_store_id on public.order_items (store_id);
create index if not exists idx_order_items_offer_id on public.order_items (offer_id);

-- جدول الحجوزات: البحث حسب المستخدم والمتجر
create index if not exists idx_reservations_user_id on public.reservations (user_id);
create index if not exists idx_reservations_store_id on public.reservations (store_id);
create index if not exists idx_reservations_status on public.reservations (status);

-- جدول المراجعات: البحث حسب الهدف والنوع
create index if not exists idx_reviews_target on public.reviews (target_type, target_id);
create index if not exists idx_reviews_user on public.reviews (user_id);

-- جدول الإشعارات: تعزيز الفهرس الموجود
create index if not exists idx_notifications_user_read on public.notifications (user_id, read);

-- ============================================
-- نهاية الهجرة
-- ============================================
