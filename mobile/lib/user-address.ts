import { z } from "zod";

import { UserAddressSchema, type UserAddressInput } from "@/lib/user-address-state";
import { getSupabaseClient } from "@/lib/supabase";
import { fetchMyAccountCountryCode, fetchMyAccountRegionLevels, normalizePhoneForCallingCode } from "@/lib/country-regions";

const RegionNameSchema = z.object({ name_ar: z.string(), name_fr: z.string().nullable(), name_en: z.string().nullable() });
const UserAddressRecordSchema = UserAddressSchema.extend({
  country_code: z.string().length(2),
  region: RegionNameSchema.nullable().optional(),
  secondary_region: RegionNameSchema.nullable().optional(),
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  is_default: z.boolean(),
  created_at: z.string(),
  updated_at: z.string()
});

export type UserAddress = z.infer<typeof UserAddressRecordSchema>;

async function getCurrentUserId(): Promise<string> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("not_authenticated");
  return data.user.id;
}

export async function fetchMyAddresses(): Promise<UserAddress[]> {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();
  const { data, error } = await client
    .from("user_addresses")
    .select("id, user_id, label, recipient_name, phone, country_code, region_id, secondary_region_id, region:country_regions!user_addresses_country_region_fkey(name_ar, name_fr, name_en), secondary_region:country_regions!user_addresses_secondary_region_fkey(name_ar, name_fr, name_en), commune, address_line, additional_info, is_default, created_at, updated_at")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return z.array(UserAddressRecordSchema).parse(data);
}

export async function createMyAddress(input: UserAddressInput): Promise<UserAddress> {
  const parsed = UserAddressSchema.parse(input);
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();
  const countryCode = await fetchMyAccountCountryCode();
  const regionContext = await fetchMyAccountRegionLevels();
  if (regionContext.levels[1]?.is_required && parsed.secondary_region_id === null) {
    throw new Error("secondary_region_required");
  }
  const phone = normalizePhoneForCallingCode(parsed.phone, regionContext.callingCode);
  const { data, error } = await client
    .from("user_addresses")
    .insert({
      ...parsed,
      country_code: countryCode,
      additional_info: parsed.additional_info || null,
      phone: parsed.phone.replace(/[\s()-]/g, ""),
      user_id: userId,
      is_default: false
    })
    .select("id, user_id, label, recipient_name, phone, country_code, region_id, secondary_region_id, region:country_regions!user_addresses_country_region_fkey(name_ar, name_fr, name_en), secondary_region:country_regions!user_addresses_secondary_region_fkey(name_ar, name_fr, name_en), commune, address_line, additional_info, is_default, created_at, updated_at")
    .single();
  if (error) throw error;
  return UserAddressRecordSchema.parse(data);
}

export async function updateMyAddress(addressId: string, input: UserAddressInput): Promise<UserAddress> {
  const parsed = UserAddressSchema.parse(input);
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();
  const countryCode = await fetchMyAccountCountryCode();
  const regionContext = await fetchMyAccountRegionLevels();
  if (regionContext.levels[1]?.is_required && parsed.secondary_region_id === null) {
    throw new Error("secondary_region_required");
  }
  const phone = normalizePhoneForCallingCode(parsed.phone, regionContext.callingCode);
  const { data, error } = await client
    .from("user_addresses")
    .update({
      ...parsed,
      country_code: countryCode,
      additional_info: parsed.additional_info || null,
      phone: parsed.phone.replace(/[\s()-]/g, ""),
      updated_at: new Date().toISOString()
    })
    .eq("id", addressId)
    .eq("user_id", userId)
    .select("id, user_id, label, recipient_name, phone, country_code, region_id, secondary_region_id, region:country_regions!user_addresses_country_region_fkey(name_ar, name_fr, name_en), secondary_region:country_regions!user_addresses_secondary_region_fkey(name_ar, name_fr, name_en), commune, address_line, additional_info, is_default, created_at, updated_at")
    .single();
  if (error) throw error;
  return UserAddressRecordSchema.parse(data);
}

export async function setMyDefaultAddress(addressId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc("set_my_default_address", {
    _address_id: addressId
  });
  if (error) throw error;
}

export async function deleteMyAddress(addressId: string): Promise<void> {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();
  const { error, count } = await client
    .from("user_addresses")
    .delete({ count: "exact" })
    .eq("id", addressId)
    .eq("user_id", userId);
  if (error) throw error;
  if (count === 0) throw new Error("address_not_found");
}
