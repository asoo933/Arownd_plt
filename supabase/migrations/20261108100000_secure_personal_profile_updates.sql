-- Protect server-controlled profile flags and invalidate phone verification
-- whenever the account owner changes the phone number.

revoke update on public.profiles from authenticated;
grant update (full_name, phone, wilaya_id, commune, avatar_url)
  on public.profiles to authenticated;

create or replace function public.prepare_profile_update()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if new.phone is distinct from old.phone then
    new.is_phone_verified := false;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function public.prepare_profile_update()
  from public, anon, authenticated;

drop trigger if exists prepare_profile_update on public.profiles;
create trigger prepare_profile_update
before update on public.profiles
for each row
execute function public.prepare_profile_update();
