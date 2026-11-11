-- Authenticated clients may acknowledge their own notifications, but must not
-- rewrite notification content, ownership, type, or routing payloads.
revoke update on table public.notifications from authenticated;
grant update (read) on table public.notifications to authenticated;
