-- Assign the account identity and its matching application role at signup.
-- The client may request only the public personal or merchant account types.
-- Delivery-company identity continues to be assigned by its dedicated workflow.
begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  requested_country_code text;
  requested_account_type public.account_type;
  requested_role public.app_role;
begin
  requested_country_code := upper(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'country_code'), ''),
      'DZ'
    )
  );

  if not exists (
    select 1 from public.countries c
    where c.code = requested_country_code and c.is_enabled = true
  ) then
    raise exception 'country_not_available';
  end if;

  case lower(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'account_type'), ''), 'personal'))
    when 'personal' then
      requested_account_type := 'personal'::public.account_type;
      requested_role := 'customer'::public.app_role;
    when 'merchant' then
      requested_account_type := 'merchant'::public.account_type;
      requested_role := 'merchant'::public.app_role;
    else
      raise exception 'invalid_account_type';
  end case;

  insert into public.profiles (user_id, full_name, account_type, country_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    requested_account_type,
    requested_country_code
  );

  insert into public.user_roles (user_id, role)
  values (new.id, requested_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$function$;

commit;
