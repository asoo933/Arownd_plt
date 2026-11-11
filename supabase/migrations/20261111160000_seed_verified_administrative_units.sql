-- Seed only administrative units whose names, hierarchy, and/or official codes
-- were verified against primary government sources.
--
-- Morocco: Haut-Commissariat au Plan (HCP), RGPH 2024 legal population
-- by territorial collectivity, Oriental region (geographic codes 02.xxx).
-- Algeria: Official Gazette No. 25 (Law 26-06, 2026), establishing 69
-- wilayas, and Official Gazette No. 40 (Presidential Decree 26-206, 2026).
--
-- No unverified second-level units are inserted for Egypt, Saudi Arabia,
-- or the UAE in this migration.

begin;

-- Morocco: verified prefectures/provinces belonging to the Oriental region.
insert into public.country_regions (
  country_code, parent_id, code, name_ar, name_fr, region_type, is_enabled
)
select
  'MA',
  parent_region.id,
  source.code,
  source.name_ar,
  source.name_fr,
  source.region_type,
  true
from (
  values
    ('02.113', 'إقليم بركان', 'Province de Berkane', 'province'),
    ('02.167', 'إقليم الدريوش', 'Province de Driouch', 'province'),
    ('02.251', 'إقليم فجيج', 'Province de Figuig', 'province'),
    ('02.265', 'إقليم جرسيف', 'Province de Guercif', 'province'),
    ('02.275', 'إقليم جرادة', 'Province de Jerada', 'province'),
    ('02.381', 'إقليم الناظور', 'Province de Nador', 'province'),
    ('02.411', 'عمالة وجدة - أنجاد', 'Préfecture de Oujda-Angad', 'prefecture'),
    ('02.533', 'إقليم تاوريرت', 'Province de Taourirt', 'province')
) as source(code, name_ar, name_fr, region_type)
join public.country_regions parent_region
  on parent_region.country_code = 'MA'
 and parent_region.code = 'MA-02'
on conflict (country_code, code) do nothing;

-- Algeria: the 11 additional wilayas established by the 2026 territorial
-- reorganization. They are peer wilayas; no parent or legacy wilaya mapping
-- is inferred from the former boundaries.
insert into public.country_regions (
  country_code, parent_id, code, name_ar, region_type, is_enabled
)
values
  ('DZ', null, '59', 'أفلو', 'wilaya', true),
  ('DZ', null, '60', 'بريكة', 'wilaya', true),
  ('DZ', null, '61', 'القنطرة', 'wilaya', true),
  ('DZ', null, '62', 'بئر العاتر', 'wilaya', true),
  ('DZ', null, '63', 'العريشة', 'wilaya', true),
  ('DZ', null, '64', 'قصر الشلالة', 'wilaya', true),
  ('DZ', null, '65', 'عين وسارة', 'wilaya', true),
  ('DZ', null, '66', 'مسعد', 'wilaya', true),
  ('DZ', null, '67', 'قصر البخاري', 'wilaya', true),
  ('DZ', null, '68', 'بوسعادة', 'wilaya', true),
  ('DZ', null, '69', 'الأبيض سيدي الشيخ', 'wilaya', true)
on conflict (country_code, code) do nothing;

commit;
