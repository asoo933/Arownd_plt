-- Store owners may edit storefront content and contact/location details only.
-- Verification state, ownership and aggregate rating remain server-managed.
revoke update on table public.stores from authenticated;
grant update (
  name,
  description,
  phone,
  whatsapp,
  wilaya_id,
  commune,
  address_line,
  latitude,
  longitude,
  opening_hours,
  logo_url,
  cover_url,
  instagram_url,
  facebook_url
) on table public.stores to authenticated;
