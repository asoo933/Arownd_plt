-- Verified review submission for the Native and web clients.
-- A review is accepted only after a delivered order or a collected reservation
-- containing the selected product/store. No client-side eligibility checks are trusted.

create or replace function public.submit_review(
  _target_type public.review_target_type,
  _target_id uuid,
  _rating integer,
  _comment text default null
)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  review_row public.reviews;
  normalized_comment text := nullif(btrim(_comment), '');
  is_eligible boolean := false;
begin
  if actor_id is null then
    raise exception 'not_authenticated';
  end if;

  if _rating is null or _rating < 1 or _rating > 5 then
    raise exception 'invalid_rating';
  end if;

  if normalized_comment is not null and char_length(normalized_comment) > 1000 then
    raise exception 'review_comment_too_long';
  end if;

  if _target_type = 'product' then
    if not exists (select 1 from public.products p where p.id = _target_id) then
      raise exception 'review_target_not_found';
    end if;

    select exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      join public.store_offers so on so.id = oi.offer_id
      where o.user_id = actor_id
        and o.status = 'delivered'
        and so.product_id = _target_id
      union all
      select 1
      from public.reservations r
      join public.store_offers so on so.id = r.offer_id
      where r.user_id = actor_id
        and r.status = 'collected'
        and so.product_id = _target_id
    ) into is_eligible;
  else
    if not exists (select 1 from public.stores s where s.id = _target_id) then
      raise exception 'review_target_not_found';
    end if;

    select exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.user_id = actor_id
        and o.status = 'delivered'
        and oi.store_id = _target_id
      union all
      select 1
      from public.reservations r
      where r.user_id = actor_id
        and r.status = 'collected'
        and r.store_id = _target_id
    ) into is_eligible;
  end if;

  if not is_eligible then
    raise exception 'review_not_verified';
  end if;

  insert into public.reviews (
    user_id, target_type, target_id, rating, comment, status
  )
  values (
    actor_id, _target_type, _target_id, _rating, normalized_comment, 'pending'
  )
  on conflict (user_id, target_type, target_id)
  do update set
    rating = excluded.rating,
    comment = excluded.comment,
    status = 'pending',
    updated_at = now()
  returning * into review_row;

  return review_row;
end;
$function$;

revoke all on function public.submit_review(public.review_target_type, uuid, integer, text) from public, anon;
grant execute on function public.submit_review(public.review_target_type, uuid, integer, text) to authenticated;

-- Review owners may read their own pending/rejected reviews; public users
-- continue to see approved reviews only through the existing public policy.
drop policy if exists "Users read own reviews" on public.reviews;
create policy "Users read own reviews"
  on public.reviews
  for select
  to authenticated
  using (user_id = (select auth.uid()));
