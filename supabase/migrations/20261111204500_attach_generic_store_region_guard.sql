-- Attach the shared generic country-region validator to store writes.
begin;
drop trigger if exists stores_daira_region_guard on public.stores;
create trigger stores_daira_region_guard
before insert or update of country_code, region_id, secondary_region_id, wilaya_id, phone
on public.stores
for each row
execute function public.enforce_daira_region_selection();
commit;