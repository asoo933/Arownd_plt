-- Avoid a duplicate customer notification when a merchant submits a shipping quote.
-- merchant_submit_order_quote() already sends the detailed quote notification.
-- Keep all other merchant-order status notifications unchanged.

CREATE OR REPLACE FUNCTION public.notify_merchant_order_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  recipient_id uuid;
  store_name text;
  notification_title text;
  notification_body text;
  notification_data jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT s.owner_id, s.name
      INTO recipient_id, store_name
    FROM public.stores s
    WHERE s.id = NEW.store_id;

    IF recipient_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        recipient_id,
        'order',
        'طلب جديد لمتجرك',
        'لديك طلب جديد في ' || coalesce(store_name, 'متجرك') || '. افتح استوديو التاجر لمراجعته.',
        jsonb_build_object(
          'order_id', NEW.order_id,
          'merchant_order_id', NEW.id,
          'store_id', NEW.store_id,
          'status', NEW.status,
          'recipient_role', 'merchant'
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- The quote RPC inserts a richer notification with subtotal, shipping fee and total.
    -- Skip only the generic notification for the quoted transition.
    IF NEW.status = 'quoted' THEN
      RETURN NEW;
    END IF;

    recipient_id := NEW.customer_id;
    notification_title := 'تحديث طلبك من المتجر';
    notification_body := CASE NEW.status
      WHEN 'pending' THEN 'تم استلام طلبك لدى المتجر.'
      WHEN 'quoted' THEN 'أرسل المتجر عرض سعر الشحن، يرجى مراجعة طلبك.'
      WHEN 'confirmed' THEN 'وافق المتجر على طلبك وبدأ تجهيزه.'
      WHEN 'shipped' THEN 'تم شحن طلبك وهو في الطريق إليك.'
      WHEN 'delivered' THEN 'تم تسليم طلبك بنجاح.'
      WHEN 'cancelled' THEN 'تم إلغاء طلب المتجر لطلبك.'
      ELSE 'تغيّرت حالة طلب المتجر إلى ' || NEW.status || '.'
    END;
    notification_data := jsonb_build_object(
      'order_id', NEW.order_id,
      'merchant_order_id', NEW.id,
      'store_id', NEW.store_id,
      'status', NEW.status,
      'recipient_role', 'customer'
    );

    IF recipient_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (recipient_id, 'order', notification_title, notification_body, notification_data);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
