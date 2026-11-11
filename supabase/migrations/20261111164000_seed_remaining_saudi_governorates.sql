-- Seed the remaining Saudi governorates from published regional administration lists.
-- References:
-- Riyadh: Saudipedia, https://saudipedia.com/منطقة-الرياض
-- Eastern: Saudipedia, https://saudipedia.com/المنطقة-الشرقية
-- Jazan: Saudipedia, https://saudipedia.com/منطقة-جازان
-- Northern Borders: Saudipedia, https://saudipedia.com/قائمة-محافظات-منطقة-الحدود-الشمالية
-- Al Baha: Saudipedia, https://saudipedia.com/منطقة-الباحة
-- Najran: Najran Municipality, https://www.najran.gov.sa/ar/AboutNajran/NajranGeographically
-- Internal identifiers are application keys, not official NCAR codes.
begin;

-- Riyadh: 22 governorates
insert into public.country_regions (country_code,parent_id,code,name_ar,region_type,is_enabled)
select 'SA',p.id,v.code,v.name_ar,'governorate',true
from (values
 ('SA-01-GOV-01','الدرعية'),('SA-01-GOV-02','الخرج'),('SA-01-GOV-03','الدوادمي'),
 ('SA-01-GOV-04','المجمعة'),('SA-01-GOV-05','القويعية'),('SA-01-GOV-06','وادي الدواسر'),
 ('SA-01-GOV-07','الأفلاج'),('SA-01-GOV-08','الزلفي'),('SA-01-GOV-09','شقراء'),
 ('SA-01-GOV-10','حوطة بني تميم'),('SA-01-GOV-11','الغاط'),('SA-01-GOV-12','عفيف'),
 ('SA-01-GOV-13','السليل'),('SA-01-GOV-14','ضرما'),('SA-01-GOV-15','المزاحمية'),
 ('SA-01-GOV-16','رماح'),('SA-01-GOV-17','ثادق'),('SA-01-GOV-18','حريملاء'),
 ('SA-01-GOV-19','الحريق'),('SA-01-GOV-20','مرات'),('SA-01-GOV-21','الدلم'),
 ('SA-01-GOV-22','الرين')
) v(code,name_ar)
join public.country_regions p on p.country_code='SA' and p.code='SA-01' and p.parent_id is null
on conflict (country_code,code) do nothing;

-- Eastern Province: 12 governorates; Dammam is the regional capital, not seeded as a governorate.
insert into public.country_regions (country_code,parent_id,code,name_ar,region_type,is_enabled)
select 'SA',p.id,v.code,v.name_ar,'governorate',true
from (values
 ('SA-04-GOV-01','الأحساء'),('SA-04-GOV-02','حفر الباطن'),('SA-04-GOV-03','الجبيل'),
 ('SA-04-GOV-04','القطيف'),('SA-04-GOV-05','الخبر'),('SA-04-GOV-06','الخفجي'),
 ('SA-04-GOV-07','العديد'),('SA-04-GOV-08','رأس تنورة'),('SA-04-GOV-09','بقيق'),
 ('SA-04-GOV-10','النعيرية'),('SA-04-GOV-11','قرية العليا'),('SA-04-GOV-12','البيضاء')
) v(code,name_ar)
join public.country_regions p on p.country_code='SA' and p.code='SA-04' and p.parent_id is null
on conflict (country_code,code) do nothing;

-- Jazan: 16 governorates
insert into public.country_regions (country_code,parent_id,code,name_ar,region_type,is_enabled)
select 'SA',p.id,v.code,v.name_ar,'governorate',true
from (values
 ('SA-09-GOV-01','صبيا'),('SA-09-GOV-02','أبو عريش'),('SA-09-GOV-03','صامطة'),
 ('SA-09-GOV-04','بيش'),('SA-09-GOV-05','فرسان'),('SA-09-GOV-06','الدرب'),
 ('SA-09-GOV-07','الحرث'),('SA-09-GOV-08','ضمد'),('SA-09-GOV-09','الريث'),
 ('SA-09-GOV-10','الدائر'),('SA-09-GOV-11','أحد المسارحة'),('SA-09-GOV-12','العيدابي'),
 ('SA-09-GOV-13','العارضة'),('SA-09-GOV-14','هروب'),('SA-09-GOV-15','فيفاء'),
 ('SA-09-GOV-16','الطوال')
) v(code,name_ar)
join public.country_regions p on p.country_code='SA' and p.code='SA-09' and p.parent_id is null
on conflict (country_code,code) do nothing;

-- Northern Borders: three governorates
insert into public.country_regions (country_code,parent_id,code,name_ar,region_type,is_enabled)
select 'SA',p.id,v.code,v.name_ar,'governorate',true
from (values
 ('SA-08-GOV-01','رفحاء'),('SA-08-GOV-02','طريف'),('SA-08-GOV-03','العويقيلة')
) v(code,name_ar)
join public.country_regions p on p.country_code='SA' and p.code='SA-08' and p.parent_id is null
on conflict (country_code,code) do nothing;

-- Al Baha: nine governorates
insert into public.country_regions (country_code,parent_id,code,name_ar,region_type,is_enabled)
select 'SA',p.id,v.code,v.name_ar,'governorate',true
from (values
 ('SA-11-GOV-01','بلجرشي'),('SA-11-GOV-02','المندق'),('SA-11-GOV-03','المخواة'),
 ('SA-11-GOV-04','العقيق'),('SA-11-GOV-05','قلوة'),('SA-11-GOV-06','القرى'),
 ('SA-11-GOV-07','بني حسن'),('SA-11-GOV-08','غامد الزناد'),('SA-11-GOV-09','الحجرة')
) v(code,name_ar)
join public.country_regions p on p.country_code='SA' and p.code='SA-11' and p.parent_id is null
on conflict (country_code,code) do nothing;

-- Najran: seven governorates
insert into public.country_regions (country_code,parent_id,code,name_ar,region_type,is_enabled)
select 'SA',p.id,v.code,v.name_ar,'governorate',true
from (values
 ('SA-10-GOV-01','شرورة'),('SA-10-GOV-02','حبونا'),('SA-10-GOV-03','بدر الجنوب'),
 ('SA-10-GOV-04','يدمة'),('SA-10-GOV-05','ثار'),('SA-10-GOV-06','خباش'),
 ('SA-10-GOV-07','الخرخير')
) v(code,name_ar)
join public.country_regions p on p.country_code='SA' and p.code='SA-10' and p.parent_id is null
on conflict (country_code,code) do nothing;

commit;