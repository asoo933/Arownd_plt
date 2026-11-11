-- Generate short, readable reservation pickup codes in the AR-XXXX-00 format.
-- Existing SQ codes remain valid and can still be confirmed by merchants.

create or replace function public.create_reservation(
  _offer_id uuid,
  _quantity int default 1,
  _hours int default 3,
  _options jsonb default '{}'::jsonb
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.store_offers;
  r public.reservations;
  c text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if _quantity < 1 or _quantity > 10 then
    raise exception 'invalid_quantity';
  end if;

  -- Reservation duration must be between 1 and 72 hours.
  if _hours < 1 or _hours > 72 then
    raise exception 'invalid_hours';
  end if;

  select * into o from public.store_offers where id = _offer_id for update;
  if not found then
    raise exception 'offer_not_found';
  end if;

  if not o.is_available or o.stock_quantity < _quantity then
    raise exception 'out_of_stock';
  end if;

  loop
    c := 'AR-' || (
      select string_agg(
        substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ', floor(random() * 26)::int + 1, 1),
        ''
      )
      from generate_series(1, 4)
    ) || '-' || lpad(floor(random() * 100)::int::text, 2, '0');
    exit when not exists (select 1 from public.reservations where code = c);
  end loop;

  update public.store_offers
  set stock_quantity = stock_quantity - _quantity,
      is_available = (stock_quantity - _quantity) > 0
  where id = _offer_id;

  insert into public.reservations (code, user_id, store_id, offer_id, quantity, options, expires_at)
  values (c, auth.uid(), o.store_id, o.id, _quantity, coalesce(_options, '{}'::jsonb), now() + make_interval(hours => _hours))
  returning * into r;

  return r;
end;
$$;
