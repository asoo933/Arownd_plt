import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";
import { MerchantStoreSettingsSchema, type MerchantStoreSettings } from "@/lib/merchant-store-settings-state";

const StoreSettingsRecordSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  wilaya_id: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  commune: z.string().nullable(),
  address_line: z.string().nullable(),
  opening_hours: z.object({
    open: z.string(),
    close: z.string(),
    closed_days: z.array(z.number())
  }).passthrough(),
  instagram_url: z.string().nullable(),
  facebook_url: z.string().nullable()
});

export async function fetchMyMerchantStoreSettings(storeId: string): Promise<MerchantStoreSettings> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");

  const { data, error } = await client.from("stores")
    .select("id, owner_id, name, description, phone, whatsapp, wilaya_id, commune, address_line, opening_hours, instagram_url, facebook_url")
    .eq("id", storeId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("merchant_store_not_found");

  const record = StoreSettingsRecordSchema.parse(data as unknown);
  return MerchantStoreSettingsSchema.parse({
    name: record.name,
    wilaya_id: record.wilaya_id,
    description: record.description ?? "",
    phone: record.phone ?? "",
    whatsapp: record.whatsapp ?? "",
    commune: record.commune ?? "",
    address_line: record.address_line ?? "",
    opening_hours: record.opening_hours,
    instagram_url: record.instagram_url ?? "",
    facebook_url: record.facebook_url ?? ""
  });
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
