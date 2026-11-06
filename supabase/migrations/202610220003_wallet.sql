-- واجهة المحفظة: سجل عمليات واحد يُشتق منه الرصيد
-- الرصيد المعروض = مجموع amount للمعاملات المعتمدة فقط (approved).
-- الشحن والسحب يصلان pending حتى يراجعهما الأدمن → لا يمكن تزوير الرصيد من العميل.

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('topup', 'purchase', 'refund', 'withdraw')),
  amount numeric not null check (amount <> 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  method text,
  note text,
  receipt_url text,
  created_at timestamptz not null default now(),
  constraint wallet_tx_amount_sign check (
    (type in ('topup', 'refund') and amount > 0)
    or (type in ('purchase', 'withdraw') and amount < 0)
  )
);

create index if not exists idx_wallet_tx_user on public.wallet_transactions (user_id, created_at desc);

grant select, insert on public.wallet_transactions to authenticated;
-- التحديث محصور بسياسة الأدمن أدناه (اعتماد/رفض)
grant update on public.wallet_transactions to authenticated;
grant all on public.wallet_transactions to service_role;
alter table public.wallet_transactions enable row level security;

drop policy if exists "Users read own wallet transactions" on public.wallet_transactions;
create policy "Users read own wallet transactions" on public.wallet_transactions
  for select to authenticated
  using (user_id = auth.uid());

-- العميل ينشئ عمليته هو بحالة pending فقط (with check يمنع رفع الحالة أو التلاعب)
drop policy if exists "Users insert own pending wallet transactions" on public.wallet_transactions;
create policy "Users insert own pending wallet transactions" on public.wallet_transactions
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "Admin updates wallet transactions" on public.wallet_transactions;
create policy "Admin updates wallet transactions" on public.wallet_transactions
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Trigger: إشعار المالك عند اعتماد/رفض العملية (نفس نمط notify_order_status)
create or replace function public.notify_wallet_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      new.user_id,
      'system',
      case new.status
        when 'approved' then 'تم اعتماد عملية المحفظة'
        when 'rejected' then 'تم رفض عملية المحفظة'
        else 'تحديث حالة عملية المحفظة'
      end,
      case new.type
        when 'topup' then 'شحن المحفظة: ' || to_char(abs(new.amount), 'FM999G999G999D00') || ' دج'
        when 'withdraw' then 'طلب سحب: ' || to_char(abs(new.amount), 'FM999G999G999D00') || ' دج'
        when 'purchase' then 'الدفع من المحفظة'
        when 'refund' then 'استرداد إلى المحفظة'
        else 'عملية محفظة'
      end || ' — ' || case new.status
        when 'approved' then 'معتمد'
        when 'rejected' then 'مرفوض'
        else new.status
      end,
      jsonb_build_object('wallet_transaction_id', new.id, 'status', new.status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists wallet_tx_notify_status on public.wallet_transactions;
create trigger wallet_tx_notify_status
after update of status on public.wallet_transactions
for each row execute function public.notify_wallet_transaction();

-- Realtime ليعمل التحديث الحي عند اعتماد الأدمن (نفس نمط باقي جداول التطبيق)
do $$
begin
  alter publication supabase_realtime add table public.wallet_transactions;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
alter table public.wallet_transactions replica identity full;
