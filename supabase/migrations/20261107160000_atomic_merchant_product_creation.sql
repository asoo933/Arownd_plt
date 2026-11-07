-- Atomic merchant product creation: product, offer, and optional uploaded images.
-- Images must already exist in the authenticated user's product-media folder.
create or replace function public.create_merchant_product_offer(
  _store_id uuid,
  _name text,
  _price integer,
  _stock_quantity integer,
  _category text,
  _brand text default null,
  _description text default null,
  _options jsonb default '{}'::jsonb,
  _images jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  created_product_id uuid;
  created_offer_id uuid;
  image_item jsonb;
  image_path text;
  image_url text;
  image_suffix text;
begin
  if actor_id is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1
    from public.stores s
    where s.id = _store_id
      and s.owner_id = actor_id
  ) then
    raise exception 'merchant_store_not_found';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = actor_id
      and ur.role = 'merchant'::public.app_role
  ) then
    raise exception 'merchant_role_required';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = actor_id
      and p.account_type = 'merchant'::public.account_type
  ) then
    raise exception 'merchant_account_required';
  end if;

  if nullif(btrim(_name), '') is null
     or char_length(btrim(_name)) > 120
     or _price is null or _price <= 0
     or _stock_quantity is null or _stock_quantity < 0 or _stock_quantity > 9999
     or _category is null
     or char_length(coalesce(_brand, '')) > 80
     or char_length(coalesce(_description, '')) > 3000 then
    raise exception 'invalid_merchant_product_input';
  end if;

  if not exists (
    select 1 from public.categories c
    where c.id = _category and c.is_active = true
  ) then
    raise exception 'invalid_merchant_product_category';
  end if;

  if _options is null or jsonb_typeof(_options) <> 'object' then
    raise exception 'invalid_merchant_product_options';
  end if;

  if exists (
    select 1 from jsonb_object_keys(_options) as option_key
    where option_key not in ('sizes', 'colors')
  ) then
    raise exception 'invalid_merchant_product_options';
  end if;

  if (_options ? 'sizes' and jsonb_typeof(_options -> 'sizes') <> 'array')
     or (_options ? 'colors' and jsonb_typeof(_options -> 'colors') <> 'array')
     or coalesce(jsonb_array_length(case when jsonb_typeof(_options -> 'sizes') = 'array' then _options -> 'sizes' else '[]'::jsonb end), 0) > 20
     or coalesce(jsonb_array_length(case when jsonb_typeof(_options -> 'colors') = 'array' then _options -> 'colors' else '[]'::jsonb end), 0) > 20 then
    raise exception 'invalid_merchant_product_options';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(
      case when jsonb_typeof(_options -> 'sizes') = 'array' then _options -> 'sizes' else '[]'::jsonb end
    ) item
    where jsonb_typeof(item) <> 'string'
       or char_length(btrim(item #>> '{}')) = 0
       or char_length(btrim(item #>> '{}')) > 40
  ) or exists (
    select 1
    from jsonb_array_elements(
      case when jsonb_typeof(_options -> 'colors') = 'array' then _options -> 'colors' else '[]'::jsonb end
    ) item
    where jsonb_typeof(item) <> 'string'
       or char_length(btrim(item #>> '{}')) = 0
       or char_length(btrim(item #>> '{}')) > 40
  ) then
    raise exception 'invalid_merchant_product_options';
  end if;

  if _images is null or jsonb_typeof(_images) <> 'array' then
    raise exception 'invalid_merchant_product_images';
  end if;

  if jsonb_array_length(_images) > 5 then
    raise exception 'invalid_merchant_product_images';
  end if;

  for image_item in select value from jsonb_array_elements(_images)
  loop
    image_path := image_item ->> 'path';
    image_url := image_item ->> 'url';
    image_suffix := '/storage/v1/object/public/product-media/' || image_path;

    if jsonb_typeof(image_item) <> 'object'
       or image_path is null
       or image_path not like actor_id::text || '/%'
       or image_url is null
       or image_url not like 'https://%'
       or right(image_url, char_length(image_suffix)) <> image_suffix
       or not exists (
         select 1 from storage.objects o
         where o.bucket_id = 'product-media'
           and o.name = image_path
       ) then
      raise exception 'invalid_merchant_product_image';
    end if;
  end loop;

  insert into public.products (
    name, description, brand, category, created_by
  ) values (
    btrim(_name), nullif(btrim(coalesce(_description, '')), ''),
    nullif(btrim(coalesce(_brand, '')), ''), _category, actor_id
  )
  returning id into created_product_id;

  insert into public.store_offers (
    store_id, product_id, price, stock_quantity, options
  ) values (
    _store_id, created_product_id, _price, _stock_quantity, coalesce(_options, '{}'::jsonb)
  )
  returning id into created_offer_id;

  insert into public.product_images (offer_id, image_url, is_primary)
  select
    created_offer_id,
    item.value ->> 'url',
    item.ordinality = 1
  from jsonb_array_elements(_images) with ordinality as item(value, ordinality);

  return created_offer_id;
end;
$function$;

revoke all on function public.create_merchant_product_offer(
  uuid, text, integer, integer, text, text, text, jsonb, jsonb
) from public, anon;
grant execute on function public.create_merchant_product_offer(
  uuid, text, integer, integer, text, text, text, jsonb, jsonb
) to authenticated;
