-- Arownd Invite: referral attribution without device restrictions or rewards.
-- Referral attribution is recorded at account creation from validated invite metadata.

begin;

alter table public.profiles
  add column if not exists referral_code text;

update public.profiles
set referral_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
where referral_code is null;

alter table public.profiles
  alter column referral_code
  set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));

alter table public.profiles
  alter column referral_code set not null;

create unique index if not exists profiles_referral_code_uidx
  on public.profiles (referral_code);

create table if not exists public.user_referrals (
  invitee_user_id uuid primary key references auth.users(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_referrals_no_self_referral
    check (invitee_user_id <> inviter_user_id)
);

create index if not exists user_referrals_inviter_created_idx
  on public.user_referrals (inviter_user_id, created_at desc);

alter table public.user_referrals enable row level security;

revoke all on table public.user_referrals from public, anon, authenticated;
grant select on table public.user_referrals to authenticated;

drop policy if exists "Users read their own referral records" on public.user_referrals;
create policy "Users read their own referral records"
on public.user_referrals
for select
to authenticated
using (
  inviter_user_id = (select auth.uid())
  or invitee_user_id = (select auth.uid())
);

create or replace function public.capture_user_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  requested_invite_code text;
  resolved_inviter_user_id uuid;
begin
  requested_invite_code := upper(
    nullif(btrim(new.raw_user_meta_data ->> 'invite_code'), '')
  );

  if requested_invite_code is null
     or requested_invite_code !~ '^[A-F0-9]{16}$' then
    return new;
  end if;

  select p.user_id
  into resolved_inviter_user_id
  from public.profiles p
  where p.referral_code = requested_invite_code
  limit 1;

  if resolved_inviter_user_id is null
     or resolved_inviter_user_id = new.id then
    return new;
  end if;

  insert into public.user_referrals (invitee_user_id, inviter_user_id)
  values (new.id, resolved_inviter_user_id)
  on conflict (invitee_user_id) do nothing;

  return new;
end;
$function$;

revoke all on function public.capture_user_referral()
from public, anon, authenticated;

drop trigger if exists zz_capture_user_referral on auth.users;
create trigger zz_capture_user_referral
after insert on auth.users
for each row
execute function public.capture_user_referral();

comment on column public.profiles.referral_code is
'Unique Arownd Invite code for sharing. It is not a reward or payment identifier.';

comment on table public.user_referrals is
'Records one inviter for each newly created account. No device restriction, daily limit, or reward is applied.';

commit;
