do $migration$
declare
  lower_definition text;
  checkout_definition text;
  old_payment_check text := $old$  if _payment_method not in ('cod', 'baridimob') then raise exception 'invalid_payment_method'; end if;$old$;
  old_receipt_branch text := $old$  if _payment_method = 'baridimob' then
    if coalesce(trim(_receipt_url), '') = '' then raise exception 'receipt_required'; end if;
    if position('/storage/v1/object/sign/receipts/' in _receipt_url) > 0 then
      receipt_path := split_part(
        split_part(_receipt_url, '/storage/v1/object/sign/receipts/', 2), '?', 1
      );
    else
      receipt_path := trim(_receipt_url);
    end if;
    if receipt_path not like auth.uid()::text || '/%' then raise exception 'receipt_not_owned'; end if;
    select metadata into receipt_meta from storage.objects
    where bucket_id = 'receipts' and name = receipt_path;
    if not found or coalesce(receipt_meta->>'mimetype', '') not like 'image/%' then
      raise exception 'receipt_not_found_or_invalid';
    end if;
  elsif _receipt_url is not null then
    raise exception 'unexpected_receipt';
  end if;$old$;
  old_checkout_guard text := $old$  if _idempotency_key is null then raise exception 'idempotency_key_required'; end if;$old$;
begin
  select pg_get_functiondef(
    'public.create_order(jsonb,text,integer,text,text,text,text,text,text)'::regprocedure
  ) into lower_definition;

  if position(old_payment_check in lower_definition) = 0
     or position(old_receipt_branch in lower_definition) = 0 then
    raise exception 'create_order_definition_does_not_match_expected_source';
  end if;

  lower_definition := replace(
    lower_definition,
    old_payment_check,
    $new$  if _payment_method is distinct from 'cod' then raise exception 'invalid_payment_method'; end if;$new$
  );
  lower_definition := replace(
    lower_definition,
    old_receipt_branch,
    $new$  if _receipt_url is not null then raise exception 'unexpected_receipt'; end if;$new$
  );
  lower_definition := replace(lower_definition, E'  receipt_path text;\n  receipt_meta jsonb;\n', '');
  execute lower_definition;

  select pg_get_functiondef(
    'public.create_order_with_delivery(jsonb,text,integer,text,text,text,text,text,text,uuid)'::regprocedure
  ) into checkout_definition;

  if position(old_checkout_guard in checkout_definition) = 0 then
    raise exception 'create_order_with_delivery_definition_does_not_match_expected_source';
  end if;

  checkout_definition := replace(
    checkout_definition,
    old_checkout_guard,
    old_checkout_guard || E'\n  if _payment_method is distinct from ''cod'' then raise exception ''invalid_payment_method''; end if;\n  if _receipt_url is not null then raise exception ''unexpected_receipt''; end if;'
  );
  execute checkout_definition;
end;
$migration$;
