drop function if exists public.unregister_my_push_devices();

create or replace function public.unregister_my_push_device(_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _user_id uuid := auth.uid();
begin
  if _user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if _token is null or length(_token) < 20 or length(_token) > 4096 then
    raise exception 'Invalid push token' using errcode = '22023';
  end if;

  delete from public.push_device_tokens
  where user_id = _user_id and token = _token;
end;
$$;

revoke all on function public.unregister_my_push_device(text) from public, anon;
grant execute on function public.unregister_my_push_device(text) to authenticated;