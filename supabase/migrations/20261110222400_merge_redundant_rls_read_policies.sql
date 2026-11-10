-- Preserve existing row access while removing overlapping permissive policies.

BEGIN;

DROP POLICY IF EXISTS "Owners manage images" ON public.product_images;

CREATE POLICY "Owners insert images"
ON public.product_images
FOR INSERT
TO authenticated
WITH CHECK (public.is_offer_owner(offer_id));

CREATE POLICY "Owners update images"
ON public.product_images
FOR UPDATE
TO authenticated
USING (public.is_offer_owner(offer_id))
WITH CHECK (public.is_offer_owner(offer_id));

CREATE POLICY "Owners delete images"
ON public.product_images
FOR DELETE
TO authenticated
USING (public.is_offer_owner(offer_id));

DROP POLICY IF EXISTS "Reviews public read" ON public.reviews;
DROP POLICY IF EXISTS "Users read own reviews" ON public.reviews;

CREATE POLICY "Reviews public and own read"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (
  status = 'approved'::public.review_status
  OR (
    (SELECT auth.uid()) IS NOT NULL
    AND user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Merchants read only their suborder shipments" ON public.shipments;
DROP POLICY IF EXISTS "العملاء يرون شحنات طلباتهم" ON public.shipments;

CREATE POLICY "Customers and merchants read shipments"
ON public.shipments
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.orders
    WHERE orders.id = shipments.order_id
      AND orders.user_id = (SELECT auth.uid())
  )
  OR (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.merchant_orders mo
      WHERE mo.id = shipments.merchant_order_id
        AND public.is_store_owner(mo.store_id)
    )
  )
);

COMMIT;
