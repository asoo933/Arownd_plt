-- Keep the public delivery-company directory limited to explicitly public fields.
-- The backing table lives outside PostgREST's public schema so callers cannot query
-- private delivery-company records through this directory.
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.approved_delivery_companies_public (
  id uuid PRIMARY KEY REFERENCES public.delivery_companies(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_phone text
);

ALTER TABLE private.approved_delivery_companies_public ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read approved delivery company directory"
  ON private.approved_delivery_companies_public;
CREATE POLICY "Public can read approved delivery company directory"
  ON private.approved_delivery_companies_public
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
REVOKE ALL ON private.approved_delivery_companies_public FROM PUBLIC;
GRANT SELECT ON private.approved_delivery_companies_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.sync_approved_delivery_company_public_directory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM private.approved_delivery_companies_public
    WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.is_approved IS TRUE THEN
    INSERT INTO private.approved_delivery_companies_public (id, company_name, contact_phone)
    VALUES (NEW.id, NEW.company_name, NEW.contact_phone)
    ON CONFLICT (id) DO UPDATE
      SET company_name = EXCLUDED.company_name,
          contact_phone = EXCLUDED.contact_phone;
  ELSE
    DELETE FROM private.approved_delivery_companies_public
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.sync_approved_delivery_company_public_directory()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_approved_delivery_company_public_directory
  ON public.delivery_companies;
CREATE TRIGGER sync_approved_delivery_company_public_directory
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_companies
FOR EACH ROW
EXECUTE FUNCTION private.sync_approved_delivery_company_public_directory();

INSERT INTO private.approved_delivery_companies_public (id, company_name, contact_phone)
SELECT id, company_name, contact_phone
FROM public.delivery_companies
WHERE is_approved IS TRUE
ON CONFLICT (id) DO UPDATE
  SET company_name = EXCLUDED.company_name,
      contact_phone = EXCLUDED.contact_phone;

CREATE OR REPLACE VIEW public.approved_delivery_companies
WITH (security_barrier = true, security_invoker = true)
AS
SELECT id, company_name, contact_phone
FROM private.approved_delivery_companies_public;

REVOKE ALL ON public.approved_delivery_companies FROM PUBLIC;
GRANT SELECT ON public.approved_delivery_companies TO anon, authenticated;
