-- Reject null quote decisions before changing order state or inventory.
-- Preserve the existing authorization, lifecycle, notification, and grant behavior.

CREATE OR REPLACE FUNCTION public.customer_respond_to_merchant_order(_merchant_order_id uuid, _accept boolean)
RETURNS public.merchant_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  mo public.merchant_orders;
  parent public.orders;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF _accept IS NULL THEN
    RAISE EXCEPTION 'invalid_quote_response';
  END IF;

  SELECT o.* INTO parent
  FROM public.orders o
  JOIN public.merchant_orders x ON x.order_id = o.id
  WHERE x.id = _merchant_order_id
  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'merchant_order_not_found';
  END IF;

  SELECT * INTO mo
  FROM public.merchant_orders
  WHERE id = _merchant_order_id
  FOR UPDATE;

  IF mo.customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF mo.status <> 'quoted' THEN
    RAISE EXCEPTION 'quote_response_not_available';
  END IF;

  IF _accept THEN
    UPDATE public.merchant_orders
    SET status = 'confirmed',
        responded_at = now(),
        updated_at = now()
    WHERE id = _merchant_order_id
    RETURNING * INTO mo;
  ELSE
    UPDATE public.merchant_orders
    SET status = 'cancelled',
        responded_at = now(),
        updated_at = now()
    WHERE id = _merchant_order_id
    RETURNING * INTO mo;

    UPDATE public.store_offers so
    SET stock_quantity = so.stock_quantity + item_totals.quantity,
        is_available = true
    FROM (
      SELECT offer_id, sum(quantity)::integer AS quantity
      FROM public.order_items
      WHERE merchant_order_id = mo.id
        AND offer_id IS NOT NULL
      GROUP BY offer_id
    ) item_totals
    WHERE so.id = item_totals.offer_id;
  END IF;

  PERFORM public.refresh_parent_order_totals(mo.order_id);

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    st.owner_id,
    'order',
    CASE WHEN _accept THEN 'وافق المشتري على عرضك' ELSE 'رفض المشتري عرض المتجر' END,
    CASE
      WHEN NOT _accept THEN
        'رفض المشتري عرض السعر؛ تم إلغاء هذا الطلب الفرعي وإرجاع الكمية للمخزون.'
      WHEN parent.delivery_type = 'home' THEN
        'وافق المشتري على السعر النهائي. جهّز الطلب وتولَّ توصيله مباشرة.'
      ELSE
        'وافق المشتري على السعر النهائي. جهّز الطلب وأشعر المشتري عندما يصبح جاهزًا للاستلام من المتجر.'
    END,
    jsonb_build_object(
      'order_id', mo.order_id,
      'merchant_order_id', mo.id
    )
  FROM public.stores st
  WHERE st.id = mo.store_id
    AND st.owner_id IS NOT NULL;

  RETURN mo;
END;
$function$;
