import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";

export const COUNTRY_REGION_CONFIG = {
  DZ: {
    primaryType: "wilaya",
    secondaryTypes: ["daira"],
    secondaryRequired: true,
    primaryLabelAr: "الولاية",
    primaryLabelEn: "Wilaya",
    secondaryLabelAr: "الدائرة",
    secondaryLabelEn: "Daira"
  },
  MA: {
    primaryType: "region",
    secondaryTypes: ["province", "prefecture"],
    secondaryRequired: false,
    primaryLabelAr: "الجهة",
    primaryLabelEn: "Region",
    secondaryLabelAr: "الإقليم أو العمالة",
    secondaryLabelEn: "Province or prefecture"
  },
  EG: {
    primaryType: "governorate",
    secondaryTypes: [],
    secondaryRequired: false,
    primaryLabelAr: "المحافظة",
    primaryLabelEn: "Governorate",
    secondaryLabelAr: "المدينة",
    secondaryLabelEn: "City"
  },
  SA: {
    primaryType: "region",
    secondaryTypes: ["governorate"],
    secondaryRequired: true,
    primaryLabelAr: "المنطقة",
    primaryLabelEn: "Region",
    secondaryLabelAr: "المحافظة",
    secondaryLabelEn: "Governorate"
  },
  AE: {
    primaryType: "emirate",
    secondaryTypes: ["municipality"],
    secondaryRequired: false,
    primaryLabelAr: "الإمارة",
    primaryLabelEn: "Emirate",
    secondaryLabelAr: "البلدية أو المنطقة الخدمية",
    secondaryLabelEn: "Municipality or service area"
  }
} as const;

export type SupportedCountryCode = keyof typeof COUNTRY_REGION_CONFIG;
export type CountryRegionConfig = (typeof COUNTRY_REGION_CONFIG)[SupportedCountryCode];

const CountryCodeSchema = z.string().length(2).transform((value) => value.toUpperCase())
  .refine((value): value is SupportedCountryCode => value in COUNTRY_REGION_CONFIG, "unsupported_country");

const RegionSchema = z.object({
  id: z.number().int().positive(),
  country_code: z.string().length(2),
  parent_id: z.number().int().positive().nullable(),
  code: z.string(),
  name_ar: z.string(),
  name_fr: z.string().nullable(),
  name_en: z.string().nullable(),
  region_type: z.string(),
  is_enabled: z.boolean()
});

export type CountryRegion = z.infer<typeof RegionSchema>;

export type AccountRegionOptions = {
  countryCode: SupportedCountryCode;
  config: CountryRegionConfig;
  regions: CountryRegion[];
};

export async function fetchMyAccountCountryCode(): Promise<SupportedCountryCode> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");

  const { data, error } = await client.from("profiles")
    .select("country_code")
    .eq("user_id", auth.user.id)
    .single();
  if (error) throw error;
  return CountryCodeSchema.parse(data.country_code);
}

export function getCountryRegionConfig(countryCode: string): CountryRegionConfig {
  return COUNTRY_REGION_CONFIG[CountryCodeSchema.parse(countryCode)];
}

export async function fetchMyAccountRegions(): Promise<AccountRegionOptions> {
  const countryCode = await fetchMyAccountCountryCode();
  const config = getCountryRegionConfig(countryCode);
  const { data, error } = await getSupabaseClient().from("country_regions")
    .select("id, country_code, parent_id, code, name_ar, name_fr, name_en, region_type, is_enabled")
    .eq("country_code", countryCode)
    .eq("region_type", config.primaryType)
    .is("parent_id", null)
    .eq("is_enabled", true)
    .order("code", { ascending: true });
  if (error) throw error;
  return { countryCode, config, regions: RegionSchema.array().parse(data as unknown) };
}

export async function fetchMyAccountChildRegions(parentRegionId: number): Promise<CountryRegion[]> {
  if (!Number.isInteger(parentRegionId) || parentRegionId <= 0) throw new Error("invalid_parent_region");
  const countryCode = await fetchMyAccountCountryCode();
  const config = getCountryRegionConfig(countryCode);
  if (config.secondaryTypes.length === 0) return [];

  const client = getSupabaseClient();
  const { data: parent, error: parentError } = await client.from("country_regions")
    .select("id, parent_id, region_type, country_code, is_enabled")
    .eq("id", parentRegionId)
    .eq("country_code", countryCode)
    .eq("region_type", config.primaryType)
    .is("parent_id", null)
    .eq("is_enabled", true)
    .maybeSingle();
  if (parentError) throw parentError;
  if (!parent) throw new Error("invalid_parent_region");

  const { data, error } = await client.from("country_regions")
    .select("id, country_code, parent_id, code, name_ar, name_fr, name_en, region_type, is_enabled")
    .eq("country_code", countryCode)
    .eq("parent_id", parent.id)
    .in("region_type", [...config.secondaryTypes])
    .eq("is_enabled", true)
    .order("code", { ascending: true });
  if (error) throw error;
  return RegionSchema.array().parse(data as unknown);
}
