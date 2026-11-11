-- Verified Saudi governorates for Makkah, Qassim, Hail, Tabuk and Al Jouf.
-- Source references are documented in the accompanying change report.
-- Application identifiers are internal and are not official NCAR codes.
begin;

insert into public.country_regions (country_code,parent_id,code,name_ar,region_type,is_enabled)
select 'SA',p.id,v.code,v.name_ar,'governorate',true
from (values
 ('SA-02-GOV-01','الطائف'),
 ('SA-02-GOV-02','جدة'),
 ('SA-02-GOV-03','رابغ'),
 ('SA-02-GOV-04','الليث'),
 ('SA-02-GOV-05','القنفذة'),
 ('SA-02-GOV-06','الجموم'),
 ('SA-02-GOV-07','خليص'),
 ('SA-02-GOV-08','الخرمة'),
 ('SA-02-GOV-09','تربة'),
 ('SA-02-GOV-10','رنية'),
 ('SA-02-GOV-11','الكامل')
) v(code,name_ar)
join public.country_regions p on p.country_code='SA' and p.code='SA-02' and p.parent_id is null
on conflict (country_code,code) do nothing;

insert into public.country_regions (country_code,parent_id,code,name_ar,region_type,is_enabled)
select 'SA',p.id,v.code,v.name_ar,'governorate',true
from (values
 ('SA-05-GOV-01','عنيزة'),
 ('SA-05-GOV-02','الرس'),
 ('SA-05-GOV-03','المذنب'),
 ('SA-05-GOV-04','البكيرية'),
 ('SA-05-GOV-05','البدائع'),
 ('SA-05-GOV-06','الأسياح'),
 ('SA-05-GOV-07','النبهانية'),
 ('SA-05-GOV-08','رياض الخبراء'),
 ('SA-05-GOV-09','عيون الجواء'),
 ('SA-05-GOV-10','الشماسية'),
 ('SA-05-GOV-11','عقلة الصقور'),
 ('SA-05-GOV-12','ضرية')
) v(code,name_ar)
join public.country_regions p on p.country_code='SA' and p.code='SA-05' and p.parent_id is null
on conflict (country_code,code) do nothing;

insert into public.country_regions (country_code,parent_id,code,name_ar,region_type,is_enabled)
select 'SA',p.id,v.code,v.name_ar,'governorate',true
from (values
 ('SA-06-GOV-01','حائل'),
 ('SA-06-GOV-02','بقعاء'),
 ('SA-06-GOV-03','الشنان'),
 ('SA-06-GOV-04','موقق'),
 ('SA-06-GOV-05','سميراء'),
 ('SA-06-GOV-06','السليمي'),
 ('SA-06-GOV-07','الغزالة'),
 ('SA-06-GOV-08','الشملي'),
 ('SA-06-GOV-09','الحائط')
) v(code,name_ar)
join public.country_regions p on p.country_code='SA' and p.code='SA-06' and p.parent_id is null
on conflict (country_code,code) do nothing;

insert into public.country_regions (country_code,parent_id,code,name_ar,region_type,is_enabled)
select 'SA',p.id,v.code,v.name_ar,'governorate',true
from (values
 ('SA-07-GOV-01','تيماء'),
 ('SA-07-GOV-02','حقل'),
 ('SA-07-GOV-03','البدع'),
 ('SA-07-GOV-04','ضباء'),
 ('SA-07-GOV-05','الوجه'),
 ('SA-07-GOV-06','أملج')
) v(code,name_ar)
join public.country_regions p on p.country_code='SA' and p.code='SA-07' and p.parent_id is null
on conflict (country_code,code) do nothing;

insert into public.country_regions (country_code,parent_id,code,name_ar,region_type,is_enabled)
select 'SA',p.id,v.code,v.name_ar,'governorate',true
from (values
 ('SA-12-GOV-01','سكاكا'),
 ('SA-12-GOV-02','دومة الجندل'),
 ('SA-12-GOV-03','القريات'),
 ('SA-12-GOV-04','طبرجل')
) v(code,name_ar)
join public.country_regions p on p.country_code='SA' and p.code='SA-12' and p.parent_id is null
on conflict (country_code,code) do nothing;

commit;