-- Prevent profile inserts from resolving the stores-only NEW.whatsapp field.
-- The trigger function is shared by profiles, stores, orders and user_addresses.
begin;

create or replace function public.enforce_daira_region_selection()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  selected_country_enabled boolean;
  selected_calling_code text;
  primary_level public.country_region_levels;
  secondary_level public.country_region_levels;
  primary_region public.country_regions;
  secondary_region public.country_regions;
  primary_legacy_wilaya integer;
  phone_changed boolean := false;
begin
  if tg_op = 'UPDATE'
     and old.country_code is not distinct from new.country_code
     and old.region_id is not distinct from new.region_id
     and old.secondary_region_id is not distinct from new.secondary_region_id
     and old.wilaya_id is not distinct from new.wilaya_id then
    if tg_table_name = 'stores' then
      phone_changed := old.phone is distinct from new.phone
        or old.whatsapp is distinct from new.whatsapp;
    else
      phone_changed := old.phone is distinct from new.phone;
    end if;
    if not phone_changed then return new; end if;
  end if;

  select c.is_enabled, c.calling_code
    into selected_country_enabled, selected_calling_code
  from public.countries c
  where c.code = new.country_code;

  if not found or selected_country_enabled is distinct from true then
    raise exception 'country_disabled';
  end if;

  if tg_table_name = 'profiles' and new.region_id is null then
    if new.secondary_region_id is not null then
      raise exception 'secondary_region_requires_primary';
    end if;
    new.wilaya_id := null;
    new.daira_region_id := null;
  else
    if new.region_id is null then raise exception 'primary_region_required'; end if;

    select * into primary_level
    from public.country_region_levels
    where country_code = new.country_code and level = 1;
    if not found then raise exception 'country_region_levels_not_configured'; end if;

    select * into primary_region
    from public.country_regions r
    where r.id = new.region_id
      and r.country_code = new.country_code
      and r.parent_id is null
      and r.is_enabled
      and r.region_type = any(primary_level.region_types);
    if not found then raise exception 'invalid_primary_region'; end if;

    select r.legacy_wilaya_id into primary_legacy_wilaya
    from public.country_regions r
    where r.id = primary_region.id and r.country_code = new.country_code;

    select * into secondary_level
    from public.country_region_levels
    where country_code = new.country_code and level = 2;

    if found and secondary_level.is_required and new.secondary_region_id is null then
      raise exception 'secondary_region_required';
    end if;

    if new.secondary_region_id is not null then
      if secondary_level.country_code is null then
        raise exception 'secondary_region_not_supported';
      end if;
      select * into secondary_region
      from public.country_regions r
      where r.id = new.secondary_region_id
        and r.country_code = new.country_code
        and r.parent_id = new.region_id
        and r.is_enabled
        and r.region_type = any(secondary_level.region_types);
      if not found then raise exception 'invalid_secondary_region'; end if;
    end if;

    if new.country_code = 'DZ' then
      if primary_legacy_wilaya is null then raise exception 'legacy_wilaya_mapping_missing'; end if;
      new.wilaya_id := primary_legacy_wilaya;
      if tg_table_name in ('profiles', 'orders', 'user_addresses') then
        new.daira_region_id := new.secondary_region_id;
      end if;
    else
      new.wilaya_id := null;
      if tg_table_name in ('profiles', 'orders', 'user_addresses') then
        new.daira_region_id := null;
      end if;
    end if;
  end if;

  if new.phone is not null and length(btrim(new.phone)) > 0 then
    if selected_calling_code is null
       or new.phone !~ '^\\+[1-9][0-9]{7,14}$'
       or left(new.phone, length(selected_calling_code)) <> selected_calling_code then
      raise exception 'invalid_country_phone';
    end if;
  end if;

  -- Only the stores row type has a whatsapp column.
  if tg_table_name = 'stores' then
    if new.whatsapp is not null and length(btrim(new.whatsapp)) > 0 then
      if selected_calling_code is null
         or new.whatsapp !~ '^\\+[1-9][0-9]{7,14}$'
         or left(new.whatsapp, length(selected_calling_code)) <> selected_calling_code then
        raise exception 'invalid_country_whatsapp';
      end if;
    end if;
  end if;

  return new;
end;
$function$;

commit;
