-- Seed UAE municipal authorities/municipal service areas explicitly as
-- municipality records. These are not asserted to be a uniform civil
-- administrative tier across the seven emirates.
-- Source: UAE Government official portal, local municipalities list
-- (updated 2024-12-30), cross-checked against the official RAK Municipality
-- directory for Ras Al Khaimah Municipality.
begin;

insert into public.country_regions (
  country_code, parent_id, code, name_ar, name_en, region_type, is_enabled
)
select
  'AE',
  parent_region.id,
  source.code,
  source.name_ar,
  source.name_en,
  'municipality',
  true
from (
  values
    ('AE-MUN-01', 'بلدية منطقة الظفرة', 'Al Dhafra Region Municipality', 'AE-01'),
    ('AE-MUN-02', 'بلدية مدينة أبوظبي', 'Abu Dhabi City Municipality', 'AE-01'),
    ('AE-MUN-03', 'بلدية مدينة العين', 'Al Ain City Municipality', 'AE-01'),
    ('AE-MUN-04', 'بلدية دبي', 'Dubai Municipality', 'AE-02'),
    ('AE-MUN-05', 'بلدية الشارقة', 'Sharjah Municipality', 'AE-03'),
    ('AE-MUN-06', 'دائرة البلدية والتخطيط - عجمان', 'Municipality and Planning Department - Ajman', 'AE-04'),
    ('AE-MUN-07', 'بلدية أم القيوين', 'Umm Al Quwain Municipality', 'AE-05'),
    ('AE-MUN-08', 'بلدية رأس الخيمة', 'Ras Al Khaimah Municipality', 'AE-06'),
    ('AE-MUN-09', 'بلدية الفجيرة', 'Fujairah Municipality', 'AE-07')
) as source(code, name_ar, name_en, parent_code)
join public.country_regions parent_region
  on parent_region.country_code = 'AE'
 and parent_region.code = source.parent_code
 and parent_region.parent_id is null
on conflict (country_code, code) do nothing;

commit;
