-- Standardize every Arownd Invite code as AR-INVITE-XX-0000.
begin;

create or replace function public.generate_arownd_referral_code()
returns text
language plpgsql
volatile
set search_path = ''
as $function$
declare
  generated_code text;
begin
  -- Serialize generation to avoid concurrent collisions on the unique index.
  perform pg_catalog.pg_advisory_xact_lock(731904218);

  loop
    generated_code :=
      'AR-INVITE-' ||
      pg_catalog.chr(65 + pg_catalog.floor(pg_catalog.random() * 26)::integer) ||
      pg_catalog.chr(65 + pg_catalog.floor(pg_catalog.random() * 26)::integer) ||
      '-' ||
      pg_catalog.lpad(
        pg_catalog.floor(pg_catalog.random() * 10000)::integer::text,
        4,
        '0'
      );

    exit when not exists (
      select 1
      from public.profiles
      where referral_code = generated_code
    );
  end loop;

  return generated_code;
end;
$function$;

revoke all on function public.generate_arownd_referral_code() from public, anon;
grant execute on function public.generate_arownd_referral_code() to authenticated;

alter table public.profiles
  alter column referral_code
  set default public.generate_arownd_referral_code();

-- Reassign existing codes one profile at a time so each generated value is
-- visible to the next uniqueness check in this transaction.
do $block$
declare
  profile_record record;
begin
  for profile_record in
    select user_id
    from public.profiles
    order by user_id
  loop
    update public.profiles
    set referral_code = public.generate_arownd_referral_code()
    where user_id = profile_record.user_id;
  end loop;
end;
$block$;

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
     or requested_invite_code !~ '^AR-INVITE-[A-Z]{2}-[0-9]{4}$' then
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
'Generates unique Arownd Invite codes in the AR-INVITE-XX-0000 format.';

commit;
