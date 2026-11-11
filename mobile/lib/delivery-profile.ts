import { z } from "zod";

import { DeliveryProfileSchema, type DeliveryProfileInput } from "@/lib/delivery-profile-state";
import { fetchMyAccountRegionLevels, normalizePhoneForCallingCode } from "@/lib/country-regions";
import { getSupabaseClient } from "@/lib/supabase";

const ProfileSchema = z.object({
  country_code: z.string().length(2),
  full_name: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  phone: z.string().nullable().optional(),
  region_id: z.number().nullable().optional(),
  secondary_region_id: z.number().nullable().optional(),
  commune: z.string().nullable().optional()
});

export type DeliveryProfile = z.infer<typeof ProfileSchema>;

export async function fetchMyDeliveryProfile(): Promise<DeliveryProfile | null> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");
  const { data, error } = await client.from("profiles")
    .select("country_code, full_name, avatar_url, phone, region_id, secondary_region_id, commune")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? ProfileSchema.parse(data as unknown) : null;
}

export async function saveMyDeliveryProfile(input: DeliveryProfileInput): Promise<void> {
  const parsed = DeliveryProfileSchema.parse(input);
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");
  const regionContext = await fetchMyAccountRegionLevels();
  const countryCode = regionContext.countryCode;
  if (regionContext.levels[1]?.is_required && parsed.secondary_region_id === null) {
    throw new Error("secondary_region_required");
  }
  const phone = normalizePhoneForCallingCode(parsed.phone, regionContext.callingCode);
  const { error } = await client.from("profiles").upsert({
    user_id: auth.user.id,
    country_code: countryCode,
    full_name: parsed.full_name,
    phone,
    region_id: parsed.region_id,
    secondary_region_id: parsed.secondary_region_id,
    commune: parsed.commune
  }, { onConflict: "user_id" });
  if (error) throw error;
}
