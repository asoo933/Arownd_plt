import { getSupabaseClient } from "@/lib/supabase";
import { MerchantAnalyticsSchema, type MerchantAnalytics } from "@/lib/merchant-analytics-state";

export async function fetchMerchantAnalytics(storeId: string): Promise<MerchantAnalytics> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");

  const { data, error } = await client.rpc("get_my_store_analytics", {
    _store_id: storeId
  });
  if (error) throw error;
  return MerchantAnalyticsSchema.parse(data as unknown);
}
