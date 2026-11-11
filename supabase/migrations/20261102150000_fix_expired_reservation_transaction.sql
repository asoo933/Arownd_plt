-- Fix expired reservation handling without rolling back the expiry and stock release.
-- PostgreSQL rolls back all writes in the current transaction when an exception is raised.
-- Return the expired row instead; the client translates this committed result into the
-- existing reservation_expired user-facing error after the RPC transaction completes.

create or replace function public.merchant_confirm_reservation(_code text)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.reservations;
begin
  select *
    into r
    from public.reservations
   where code = upper(trim(_code))
   for update;

  if not found or not public.is_store_owner(r.store_id) then
    raise exception 'reservation_not_found';
  end if;

  if r.status <> 'pending' then
    raise exception 'reservation_%', r.status;
  end if;

  if r.expires_at < now() then
    update public.reservations
       set status = 'expired'
     where id = r.id
     returning * into r;

    update public.store_offers
       set stock_quantity = stock_quantity + r.quantity,
           is_available = true
     where id = r.offer_id;

    return r;
  end if;

  update public.reservations
     set status = 'collected'
   where id = r.id
   returning * into r;

  return r;
end;
$$;
