-- Keep privileged cancellation RPCs unavailable to anonymous clients.
revoke all on function public.cancel_my_order(uuid) from anon, public;
revoke all on function public.cancel_reservation(uuid) from anon, public;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
notify pgrst, 'reload schema';
