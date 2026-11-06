-- Profiles: users may edit their own contact/profile fields, never verification state or identity.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT INSERT (user_id, full_name, phone, wilaya_id, commune, avatar_url)
  ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, wilaya_id, commune, avatar_url)
  ON TABLE public.profiles TO authenticated;

-- Stores: merchant-editable content only; verification, rating, ownership and commission stay protected.
REVOKE INSERT, UPDATE ON TABLE public.stores FROM PUBLIC, anon, authenticated;
GRANT INSERT (owner_id, name, slug, phone, whatsapp, wilaya_id, commune, address_line,
              latitude, longitude, opening_hours, category, subcategories)
  ON TABLE public.stores TO authenticated;
GRANT UPDATE (name, description, phone, whatsapp, wilaya_id, commune, address_line,
              latitude, longitude, opening_hours, logo_url, cover_url, instagram_url,
              facebook_url, category, subcategories)
  ON TABLE public.stores TO authenticated;

-- Product creators can edit catalog text, not ratings or view counters.
REVOKE INSERT, UPDATE ON TABLE public.products FROM PUBLIC, anon, authenticated;
GRANT INSERT (name, description, brand, category, created_by)
  ON TABLE public.products TO authenticated;
GRANT UPDATE (name, description, brand, category)
  ON TABLE public.products TO authenticated;

-- Delivery companies cannot approve themselves or change their commission.
REVOKE INSERT, UPDATE ON TABLE public.delivery_companies FROM PUBLIC, anon, authenticated;
GRANT INSERT (user_id, company_name, contact_name, contact_phone, email, license_number)
  ON TABLE public.delivery_companies TO authenticated;
GRANT UPDATE (company_name, contact_name, contact_phone, email, license_number)
  ON TABLE public.delivery_companies TO authenticated;

-- Order creation and financial fields remain inside the validated RPC.
REVOKE INSERT, UPDATE ON TABLE public.orders FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status) ON TABLE public.orders TO authenticated;

-- Delivery companies may advance shipment status only; timestamps are maintained by the trigger.
REVOKE UPDATE, DELETE ON TABLE public.shipments FROM PUBLIC, anon, authenticated;
GRANT UPDATE (status) ON TABLE public.shipments TO authenticated;
