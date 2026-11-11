-- Persist the selected account country at signup and make it immutable.
-- Must run after 20261111013000_introduce_country_and_region_foundation.sql.
-- Existing profiles keep their current country_code (the foundation migration
-- defaults legacy accounts to DZ); existing auth trigger behavior is preserved.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  selected_country_code text;
begin
  selected_country_code := coalesce(
    nullif(upper(btrim(new.raw_user_meta_data->>'country_code')), ''),
    'DZ'
  );

  if not exists (
    select 1
    from public.countries c
    where c.code = selected_country_code
      and c.is_enabled = true
  ) then
    raise exception using
      errcode = '23514',
      message = 'country_not_available';
  end if;

  insert into public.profiles (user_id, full_name, country_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    selected_country_code
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict do nothing;

  return new;
end;
$function$;

create or replace function public.prevent_profile_country_change()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if new.country_code is distinct from old.country_code then
    raise exception using
      errcode = '23514',
      message = 'account_country_immutable';
  end if;

  return new;
end;
$function$;

drop trigger if exists profiles_country_immutable on public.profiles;

create trigger profiles_country_immutable
before update of country_code
on public.profiles
for each row
execute function public.prevent_profile_country_change();

comment on function public.prevent_profile_country_change() is
  'Prevents changing the account country after profile creation. The country is selected before signup and remains immutable.';

commit;
