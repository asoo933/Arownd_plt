-- Users may remove only notifications addressed to their own account.
-- Merchant, delivery and customer accounts all use the authenticated role;
-- ownership remains enforced by auth.uid(), not by client-side role checks.
grant delete on table public.notifications to authenticated;

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications"
  on public.notifications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
