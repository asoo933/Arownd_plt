-- The shared location trigger retained a double-escaped plus after the
-- initial RPC repair. Normalize it to one backslash in the phone and
-- WhatsApp E.164 checks.
begin;

do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.enforce_daira_region_selection()'::regprocedure
  )
  into function_definition;

  function_definition := replace(
    function_definition,
    repeat(chr(92), 2) || '+',
    chr(92) || '+'
  );

  if position(repeat(chr(92), 2) || '+' in function_definition) > 0
     or position(chr(92) || '+' in function_definition) = 0 then
    raise exception 'store_location_phone_regex_repair_failed';
  end if;

  execute function_definition;
end;
$migration$;

commit;
