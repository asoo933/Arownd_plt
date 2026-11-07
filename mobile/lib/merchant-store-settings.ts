import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";
import { MerchantStoreSettingsSchema, type MerchantStoreSettings } from "@/lib/merchant-store-settings-state";

const StoreSettingsRecordSchema = MerchantStoreSettingsSchema.extend({
  id: z.string().uuid(),
  owner_id: z.string().uuid()
});

export async function fetchMyMerchantStoreSettings(storeId: string): Promise<MerchantStoreSettings> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");

  const { data, error } = await client.from("stores")
    .select("id, owner_id, name, description, phone, whatsapp, commune, address_line, opening_hours, instagram_url, facebook_url")
    .eq("id", storeId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("merchant_store_not_found");
  const record = StoreSettingsRecordSchema.parse(data as unknown);
  const { id: _id, owner_id: _ownerId, ...settings } = record;
  return settings;
}

export async function updateMyMerchantStoreSettings(
  storeId: string,
  input: MerchantStoreSettings
): Promise<void> {
  const values = MerchantStoreSettingsSchema.parse(input);
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");

  const { data, error } = await client.from("stores").update({
    ...values,
    description: values.description || null,
    whatsapp: values.whatsapp || null,
    instagram_url: values.instagram_url || null,
    facebook_url: values.facebook_url || null
  }).eq("id", storeId).eq("owner_id", auth.user.id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("merchant_store_not_updated");
}
