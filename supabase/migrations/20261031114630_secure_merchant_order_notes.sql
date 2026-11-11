CREATE OR REPLACE FUNCTION public.merchant_update_order_note(_order_id uuid, _note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_order_merchant(_order_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF length(coalesce(_note, '')) > 1000 THEN
    RAISE EXCEPTION 'note_too_long';
  END IF;

  UPDATE public.orders
  SET notes = nullif(btrim(_note), '')
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.merchant_update_order_note(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merchant_update_order_note(uuid, text) TO authenticated;
