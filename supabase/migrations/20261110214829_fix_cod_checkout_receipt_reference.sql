do $migration$
declare
  definition text;
  old_reference text := $old$    receipt_path, 0, fee, 0, 0$old$;
begin
  select pg_get_functiondef(
    'public.create_order(jsonb,text,integer,text,text,text,text,text,text)'::regprocedure
  ) into definition;
  if position(old_reference in definition) = 0 then
    raise exception 'unexpected_create_order_receipt_reference';
  end if;
  definition := replace(definition, old_reference, $new$    null, 0, fee, 0, 0$new$);
  execute definition;
end;
$migration$;
