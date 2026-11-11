-- Re-run country-specific phone validation when phone fields change.
begin;

drop trigger if exists profiles_daira_region_guard on public.profiles;
create trigger profiles_daira_region_guard
before insert or update of country_code, wilaya_id, region_id, secondary_region_id, daira_region_id, phone
on public.profiles
for each row execute function public.enforce_daira_region_selection();

drop trigger if exists user_addresses_daira_region_guard on public.user_addresses;
create trigger user_addresses_daira_region_guard
before insert or update of country_code, wilaya_id, region_id, secondary_region_id, daira_region_id, phone
on public.user_addresses
for each row execute function public.enforce_daira_region_selection();

drop trigger if exists orders_daira_region_guard on public.orders;
create trigger orders_daira_region_guard
before insert or update of country_code, wilaya_id, region_id, secondary_region_id, daira_region_id, phone
on public.orders
for each row execute function public.enforce_daira_region_selection();

commit;