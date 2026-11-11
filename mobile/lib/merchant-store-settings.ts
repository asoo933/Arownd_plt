import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";
import { fetchMyAccountCallingCode, normalizePhoneForCallingCode } from "@/lib/country-regions";
import { MerchantStoreSettingsSchema, type MerchantStoreSettings } from "@/lib/merchant-store-settings-state";

const StoreSettingsRecordSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  country_code: z.string().length(2),
  region_id: z.number().int().positive(),
  secondary_region_id: z.number().int().positive().nullable(),
  logo_url: z.string().nullable(),
  cover_url: z.string().nullable(),
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
    .select("id, owner_id, country_code, name, description, phone, whatsapp, region_id, secondary_region_id, commune, address_line, opening_hours, logo_url, cover_url, instagram_url, facebook_url")
    .eq("id", storeId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("merchant_store_not_found");

  const record = StoreSettingsRecordSchema.parse(data as unknown);
  return MerchantStoreSettingsSchema.parse({
    name: record.name,
    region_id: record.region_id,
    secondary_region_id: record.secondary_region_id,
    logo_url: record.logo_url ?? "",
    cover_url: record.cover_url ?? "",
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
  const callingCode = await fetchMyAccountCallingCode();
  const phone = normalizePhoneForCallingCode(values.phone, callingCode);
  const whatsapp = values.whatsapp ? normalizePhoneForCallingCode(values.whatsapp, callingCode) : "";
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");

  const { data, error } = await client.from("stores").update({
    ...values,
    phone,
    whatsapp: whatsapp || null,
    description: values.description || null,
    logo_url: values.logo_url || null,
    cover_url: values.cover_url || null,
    instagram_url: values.instagram_url || null,
    facebook_url: values.facebook_url || null
  }).eq("id", storeId).eq("owner_id", auth.user.id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("merchant_store_not_updated");
}
