-- Persist important successful actions in the existing in-app notification center.
-- These notifications are created from database events (not from toast UI), so they
-- survive navigation/reloads and are not lost if a client-side toast disappears.

create or replace function public.notify_created_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
  notification_type text := 'info';
  notification_title text;
  notification_body text;
  notification_data jsonb := '{}'::jsonb;
  product_name text;
  store_name text;
begin
  if tg_table_name = 'orders' then
    recipient_id := new.user_id;
    notification_type := 'order';
    notification_title := 'تم استلام طلبك';
    notification_body := 'تم إنشاء طلبك بنجاح، ويمكنك متابعة حالته من قسم طلباتي.';
    notification_data := jsonb_build_object('order_id', new.id, 'status', new.status);
  elsif tg_table_name = 'reservations' then
    recipient_id := new.user_id;
    notification_type := 'reservation';
    notification_title := 'تم تأكيد حجزك';
    notification_body := 'تم إنشاء حجزك بنجاح. يمكنك مراجعة تفاصيله من قسم حجوزاتي.';
    notification_data := jsonb_build_object('reservation_id', new.id, 'status', new.status);
  elsif tg_table_name = 'store_offers' then
    select s.owner_id, s.name, p.name
      into recipient_id, store_name, product_name
    from public.stores s
    join public.products p on p.id = new.product_id
    where s.id = new.store_id;

    notification_type := 'offer';
    notification_title := 'تمت إضافة المنتج إلى متجرك';
    notification_body := coalesce(product_name, 'المنتج') || ' — تمت إضافته بنجاح إلى ' || coalesce(store_name, 'متجرك') || '.';
    notification_data := jsonb_build_object(
      'offer_id', new.id,
      'product_id', new.product_id,
      'store_id', new.store_id
    );
  elsif tg_table_name = 'stores' then
    recipient_id := new.owner_id;
    notification_type := 'system';
    notification_title := 'تم إنشاء متجرك بنجاح';
    notification_body := 'أصبح متجرك مسجلاً في Arownd ويمكنك إدارة منتجاتك من استوديو التاجر.';
    notification_data := jsonb_build_object('store_id', new.id);
  elsif tg_table_name = 'reviews' then
    recipient_id := new.user_id;
    notification_type := 'info';
    notification_title := 'تم إرسال تقييمك';
    notification_body := 'شكراً لمشاركة رأيك. تم استلام تقييمك بنجاح.';
    notification_data := jsonb_build_object(
      'target_type', new.target_type,
      'target_id', new.target_id
    );
  end if;

  if recipient_id is not null then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      recipient_id,
      notification_type,
      notification_title,
      notification_body,
      notification_data
    );
  end if;

  return new;
end;
$$;

drop trigger if exists orders_notify_created on public.orders;
create trigger orders_notify_created
after insert on public.orders
for each row execute function public.notify_created_activity();

drop trigger if exists reservations_notify_created on public.reservations;
create trigger reservations_notify_created
after insert on public.reservations
for each row execute function public.notify_created_activity();

drop trigger if exists store_offers_notify_created on public.store_offers;
create trigger store_offers_notify_created
after insert on public.store_offers
for each row execute function public.notify_created_activity();

drop trigger if exists stores_notify_created on public.stores;
create trigger stores_notify_created
after insert on public.stores
for each row execute function public.notify_created_activity();

drop trigger if exists reviews_notify_created on public.reviews;
create trigger reviews_notify_created
after insert on public.reviews
for each row execute function public.notify_created_activity();
