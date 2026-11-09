-- Avoid creating two customer notifications for a shipment transition
-- that also advances the linked merchant order to the corresponding status.
-- PostgreSQL fires same-event triggers alphabetically: shipments_notify_status
-- runs before shipments_sync_merchant_order, so the current merchant status
-- identifies whether the latter trigger will emit the customer notification.
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
    if new.merchant_order_id is not null and exists (
      select 1
      from public.merchant_orders mo
      where mo.id = new.merchant_order_id
        and (
          (new.status in ('picked_up', 'in_transit') and mo.status = 'confirmed')
          or (new.status = 'delivered' and mo.status in ('confirmed', 'shipped'))
        )
    ) then
      return new;
    end if;

    select user_id into _user_id
    from public.orders
    where id = new.order_id;

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
          else 'حالة الشحنة: ' || new.status
        end,
        jsonb_build_object(
          'shipment_id', new.id,
          'order_id', new.order_id,
          'status', new.status
        )
      );
    end if;
  end if;

  return new;
end;
$$;
