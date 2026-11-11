drop policy if exists "Stores browsing country read" on public.stores;
drop policy if exists "Stores browsing country and owner read" on public.stores;
create policy "Stores browsing country and owner read" on public.stores
for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.browsing_country_code = stores.country_code
  )
);

drop policy if exists "Offers browsing country read" on public.store_offers;
drop policy if exists "Offers browsing country and owner read" on public.store_offers;
create policy "Offers browsing country and owner read" on public.store_offers
for select to authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = store_offers.store_id
      and s.owner_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.stores s
    join public.profiles p on p.user_id = (select auth.uid())
    where s.id = store_offers.store_id
      and p.browsing_country_code = s.country_code
  )
);

drop policy if exists "Products browsing country read" on public.products;
drop policy if exists "Products browsing country and owner read" on public.products;
create policy "Products browsing country and owner read" on public.products
for select to authenticated
using (
  exists (
    select 1
    from public.store_offers so
    join public.stores s on s.id = so.store_id
    where so.product_id = products.id
      and s.owner_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.store_offers so
    join public.stores s on s.id = so.store_id
    join public.profiles p on p.user_id = (select auth.uid())
    where so.product_id = products.id
      and p.browsing_country_code = s.country_code
  )
);

drop policy if exists "Images browsing country read" on public.product_images;
drop policy if exists "Images browsing country and owner read" on public.product_images;
create policy "Images browsing country and owner read" on public.product_images
for select to authenticated
using (
  exists (
    select 1
    from public.store_offers so
    join public.stores s on s.id = so.store_id
    where so.id = product_images.offer_id
      and s.owner_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.store_offers so
    join public.stores s on s.id = so.store_id
    join public.profiles p on p.user_id = (select auth.uid())
    where so.id = product_images.offer_id
      and p.browsing_country_code = s.country_code
  )
);

drop policy if exists "Reviews browsing country and own read" on public.reviews;
drop policy if exists "Reviews browsing country, owner and own read" on public.reviews;
create policy "Reviews browsing country, owner and own read" on public.reviews
for select to authenticated
using (
  user_id = (select auth.uid())
  or (
    status = 'approved'::public.review_status
    and (
      (
        target_type = 'store'::public.review_target_type
        and exists (
          select 1
          from public.stores s
          where s.id = reviews.target_id
            and (
              s.owner_id = (select auth.uid())
              or exists (
                select 1
                from public.profiles p
                where p.user_id = (select auth.uid())
                  and p.browsing_country_code = s.country_code
              )
            )
        )
      )
      or (
        target_type = 'product'::public.review_target_type
        and exists (
          select 1
          from public.store_offers so
          join public.stores s on s.id = so.store_id
          where so.product_id = reviews.target_id
            and (
              s.owner_id = (select auth.uid())
              or exists (
                select 1
                from public.profiles p
                where p.user_id = (select auth.uid())
                  and p.browsing_country_code = s.country_code
              )
            )
        )
      )
    )
  )
);
