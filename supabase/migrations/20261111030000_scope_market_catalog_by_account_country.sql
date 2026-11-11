-- Restrict the customer-facing catalog to the authenticated user's account country.
-- This migration depends on the country foundation and immutable account-country
-- migrations. Categories remain global; products are visible through offers in
-- the user's market, because the product master is shared across store offers.

begin;

-- Remove the legacy public catalog policies. PostgreSQL permissive policies are
-- OR-combined, so leaving any USING (true) policy would defeat market isolation.
drop policy if exists "Stores public read" on public.stores;
drop policy if exists "Offers public read" on public.store_offers;
drop policy if exists "Products public read" on public.products;
drop policy if exists "Images public read" on public.product_images;
drop policy if exists "Reviews public and own read" on public.reviews;

create policy "Stores read in account country"
  on public.stores
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.country_code = stores.country_code
    )
  );

create policy "Offers read in account country"
  on public.store_offers
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.stores s
      join public.profiles p
        on p.user_id = (select auth.uid())
       and p.country_code = s.country_code
      where s.id = store_offers.store_id
    )
  );

create policy "Products read through account country offers"
  on public.products
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_offers so
      join public.stores s on s.id = so.store_id
      join public.profiles p
        on p.user_id = (select auth.uid())
       and p.country_code = s.country_code
      where so.product_id = products.id
    )
  );

create policy "Images read in account country"
  on public.product_images
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_offers so
      join public.stores s on s.id = so.store_id
      join public.profiles p
        on p.user_id = (select auth.uid())
       and p.country_code = s.country_code
      where so.id = product_images.offer_id
    )
  );

create policy "Reviews read in account country"
  on public.reviews
  for select
  to authenticated
  using (
    (reviews.status = 'approved'::public.review_status
      or reviews.user_id = (select auth.uid()))
    and exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and (
          (
            reviews.target_type = 'store'::public.review_target_type
            and exists (
              select 1
              from public.stores s
              where s.id = reviews.target_id
                and s.country_code = p.country_code
            )
          )
          or
          (
            reviews.target_type = 'product'::public.review_target_type
            and exists (
              select 1
              from public.store_offers so
              join public.stores s on s.id = so.store_id
              where so.product_id = reviews.target_id
                and s.country_code = p.country_code
            )
          )
        )
    )
  );

-- Direct store writes must not bypass the immutable account-country boundary.
drop policy if exists "Merchants create own store" on public.stores;
create policy "Merchants create own store in account country"
  on public.stores
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and has_role((select auth.uid()), 'merchant'::public.app_role)
    and is_verified = true
    and exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.country_code = stores.country_code
    )
  );

drop policy if exists "Owners update store" on public.stores;
create policy "Owners update own store in account country"
  on public.stores
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.country_code = stores.country_code
    )
  )
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.country_code = stores.country_code
    )
  );

comment on policy "Stores read in account country" on public.stores is
  'Authenticated customers can read stores only from their immutable account country.';
comment on policy "Offers read in account country" on public.store_offers is
  'Offers inherit their market from the owning store and are visible only in the account country.';
comment on policy "Products read through account country offers" on public.products is
  'Shared product records are visible only when at least one offer exists in the account country.';
comment on policy "Images read in account country" on public.product_images is
  'Product images inherit market visibility from their offer and store.';

commit;
