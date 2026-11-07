-- Preserve offer price history and prevent short-term price inflation before promotions.
-- The 30-day reference window is an Arownd integrity rule, not a legal claim.

create table public.store_offer_price_history (
  id bigint generated always as identity primary key,
  offer_id uuid not null references public.store_offers(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  price integer not null check (price >= 0),
  recorded_at timestamptz not null default now()
);

create index store_offer_price_history_offer_time_idx
  on public.store_offer_price_history (offer_id, recorded_at desc);

alter table public.store_offer_price_history enable row level security;
revoke all on table public.store_offer_price_history from public, anon, authenticated;
grant select on table public.store_offer_price_history to authenticated;
grant all on table public.store_offer_price_history to service_role;

create policy "Merchants read own offer price history"
  on public.store_offer_price_history
  for select to authenticated
  using (public.is_store_owner(store_id));

create policy "Admins read offer price history"
  on public.store_offer_price_history
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Customers cannot read offer price history"
  on public.store_offer_price_history
  for select to authenticated
  using (public.has_role(auth.uid(), 'customer') and false);

create policy "Delivery cannot read offer price history"
  on public.store_offer_price_history
  for select to authenticated
  using (false);

-- No authenticated INSERT/UPDATE/DELETE policies: only the trigger records prices.

-- Legacy old_price values were merchant-writable before the column allowlist.
-- They are not trusted as reference prices; clear them before enabling promotions.
update public.store_offers
set old_price = null
where old_price is not null;

alter table public.store_offers
  add constraint store_offers_old_price_gt_price_check
  check (old_price is null or old_price > price);

insert into public.store_offer_price_history (offer_id, store_id, price, recorded_at)
select id, store_id, price, now()
from public.store_offers;

create or replace function public.record_store_offer_price_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'INSERT' or new.price is distinct from old.price then
    insert into public.store_offer_price_history (offer_id, store_id, price, recorded_at)
    values (new.id, new.store_id, new.price, now());
  end if;
  return new;
end;
$function$;

create trigger store_offer_price_history_after_write
after insert or update of price on public.store_offers
for each row
execute function public.record_store_offer_price_history();

-- Preserve compatibility with the existing web merchant editor: regular price
-- edits remain allowed when no promotion is active. The original price column
-- is still protected during an active promotion by the RPC/trigger guard.
grant update (price) on table public.store_offers to authenticated;

create or replace function public.guard_active_offer_promotion_price()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.old_price is not null
     and new.price is distinct from old.price
     and coalesce(current_setting('arownd.allow_offer_promotion_price_change', true), '') <> 'on' then
    raise exception 'active_promotion_must_end';
  end if;
  return new;
end;
$function$;

create trigger guard_active_offer_promotion_price_before_update
before update of price on public.store_offers
for each row
execute function public.guard_active_offer_promotion_price();

create or replace function public.end_merchant_offer_promotion(
  _offer_id uuid,
  _store_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  offer_row public.store_offers;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_store_owner(_store_id) then
    raise exception 'forbidden';
  end if;

  select so.*
    into offer_row
  from public.store_offers so
  where so.id = _offer_id
    and so.store_id = _store_id
  for update;

  if not found then
    raise exception 'merchant_offer_not_found';
  end if;
  if offer_row.old_price is null or offer_row.old_price <= offer_row.price then
    raise exception 'promotion_not_active';
  end if;

  perform set_config('arownd.allow_offer_promotion_price_change', 'on', true);

  update public.store_offers
  set price = offer_row.old_price,
      old_price = null,
      last_confirmed_at = now()
  where id = _offer_id
    and store_id = _store_id;
end;
$function$;

create or replace function public.start_merchant_offer_promotion(
  _offer_id uuid,
  _store_id uuid,
  _sale_price integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  offer_row public.store_offers;
  reference_cutoff timestamptz := now() - interval '30 days';
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_store_owner(_store_id) then
    raise exception 'forbidden';
  end if;
  if _sale_price is null or _sale_price <= 0 then
    raise exception 'invalid_promotion_price';
  end if;

  select so.*
    into offer_row
  from public.store_offers so
  where so.id = _offer_id
    and so.store_id = _store_id
  for update;

  if not found then
    raise exception 'merchant_offer_not_found';
  end if;
  if offer_row.old_price is not null then
    raise exception 'promotion_already_active';
  end if;
  if _sale_price >= offer_row.price then
    raise exception 'promotion_price_must_be_lower';
  end if;

  -- Require the current regular price to have existed for the full reference
  -- window and reject if a lower price was offered during that same window.
  if not exists (
    select 1
    from public.store_offer_price_history h
    where h.offer_id = _offer_id
      and h.price = offer_row.price
      and h.recorded_at <= reference_cutoff
  ) or exists (
    select 1
    from public.store_offer_price_history h
    where h.offer_id = _offer_id
      and h.recorded_at >= reference_cutoff
      and h.price < offer_row.price
  ) then
    raise exception 'promotion_reference_price_unavailable';
  end if;

  update public.store_offers
  set old_price = offer_row.price,
      price = _sale_price,
      last_confirmed_at = now()
  where id = _offer_id
    and store_id = _store_id;
end;
$function$;

revoke all on function public.record_store_offer_price_history() from public, anon, authenticated;
revoke all on function public.guard_active_offer_promotion_price() from public, anon, authenticated;
revoke all on function public.start_merchant_offer_promotion(uuid, uuid, integer) from public, anon;
revoke all on function public.end_merchant_offer_promotion(uuid, uuid) from public, anon;
grant execute on function public.start_merchant_offer_promotion(uuid, uuid, integer) to authenticated;
grant execute on function public.end_merchant_offer_promotion(uuid, uuid) to authenticated;
