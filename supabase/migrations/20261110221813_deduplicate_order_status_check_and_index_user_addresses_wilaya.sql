ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_allowed;

CREATE INDEX IF NOT EXISTS user_addresses_wilaya_id_idx
  ON public.user_addresses (wilaya_id);
