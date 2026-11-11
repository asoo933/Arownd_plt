-- Grant only the generic location columns needed by owner-scoped writes.
-- Account country and legacy compatibility columns remain server-managed.

begin;

grant insert (user_id, full_name, phone, region_id, secondary_region_id, commune, avatar_url)
  on public.profiles to authenticated;
grant update (full_name, phone, region_id, secondary_region_id, commune, avatar_url)
  on public.profiles to authenticated;

grant update (region_id, secondary_region_id)
  on public.stores to authenticated;

commit;