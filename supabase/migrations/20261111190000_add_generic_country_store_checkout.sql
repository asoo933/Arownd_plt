-- Generic location columns while preserving legacy Algeria identifiers.
-- Country activation remains controlled exclusively by countries.is_enabled.
-- Checkout/store RPCs are intentionally handled in a later migration after
-- country-specific delivery fee rules have been modelled and verified.

begin;

alter table public.profiles add column if not exists secondary_region_id bigint;
alter table public.stores add column if not exists secondary_region_id bigint;
alter table public.user_addresses add column if not exists secondary_region_id bigint;
alter table public.orders add column if not exists secondary_region_id bigint;

update public.profiles
set secondary_region_id = daira_region_id
where secondary_region_id is null and daira_region_id is not null;

update public.user_addresses
set secondary_region_id = daira_region_id
where secondary_region_id is null and daira_region_id is not null;

update public.orders
set secondary_region_id = daira_region_id
where secondary_region_id is null and daira_region_id is not null;

alter table public.stores alter column wilaya_id drop not null;
alter table public.user_addresses alter column wilaya_id drop not null;
alter table public.orders alter column wilaya_id drop not null;

do $constraints$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_country_secondary_region_fkey') then
    alter table public.profiles add constraint profiles_country_secondary_region_fkey
      foreign key (country_code, secondary_region_id)
      references public.country_regions(country_code, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stores_country_secondary_region_fkey') then
    alter table public.stores add constraint stores_country_secondary_region_fkey
      foreign key (country_code, secondary_region_id)
      references public.country_regions(country_code, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_addresses_country_secondary_region_fkey') then
    alter table public.user_addresses add constraint user_addresses_country_secondary_region_fkey
      foreign key (country_code, secondary_region_id)
      references public.country_regions(country_code, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_country_secondary_region_fkey') then
    alter table public.orders add constraint orders_country_secondary_region_fkey
      foreign key (country_code, secondary_region_id)
      references public.country_regions(country_code, id) on delete restrict;
  end if;
end
$constraints$;

create index if not exists profiles_country_secondary_region_idx
  on public.profiles(country_code, secondary_region_id);
create index if not exists stores_country_secondary_region_idx
  on public.stores(country_code, secondary_region_id);
create index if not exists user_addresses_country_secondary_region_idx
  on public.user_addresses(country_code, secondary_region_id);
create index if not exists orders_country_secondary_region_idx
  on public.orders(country_code, secondary_region_id);

commit;
