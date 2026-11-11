-- Verified Saudi governorates only.
-- Names and parent regions are taken from official regional-government sources:
-- * Asir Region Emirate / Asir Development Authority: 17 governorates.
-- * Al Madinah Region Emirate: 8 governorates.
-- Internal codes below are stable application identifiers; they are NOT
-- represented as official NCAR geographic codes.
begin;

insert into public.country_regions (
  country_code, parent_id, code, name_ar, region_type, is_enabled
)
select
  'SA',
  parent_region.id,
  source.code,
  source.name_ar,
  'governorate',
  true
from (
  values
    ('SA-13-GOV-01', 'خميس مشيط'),
    ('SA-13-GOV-02', 'بيشة'),
    ('SA-13-GOV-03', 'محايل'),
    ('SA-13-GOV-04', 'تثليث'),
    ('SA-13-GOV-05', 'النماص'),
    ('SA-13-GOV-06', 'ظهران الجنوب'),
    ('SA-13-GOV-07', 'سراة عبيدة'),
    ('SA-13-GOV-08', 'رجال ألمع'),
    ('SA-13-GOV-09', 'بلقرن'),
    ('SA-13-GOV-10', 'أحد رفيدة'),
    ('SA-13-GOV-11', 'تنومة'),
    ('SA-13-GOV-12', 'بارق'),
    ('SA-13-GOV-13', 'المجاردة'),
    ('SA-13-GOV-14', 'طريب'),
    ('SA-13-GOV-15', 'البرك'),
    ('SA-13-GOV-16', 'الحرجة'),
    ('SA-13-GOV-17', 'الأمواه')
) as source(code, name_ar)
join public.country_regions parent_region
  on parent_region.country_code = 'SA'
 and parent_region.code = 'SA-13'
 and parent_region.parent_id is null
on conflict (country_code, code) do nothing;

insert into public.country_regions (
  country_code, parent_id, code, name_ar, region_type, is_enabled
)
select
  'SA',
  parent_region.id,
  source.code,
  source.name_ar,
  'governorate',
  true
from (
  values
    ('SA-03-GOV-01', 'ينبع'),
    ('SA-03-GOV-02', 'العلا'),
    ('SA-03-GOV-03', 'المهد'),
    ('SA-03-GOV-04', 'الحناكية'),
    ('SA-03-GOV-05', 'وادي الفرع'),
    ('SA-03-GOV-06', 'العيص'),
    ('SA-03-GOV-07', 'خيبر'),
    ('SA-03-GOV-08', 'بدر')
) as source(code, name_ar)
join public.country_regions parent_region
  on parent_region.country_code = 'SA'
 and parent_region.code = 'SA-03'
 and parent_region.parent_id is null
on conflict (country_code, code) do nothing;

commit;
