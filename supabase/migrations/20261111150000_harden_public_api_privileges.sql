-- Harden public API privileges without changing application RPC behavior.
-- Anonymous users retain existing read access but cannot mutate public relations.
-- Authenticated write grants and service_role privileges remain unchanged.

BEGIN;

REVOKE INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
FROM anon;

-- Keep the public profile projection strictly read-only.
REVOKE ALL PRIVILEGES
ON TABLE public.public_personal_profiles
FROM anon, authenticated;

GRANT SELECT
ON TABLE public.public_personal_profiles
TO anon, authenticated;

-- Apply the same anonymous write restriction to future tables created by
-- the postgres migration role.
ALTER DEFAULT PRIVILEGES
FOR ROLE postgres
IN SCHEMA public
REVOKE INSERT, UPDATE, DELETE
ON TABLES FROM anon;

-- Shipment visibility is limited to authenticated customers and store owners.
-- The ownership predicates are preserved from the existing policy.
DROP POLICY IF EXISTS
  "Customers and merchants read shipments"
ON public.shipments;

CREATE POLICY "Customers and merchants read shipments"
ON public.shipments
FOR SELECT
TO authenticated
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
      FROM public.merchant_orders AS mo
      WHERE mo.id = shipments.merchant_order_id
        AND public.is_store_owner(mo.store_id)
    )
  )
);

COMMIT;
