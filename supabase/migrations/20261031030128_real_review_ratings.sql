-- Replace placeholder/default ratings with averages from approved reviews only.
alter table public.stores alter column rating set default 0;
alter table public.products alter column rating set default 0;

create or replace function public.update_target_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  target_type_value public.review_target_type;
  target_id_value uuid;
  target_avg numeric(2,1);
  target_table text;
begin
  -- If a review is moved to another target, refresh the old target as well.
  if tg_op = 'UPDATE'
     and (old.target_type is distinct from new.target_type
          or old.target_id is distinct from new.target_id) then
    target_type_value := old.target_type;
    target_id_value := old.target_id;
    target_table := case target_type_value when 'product' then 'products' else 'stores' end;

    select coalesce(round(avg(r.rating)::numeric, 1), 0)
      into target_avg
      from public.reviews r
     where r.target_type = target_type_value
       and r.target_id = target_id_value
       and r.status = 'approved';

    execute format('update public.%I set rating = $1 where id = $2', target_table)
      using target_avg, target_id_value;
  end if;

  if tg_op = 'DELETE' then
    target_type_value := old.target_type;
    target_id_value := old.target_id;
  else
    target_type_value := new.target_type;
    target_id_value := new.target_id;
  end if;

  target_table := case target_type_value when 'product' then 'products' else 'stores' end;

  select coalesce(round(avg(r.rating)::numeric, 1), 0)
    into target_avg
    from public.reviews r
   where r.target_type = target_type_value
     and r.target_id = target_id_value
     and r.status = 'approved';

  execute format('update public.%I set rating = $1 where id = $2', target_table)
    using target_avg, target_id_value;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

-- Backfill all existing records; no reviews means rating 0, never a fabricated 4.5.
update public.stores s
   set rating = coalesce((
     select round(avg(r.rating)::numeric, 1)
       from public.reviews r
      where r.target_type = 'store'
        and r.target_id = s.id
        and r.status = 'approved'
   ), 0);

update public.products p
   set rating = coalesce((
     select round(avg(r.rating)::numeric, 1)
       from public.reviews r
      where r.target_type = 'product'
        and r.target_id = p.id
        and r.status = 'approved'
   ), 0);
