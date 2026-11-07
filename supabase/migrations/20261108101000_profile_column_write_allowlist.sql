-- Keep profile writes restricted to user-editable columns while retaining
-- the user_id conflict key required by the existing owner-scoped upsert.
revoke insert on public.profiles from authenticated;
grant insert (user_id, full_name, phone, wilaya_id, commune, avatar_url)
  on public.profiles to authenticated;

grant update (user_id)
  on public.profiles to authenticated;
