-- Make shipment status changes and their audit log one atomic operation.
-- The existing shipment transition trigger remains the source of truth for valid transitions.

create or replace function public.update_shipment_status(
  _shipment_id uuid,
  _status text,
  _note text default null
)
returns public.shipments
language plpgsql
security definer
set search_path = public
as $function$
declare
  shipment_row public.shipments;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if _status is null or _status not in (
    'pending',
    'accepted',
    'rejected',
    'picked_up',
    'in_transit',
    'delivered',
    'failed',
    'returned'
  ) then
    raise exception 'invalid_shipment_status';
  end if;

  if _note is not null and length(_note) > 1000 then
    raise exception 'shipment_note_too_long';
  end if;

  -- Lock first so concurrent status changes cannot interleave.
  select *
  into shipment_row
  from public.shipments
  where id = _shipment_id
  for update;

  if not found then
    raise exception 'shipment_not_found';
  end if;

  -- SECURITY DEFINER bypasses RLS, so ownership must be checked explicitly.
  if not public.has_role(auth.uid(), 'admin'::public.app_role)
     and not exists (
       select 1
       from public.delivery_companies dc
       where dc.id = shipment_row.company_id
         and dc.user_id = auth.uid()
     ) then
    raise exception 'not_authorized';
  end if;

  -- Treat a retry of the current status as a no-op, not a duplicate audit event.
  if shipment_row.status = _status then
    return shipment_row;
  end if;

  -- The audit trigger writes the log in the same transaction as this update.
  perform set_config('arownd.shipment_status_note', coalesce(nullif(trim(_note), ''), ''), true);

  -- The existing guard_shipment_status_transition trigger validates the transition.
  update public.shipments
  set status = _status,
      updated_at = now()
  where id = _shipment_id
  returning * into shipment_row;

  perform set_config('arownd.shipment_status_note', '', true);
  return shipment_row;
end;
$function$;

-- Audit every status change, including existing internal cancellation paths and
-- any authorized direct update, so no code path can omit the history row.
create or replace function public.log_shipment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.status is distinct from old.status then
    insert into public.shipment_status_logs (shipment_id, status, note)
    values (
      new.id,
      new.status,
      nullif(current_setting('arownd.shipment_status_note', true), '')
    );
  end if;
  return new;
end;
$function$;

drop trigger if exists shipment_status_audit_log on public.shipments;
create trigger shipment_status_audit_log
after update of status on public.shipments
for each row
execute function public.log_shipment_status_change();

revoke all on function public.log_shipment_status_change() from public, anon, authenticated;

revoke all on function public.update_shipment_status(uuid, text, text)
  from public, anon;
grant execute on function public.update_shipment_status(uuid, text, text)
  to authenticated;
