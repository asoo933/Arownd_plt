-- Route notifications from the actual merchant sub-order lifecycle.
-- The parent order is an aggregate; merchant_orders is the actionable order per store.

create or replace function public.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Avoid duplicate customer notifications when a parent aggregate changes
  -- because one or more merchant sub-orders changed.
  if exists (select 1 from public.merchant_orders mo where mo.order_id = new.id) then
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.user_id,
      'order',
      'تحديث حالة طلبك',
      case new.status
        when 'confirmed' then 'تم تأكيد طلبك رقم ' || substr(new.id::text, 1, 8)
        when 'shipped' then 'تم شحن طلبك رقم ' || substr(new.id::text, 1, 8)
        when 'delivered' then 'تم توصيل طلبك رقم ' || substr(new.id::text, 1, 8)
        when 'cancelled' then 'تم إلغاء طلبك رقم ' || substr(new.id::text, 1, 8)
        else 'تغيّرت حالة طلبك إلى ' || new.status
      end,
      jsonb_build_object('order_id', new.id, 'status', new.status, 'recipient_role', 'customer')
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_merchant_order_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
  store_name text;
  notification_title text;
  notification_body text;
  notification_data jsonb;
begin
  if tg_op = 'INSERT' then
    select s.owner_id, s.name
      into recipient_id, store_name
    from public.stores s
    where s.id = new.store_id;

    if recipient_id is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (
        recipient_id,
        'order',
        'طلب جديد لمتجرك',
        'لديك طلب جديد في ' || coalesce(store_name, 'متجرك') || '. افتح استوديو التاجر لمراجعته.',
        jsonb_build_object(
          'order_id', new.order_id,
          'merchant_order_id', new.id,
          'store_id', new.store_id,
          'status', new.status,
          'recipient_role', 'merchant'
        )
      );
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    recipient_id := new.customer_id;
    notification_title := 'تحديث طلبك من المتجر';
    notification_body := case new.status
      when 'pending' then 'تم استلام طلبك لدى المتجر.'
      when 'quoted' then 'أرسل المتجر عرض سعر الشحن، يرجى مراجعة طلبك.'
      when 'confirmed' then 'وافق المتجر على طلبك وبدأ تجهيزه.'
      when 'shipped' then 'تم شحن طلبك وهو في الطريق إليك.'
      when 'delivered' then 'تم تسليم طلبك بنجاح.'
      when 'cancelled' then 'تم إلغاء طلب المتجر لطلبك.'
      else 'تغيّرت حالة طلب المتجر إلى ' || new.status || '.'
    end;
    notification_data := jsonb_build_object(
      'order_id', new.order_id,
      'merchant_order_id', new.id,
      'store_id', new.store_id,
      'status', new.status,
      'recipient_role', 'customer'
    );

    if recipient_id is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (recipient_id, 'order', notification_title, notification_body, notification_data);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists merchant_orders_notify_activity on public.merchant_orders;
create trigger merchant_orders_notify_activity
after insert or update of status on public.merchant_orders
for each row execute function public.notify_merchant_order_activity();
