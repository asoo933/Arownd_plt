create or replace function public.get_my_store_analytics(_store_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not exists (
    select 1 from public.stores s
    where s.id = _store_id and s.owner_id = auth.uid()
  ) then
    raise exception 'merchant_store_not_found';
  end if;

  select jsonb_build_object(
    'orders_total', (
      select count(*) from public.merchant_orders mo where mo.store_id = _store_id
    ),
    'delivered_orders', (
      select count(*) from public.merchant_orders mo
      where mo.store_id = _store_id and mo.status = 'delivered'
    ),
    'active_orders', (
      select count(*) from public.merchant_orders mo
      where mo.store_id = _store_id and mo.status in ('pending', 'quoted', 'confirmed', 'shipped')
    ),
    'cancelled_orders', (
      select count(*) from public.merchant_orders mo
      where mo.store_id = _store_id and mo.status = 'cancelled'
    ),
    'delivered_revenue', (
      select coalesce(sum(mo.subtotal), 0) from public.merchant_orders mo
      where mo.store_id = _store_id and mo.status = 'delivered'
    ),
    'average_delivered_order', (
      select coalesce(round(avg(mo.subtotal)), 0) from public.merchant_orders mo
      where mo.store_id = _store_id and mo.status = 'delivered'
    ),
    'product_count', (
      select count(*) from public.store_offers so where so.store_id = _store_id
    ),
    'low_stock_count', (
      select count(*) from public.store_offers so
      where so.store_id = _store_id and so.stock_quantity between 1 and 3
    ),
    'out_of_stock_count', (
      select count(*) from public.store_offers so
      where so.store_id = _store_id and so.stock_quantity = 0
    ),
    'store_rating', (
      select s.rating from public.stores s where s.id = _store_id
    ),
    'daily_delivered', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', days.day::date,
        'amount', coalesce(day_totals.amount, 0)
      ) order by days.day), '[]'::jsonb)
      from generate_series(current_date - 6, current_date, interval '1 day') as days(day)
      left join (
        select mo.created_at::date as day, sum(mo.subtotal)::bigint as amount
        from public.merchant_orders mo
        where mo.store_id = _store_id
          and mo.status = 'delivered'
          and mo.created_at >= current_date - 6
        group by mo.created_at::date
      ) day_totals on day_totals.day = days.day::date
    )
  ) into result;

  return result;
end;
$function$;

revoke all on function public.get_my_store_analytics(uuid) from public, anon;
grant execute on function public.get_my_store_analytics(uuid) to authenticated;
