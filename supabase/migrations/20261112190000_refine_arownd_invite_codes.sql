-- Arownd Invite: readable codes for new accounts while preserving existing shared codes.
begin;

create or replace function public.generate_arownd_referral_code()
returns text
language sql
volatile
set search_path = ''
as $function$
  select translate(
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    '0123456789ABCDEF',
    '23456789ABCDEFGH'
  );
$function$;

revoke all on function public.generate_arownd_referral_code() from public, anon;
grant execute on function public.generate_arownd_referral_code() to authenticated;

alter table public.profiles
  alter column referral_code
  set default public.generate_arownd_referral_code();

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
     or requested_invite_code !~ '^([A-F0-9]{16}|[2-9A-H]{12})$' then
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

comment on function public.generate_arownd_referral_code() is
'Generates a 12-character Arownd Invite code using an alphabet that avoids visually ambiguous characters.';

commit;
