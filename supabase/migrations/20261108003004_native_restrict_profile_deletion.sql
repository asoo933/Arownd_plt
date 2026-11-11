-- Profile deletion must be performed by the audited account-deletion workflow, not directly by a client.
revoke delete on table public.profiles from authenticated;
