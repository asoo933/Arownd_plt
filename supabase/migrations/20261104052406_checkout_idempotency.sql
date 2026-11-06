-- Idempotent checkout requests: a retry with the same key returns the
-- original order instead of reserving stock or notifying merchants twice.
create table if not exists public.checkout_idempotency (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_hash text not null,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);

create index if not exists checkout_idempotency_created_at_idx
  on public.checkout_idempotency (created_at);

alter table public.checkout_idempotency enable row level security;
revoke all on table public.checkout_idempotency from public, anon, authenticated;

-- Avoid PostgREST overload ambiguity: retain the previous implementation
-- under a non-API name and expose one keyed checkout RPC.
alter function public.create_order_with_delivery(
  jsonb, text, integer, text, text, text, text, text, text, uuid
) rename to create_order_with_delivery_unkeyed;

revoke all on function public.create_order_with_delivery_unkeyed(
  jsonb, text, integer, text, text, text, text, text, text, uuid
) from public, anon, authenticated;

create or replace function public.create_order_with_delivery(
  _items jsonb,
  _delivery_type text,
  _wilaya_id integer,
  _commune text,
  _address_line text,
  _full_name text,
  _phone text,
  _payment_method text,
  _receipt_url text,
  _delivery_company_id uuid,
  _idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $function$
declare
  current_user_id uuid := auth.uid();
  normalized_hash text;
  previous_hash text;
  previous_order_id uuid;
  created_order_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;
  if _idempotency_key is null then
    raise exception 'idempotency_key_required';
  end if;

  normalized_hash := md5(jsonb_build_object(
    'items', _items,
    'delivery_type', _delivery_type,
    'wilaya_id', _wilaya_id,
    'commune', _commune,
    'address_line', _address_line,
    'full_name', _full_name,
    'phone', _phone,
    'payment_method', _payment_method,
    'receipt_url', _receipt_url,
    'delivery_company_id', _delivery_company_id
  )::text);

  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text || ':' || _idempotency_key::text, 0)
  );

  select request_hash, order_id
    into previous_hash, previous_order_id
  from public.checkout_idempotency
  where user_id = current_user_id
    and idempotency_key = _idempotency_key;

  if found then
    if previous_hash <> normalized_hash then
      raise exception 'idempotency_key_reused_with_different_request';
    end if;
    if previous_order_id is null then
      raise exception 'idempotent_order_no_longer_available';
    end if;
    return previous_order_id;
  end if;

  created_order_id := public.create_order_with_delivery_unkeyed(
    _items, _delivery_type, _wilaya_id, _commune, _address_line,
    _full_name, _phone, _payment_method, _receipt_url, _delivery_company_id
  );

  insert into public.checkout_idempotency (
    user_id, idempotency_key, request_hash, order_id
  ) values (
    current_user_id, _idempotency_key, normalized_hash, created_order_id
  );

  return created_order_id;
end;
$function$;

revoke all on function public.create_order_with_delivery(
  jsonb, text, integer, text, text, text, text, text, text, uuid, uuid
) from public, anon;
grant execute on function public.create_order_with_delivery(
  jsonb, text, integer, text, text, text, text, text, text, uuid, uuid
) to authenticated;

