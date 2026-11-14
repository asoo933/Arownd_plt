-- Correct the literal '+' escaping in both store-creation and store-row
-- phone validators. The live definitions currently contain multiple
-- backslashes, which PostgreSQL interprets as a literal backslash pattern.
begin;

do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.create_my_store_for_account(text,text,text,text,bigint,bigint,text,text,double precision,double precision,jsonb,text,text[])'::regprocedure
  )
  into function_definition;

  function_definition := replace(
    function_definition,
    repeat(chr(92), 2) || '+',
    chr(92) || '+'
  );

  if position(repeat(chr(92), 2) || '+' in function_definition) > 0
     or position(chr(92) || '+' in function_definition) = 0 then
    raise exception 'store_creation_phone_regex_repair_failed';
  end if;

  execute function_definition;

  select pg_get_functiondef(
    'public.enforce_daira_region_selection()'::regprocedure
  )
  into function_definition;

  function_definition := replace(
    function_definition,
    repeat(chr(92), 4) || '+',
    chr(92) || '+'
  );

  if position(repeat(chr(92), 4) || '+' in function_definition) > 0
     or position(chr(92) || '+' in function_definition) = 0 then
    raise exception 'store_trigger_phone_regex_repair_failed';
  end if;

  execute function_definition;
end;
$migration$;

commit;
