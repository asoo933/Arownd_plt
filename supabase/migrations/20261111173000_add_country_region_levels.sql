-- Country-driven administrative hierarchy metadata.
-- Region records are already seeded per country; this table describes how the
-- application should present and validate those existing records.
-- Countries remain disabled until their complete user/store/checkout flows pass.

create table if not exists public.country_region_levels (
  country_code text not null
    references public.countries(code) on delete restrict,
  level smallint not null check (level > 0),
  region_types text[] not null
    check (cardinality(region_types) > 0),
  label_ar text not null check (length(btrim(label_ar)) > 0),
  label_en text not null check (length(btrim(label_en)) > 0),
  is_required boolean not null default true,
  constraint country_region_levels_pkey primary key (country_code, level)
);

alter table public.country_region_levels enable row level security;

drop policy if exists country_region_levels_read_enabled
  on public.country_region_levels;

create policy country_region_levels_read_enabled
  on public.country_region_levels
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.countries c
      where c.code = country_region_levels.country_code
        and c.is_enabled = true
    )
  );

grant select on public.country_region_levels to anon, authenticated;
grant all on public.country_region_levels to service_role;

insert into public.country_region_levels
  (country_code, level, region_types, label_ar, label_en, is_required)
values
  ('DZ', 1, array['wilaya'], 'الولاية', 'Wilaya', true),
  ('DZ', 2, array['daira'], 'الدائرة', 'Daira', true),
  ('MA', 1, array['region'], 'الجهة', 'Region', true),
  ('MA', 2, array['province', 'prefecture'], 'الإقليم أو العمالة', 'Province or Prefecture', false),
  ('EG', 1, array['governorate'], 'المحافظة', 'Governorate', true),
  ('SA', 1, array['region'], 'المنطقة', 'Region', true),
  ('SA', 2, array['governorate'], 'المحافظة', 'Governorate', true),
  ('AE', 1, array['emirate'], 'الإمارة', 'Emirate', true),
  ('AE', 2, array['municipality'], 'البلدية', 'Municipality', false)
on conflict (country_code, level) do update
set region_types = excluded.region_types,
    label_ar = excluded.label_ar,
    label_en = excluded.label_en,
    is_required = excluded.is_required;

comment on table public.country_region_levels is
  'Country-specific administrative levels used by the application; levels are metadata, not country-specific business logic.';
