-- Fix E.164 validation in the merchant store creation RPC.
-- The regex must contain one escaped plus sign so PostgreSQL's regex engine
-- treats it as a literal '+' rather than a quantifier.

create or replace function public.create_my_store_for_account(
  _store_name text,
  _slug text,
  _phone text,
  _whatsapp text,
  _region_id bigint,
  _secondary_region_id bigint,
  _commune text,
  _address_line text,
  _latitude double precision,
  _longitude double precision,
  _opening_hours jsonb,
  _category text,
  _subcategories text[]
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_country_code text;
  current_calling_code text;
  created_store_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  if nullif(btrim(_store_name), '') is null
     or nullif(btrim(_slug), '') is null
     or nullif(btrim(_phone), '') is null
     or _region_id is null
     or nullif(btrim(_commune), '') is null
     or nullif(btrim(_address_line), '') is null
     or _opening_hours is null
     or jsonb_typeof(_opening_hours) <> 'object'
     or nullif(_opening_hours ->> 'open', '') is null
     or nullif(_opening_hours ->> 'close', '') is null then
    raise exception 'invalid_store_input';
  end if;

  select p.country_code, c.calling_code
    into current_country_code, current_calling_code
  from public.profiles p
  join public.countries c on c.code = p.country_code
  where p.user_id = auth.uid()
  for update of p;

  if not found then raise exception 'profile_not_found'; end if;
  if current_calling_code is null
     or _phone !~ '^\+[1-9][0-9]{7,14}$'
     or left(_phone, length(current_calling_code)) <> current_calling_code then
    raise exception 'invalid_country_phone';
  end if;
  if nullif(btrim(_whatsapp), '') is not null and (
     _whatsapp !~ '^\+[1-9][0-9]{7,14}$'
     or left(_whatsapp, length(current_calling_code)) <> current_calling_code
  ) then
    raise exception 'invalid_country_whatsapp';
  end if;

  if _category is not null and not exists (
    select 1 from public.categories c
    where c.id = _category and c.parent_id is null and c.is_active = true
  ) then raise exception 'invalid_store_category'; end if;

  if exists (
    select 1 from unnest(coalesce(_subcategories, '{}'::text[])) selected(id)
    where not exists (
      select 1 from public.categories c
      where c.id = selected.id and c.parent_id = _category and c.is_active = true
    )
  ) then raise exception 'invalid_store_subcategory'; end if;

  if exists (select 1 from public.stores s where s.owner_id = auth.uid()) then
    raise exception 'store_already_exists';
  end if;

  insert into public.stores (
    owner_id, name, slug, phone, whatsapp, wilaya_id,
    country_code, region_id, secondary_region_id, commune, address_line,
    latitude, longitude, opening_hours, category, subcategories
  ) values (
    auth.uid(), btrim(_store_name), btrim(_slug),
    btrim(_phone), nullif(btrim(_whatsapp), ''), null,
    current_country_code, _region_id, _secondary_region_id,
    btrim(_commune), btrim(_address_line),
    _latitude, _longitude, _opening_hours,
    nullif(btrim(_category), ''), coalesce(_subcategories, '{}'::text[])
  ) returning id into created_store_id;

  update public.profiles
  set account_type = 'merchant'::public.account_type
  where user_id = auth.uid();

  insert into public.user_roles (user_id, role)
  select auth.uid(), 'merchant'::public.app_role
  where not exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'merchant'::public.app_role
  );

  return created_store_id;
end;
$function$;
