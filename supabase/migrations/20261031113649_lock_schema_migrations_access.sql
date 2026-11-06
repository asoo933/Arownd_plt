-- Keep the internal migration tracking table out of the public Data API.
-- RLS without policies blocks row access, but TRUNCATE bypasses RLS entirely.
REVOKE ALL PRIVILEGES ON TABLE public.schema_migrations FROM PUBLIC, anon, authenticated;
