-- Cover the sender foreign key for efficient referential checks and cleanup.
create index if not exists support_messages_sender_idx
  on public.support_messages (sender_id);
