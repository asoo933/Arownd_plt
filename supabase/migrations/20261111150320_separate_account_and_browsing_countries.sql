alter table public.profiles
  add column if not exists browsing_country_code text;

update public.profiles
set browsing_country_code = country_code
where browsing_country_code is null;

alter table public.profiles
  alter column browsing_country_code set not null;

alter table public.profiles
  add constraint profiles_browsing_country_code_fkey
  foreign key (browsing_country_code) references public.countries(code);

create or replace function public.validate_profile_browsing_country()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if tg_op = 'INSERT' then
    new.browsing_country_code := coalesce(
      nullif(upper(btrim(new.browsing_country_code)), ''),
      new.country_code
    );
  elsif new.browsing_country_code is null then
    new.browsing_country_code := new.country_code;
  end if;

  if tg_op = 'INSERT'
     or old.browsing_country_code is distinct from new.browsing_country_code then
    if not exists (
      select 1 from public.countries c
      where c.code = new.browsing_country_code and c.is_enabled = true
    ) then
      raise exception 'browsing_country_not_available';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.validate_profile_browsing_country() from public, anon, authenticated;

drop trigger if exists profiles_browsing_country_guard on public.profiles;
create trigger profiles_browsing_country_guard
before insert or update of browsing_country_code on public.profiles
for each row execute function public.validate_profile_browsing_country();

drop policy if exists "Stores account country read" on public.stores;
create policy "Stores browsing country read" on public.stores
for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.browsing_country_code = stores.country_code
  )
);

drop policy if exists "Offers account country read" on public.store_offers;
create policy "Offers browsing country read" on public.store_offers
for select to authenticated
using (
  exists (
    select 1
    from public.stores s
    join public.profiles p on p.user_id = (select auth.uid())
    where s.id = store_offers.store_id
      and p.browsing_country_code = s.country_code
  )
);

drop policy if exists "Products account country read" on public.products;
create policy "Products browsing country read" on public.products
for select to authenticated
using (
  exists (
    select 1
    from public.store_offers so
    join public.stores s on s.id = so.store_id
    join public.profiles p on p.user_id = (select auth.uid())
    where so.product_id = products.id
      and p.browsing_country_code = s.country_code
  )
);

drop policy if exists "Images account country read" on public.product_images;
create policy "Images browsing country read" on public.product_images
for select to authenticated
using (
  exists (
    select 1
    from public.store_offers so
    join public.stores s on s.id = so.store_id
    join public.profiles p on p.user_id = (select auth.uid())
    where so.id = product_images.offer_id
      and p.browsing_country_code = s.country_code
  )
);

drop policy if exists "Reviews account country and own read" on public.reviews;
create policy "Reviews browsing country and own read" on public.reviews
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
          join public.profiles p on p.user_id = (select auth.uid())
          where s.id = reviews.target_id
            and p.browsing_country_code = s.country_code
        )
      )
      or (
        target_type = 'product'::public.review_target_type
        and exists (
          select 1
          from public.store_offers so
          join public.stores s on s.id = so.store_id
          join public.profiles p on p.user_id = (select auth.uid())
          where so.product_id = reviews.target_id
            and p.browsing_country_code = s.country_code
        )
      )
    )
  )
);
