-- Apply the atomic support-conversation RPC with caller privileges so RLS
-- policies remain active for every insert performed by the function.
create or replace function public.create_support_conversation(_subject text, _message text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if _subject is null or char_length(btrim(_subject)) not between 3 and 120 then
    raise exception 'invalid_support_subject' using errcode = '22023';
  end if;
  if _message is null or char_length(btrim(_message)) not between 1 and 4000 then
    raise exception 'invalid_support_message' using errcode = '22023';
  end if;

  insert into public.support_conversations (user_id, subject)
  values (v_user_id, btrim(_subject))
  returning id into v_conversation_id;

  insert into public.support_messages (conversation_id, sender_id, sender_role, message)
  values (v_conversation_id, v_user_id, 'customer', btrim(_message));

  return v_conversation_id;
end;
$function$;

revoke all on function public.create_support_conversation(text, text) from public, anon, authenticated;
grant execute on function public.create_support_conversation(text, text) to authenticated;
