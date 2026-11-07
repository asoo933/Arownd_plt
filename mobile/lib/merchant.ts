import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";
import {
  resolveMerchantAccessStatus,
  type MerchantAccessStatus
} from "@/lib/merchant-state";

const AccountTypeSchema = z.enum(["personal", "merchant", "delivery_company"]);
const RoleRowsSchema = z.array(z.object({ role: z.string() }).passthrough());
const OwnedStoreSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string()
}).passthrough();

export type MerchantAccess = {
  userId: string;
  status: Exclude<MerchantAccessStatus, "signed_out">;
  store: { id: string; name: string; slug: string } | null;
};

export async function fetchMerchantAccess(): Promise<MerchantAccess | null> {
  const client = getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();

  if (authError) throw authError;
  if (!authData.user) return null;

  const userId = authData.user.id;
  const [accountTypeResult, rolesResult, storeResult] = await Promise.all([
    client.rpc("get_my_account_type"),
    client.from("user_roles").select("role").eq("user_id", userId),
    client.from("stores").select("id, name, slug").eq("owner_id", userId).maybeSingle()
  ]);

  if (accountTypeResult.error) throw accountTypeResult.error;
  if (rolesResult.error) throw rolesResult.error;
  if (storeResult.error) throw storeResult.error;

  const accountType = AccountTypeSchema.parse(accountTypeResult.data as unknown);
  const roles = RoleRowsSchema.parse(rolesResult.data as unknown).map((row) => row.role);
  const store = storeResult.data
    ? OwnedStoreSchema.parse(storeResult.data as unknown)
    : null;

  const status = resolveMerchantAccessStatus({
    accountType,
    roles,
    hasOwnedStore: store !== null
  });

  return { userId, status, store };
}
