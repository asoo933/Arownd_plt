-- Native clients may only acknowledge their own notifications; content is server-managed.
revoke insert, update, delete on table public.notifications from authenticated;
grant update (read) on table public.notifications to authenticated;
