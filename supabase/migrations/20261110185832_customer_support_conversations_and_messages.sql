-- Customer support conversations and append-only messages.
-- Admin access is restricted by public.is_platform_admin(), which requires AAL2.
-- Admin replies create an in-app system notification; the existing notification
-- trigger dispatches push delivery through the configured FCM Edge Function.

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete restrict,
  sender_role text not null check (sender_role in ('customer', 'admin')),
  message text not null check (char_length(btrim(message)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists support_conversations_user_recent_idx
  on public.support_conversations (user_id, last_message_at desc);
create index if not exists support_conversations_status_recent_idx
  on public.support_conversations (status, last_message_at desc);
create index if not exists support_messages_conversation_recent_idx
  on public.support_messages (conversation_id, created_at asc);

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

revoke all on table public.support_conversations from anon, authenticated;
revoke all on table public.support_messages from anon, authenticated;
grant select, insert, update on table public.support_conversations to authenticated;
grant select, insert on table public.support_messages to authenticated;

drop policy if exists "Customers create own support conversations" on public.support_conversations;
create policy "Customers create own support conversations"
  on public.support_conversations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'open'
  );

drop policy if exists "Customers and platform admins read support conversations" on public.support_conversations;
create policy "Customers and platform admins read support conversations"
  on public.support_conversations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_platform_admin())
  );

drop policy if exists "Platform admins update support conversations" on public.support_conversations;
create policy "Platform admins update support conversations"
  on public.support_conversations
  for update to authenticated
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

drop policy if exists "Customers and platform admins read support messages" on public.support_messages;
create policy "Customers and platform admins read support messages"
  on public.support_messages
  for select to authenticated
  using (
    (select public.is_platform_admin())
    or exists (
      select 1
      from public.support_conversations c
      where c.id = support_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Customers and platform admins send support messages" on public.support_messages;
create policy "Customers and platform admins send support messages"
  on public.support_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      (
        sender_role = 'customer'
        and exists (
          select 1
          from public.support_conversations c
          where c.id = support_messages.conversation_id
            and c.user_id = (select auth.uid())
            and c.status = 'open'
        )
      )
      or (
        sender_role = 'admin'
        and (select public.is_platform_admin())
      )
    )
  );

create or replace function public.handle_support_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_conversation_user_id uuid;
begin
  update public.support_conversations
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id
  returning user_id into v_conversation_user_id;

  if new.sender_role = 'admin' then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_conversation_user_id,
      'system',
      'رد جديد من دعم Arownd',
      left(new.message, 180),
      jsonb_build_object(
        'kind', 'support_reply',
        'conversation_id', new.conversation_id,
        'message_id', new.id,
        'url', '/support/' || new.conversation_id::text
      )
    );
  end if;

  return new;
end;
$function$;

revoke all on function public.handle_support_message_insert() from public, anon, authenticated;

drop trigger if exists support_messages_after_insert on public.support_messages;
create trigger support_messages_after_insert
  after insert on public.support_messages
  for each row execute function public.handle_support_message_insert();

do $$
begin
  alter publication supabase_realtime add table public.support_conversations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.support_messages;
exception when duplicate_object then null;
end $$;

alter table public.support_conversations replica identity full;
alter table public.support_messages replica identity full;

comment on table public.support_conversations is 'Customer support conversations for Arownd; customer-owned and platform-admin managed.';
comment on table public.support_messages is 'Append-only support messages; admin replies create existing system notifications and FCM push events.';
