-- Remove the legacy wallet subsystem after verifying it has no Native app usage.
-- Preserve order receipt access and the shared receipts bucket.

drop policy if exists "Receipt owner or order participant read" on storage.objects;

create policy "Receipt owner or order participant read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.orders o
      where o.receipt_url = storage.objects.name
        and (
          o.user_id = auth.uid()
          or public.is_order_merchant(o.id)
        )
    )
  )
);

drop trigger if exists wallet_tx_notify_status on public.wallet_transactions;

drop function if exists public.notify_wallet_transaction();
drop function if exists public.admin_review_wallet_transaction(uuid, text, uuid, text, text);
drop function if exists private.admin_review_wallet_transaction(uuid, text, uuid, text, text);

alter publication supabase_realtime drop table public.wallet_transactions;

drop table private.wallet_transaction_decisions;
drop table public.wallet_transactions;
