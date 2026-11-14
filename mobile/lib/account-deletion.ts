import { z } from "zod";

import { assertActionRateLimit } from "@/lib/action-rate-limit";
import { getSupabaseClient } from "@/lib/supabase";

const DeletionRequestSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "under_review", "blocked", "completed", "rejected", "cancelled"]),
  requested_at: z.string()
});

export type AccountDeletionRequest = z.infer<typeof DeletionRequestSchema>;

export async function fetchMyAccountDeletionRequest(): Promise<AccountDeletionRequest | null> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");

  const { data, error } = await client
    .from("account_deletion_requests")
    .select("id, status, requested_at")
    .eq("user_id", auth.user.id)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? DeletionRequestSchema.parse(data as unknown) : null;
}

export async function requestMyAccountDeletion(): Promise<string> {
  assertActionRateLimit("account-deletion:request", 60_000);
  const { data, error } = await getSupabaseClient().rpc("request_account_deletion");
  if (error) throw new Error(error.message || "account_deletion_request_failed");
  return z.string().uuid().parse(data);
}

export async function cancelMyAccountDeletion(requestId: string): Promise<void> {
  const id = z.string().uuid().parse(requestId);
  assertActionRateLimit("account-deletion:cancel", 5_000);
  const { data, error } = await getSupabaseClient().rpc("cancel_account_deletion_request", {
    _request_id: id
  });
  if (error) throw new Error(error.message || "account_deletion_cancel_failed");
  if (data !== true) throw new Error("account_deletion_request_not_cancellable");
}
