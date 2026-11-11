import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";

const CountryCodeSchema = z.string().trim().length(2).transform((value) => value.toUpperCase());

const CountryRegionLevelSchema = z.object({
  country_code: CountryCodeSchema,
  level: z.number().int().positive(),
  region_types: z.array(z.string().trim().min(1)).min(1),
  label_ar: z.string().trim().min(1),
  label_en: z.string().trim().min(1),
  is_required: z.boolean()
});

const RegionSchema = z.object({
  id: z.number().int().positive(),
  country_code: CountryCodeSchema,
  parent_id: z.number().int().positive().nullable(),
  code: z.string(),
  name_ar: z.string(),
  name_fr: z.string().nullable(),
  name_en: z.string().nullable(),
  region_type: z.string(),
  is_enabled: z.boolean()
});

export type SupportedCountryCode = string;
export type CountryRegionLevel = z.infer<typeof CountryRegionLevelSchema>;
export type CountryRegion = z.infer<typeof RegionSchema>;

export type AccountRegionOptions = {
  countryCode: SupportedCountryCode;
  callingCode: string;
  levels: CountryRegionLevel[];
  selectedLevel: CountryRegionLevel;
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

/** Country-specific region levels are data, not application conditionals. */
export async function fetchCountryRegionLevels(countryCodeInput: string): Promise<{
  countryCode: SupportedCountryCode;
  callingCode: string;
  levels: CountryRegionLevel[];
}> {
  const countryCode = CountryCodeSchema.parse(countryCodeInput);
  const client = getSupabaseClient();

  const { data: country, error: countryError } = await client.from("countries")
    .select("code, is_enabled, calling_code")
    .eq("code", countryCode)
    .single();
  if (countryError) throw countryError;
  if (!country.is_enabled) throw new Error("country_disabled");
  if (typeof country.calling_code !== "string" || !/^\+[1-9]\d{0,2}$/.test(country.calling_code)) {
    throw new Error("country_calling_code_invalid");
  }

  const { data, error } = await client.from("country_region_levels")
    .select("country_code, level, region_types, label_ar, label_en, is_required")
    .eq("country_code", countryCode)
    .order("level", { ascending: true });
  if (error) throw error;

  const levels = CountryRegionLevelSchema.array().parse(data as unknown);
  const firstLevel = levels[0];
  if (!firstLevel || firstLevel.level !== 1) {
    throw new Error("country_region_levels_not_configured");
  }
  for (let index = 0; index < levels.length; index += 1) {
    const currentLevel = levels[index];
    if (!currentLevel || currentLevel.level !== index + 1) {
      throw new Error("country_region_levels_invalid_sequence");
    }
  }

  return { countryCode, callingCode: country.calling_code, levels };
}


export async function fetchMyAccountCallingCode(): Promise<string> {
  const countryCode = await fetchMyAccountCountryCode();
  const { data, error } = await getSupabaseClient().from("countries")
    .select("calling_code")
    .eq("code", countryCode)
    .single();
  if (error) throw error;
  if (typeof data.calling_code !== "string" || !/^\\+[1-9]\\d{0,2}$/.test(data.calling_code)) {
    throw new Error("country_calling_code_invalid");
  }
  return data.calling_code;
}

export async function fetchMyAccountRegionLevels() {
  return fetchCountryRegionLevels(await fetchMyAccountCountryCode());
}

export async function fetchCountryRegions(countryCodeInput: string, parentRegionId?: number | null): Promise<AccountRegionOptions> {
  const { countryCode, callingCode, levels } = await fetchCountryRegionLevels(countryCodeInput);
  const firstLevel = levels[0];
  if (!firstLevel) throw new Error("country_region_levels_not_configured");
  let selectedLevel: CountryRegionLevel = firstLevel;
  let parentId: number | null = null;

  if (parentRegionId !== undefined && parentRegionId !== null) {
    if (!Number.isInteger(parentRegionId) || parentRegionId <= 0) {
      throw new Error("invalid_parent_region");
    }

    const client = getSupabaseClient();
    const { data: parent, error: parentError } = await client.from("country_regions")
      .select("id, country_code, parent_id, region_type, is_enabled")
      .eq("id", parentRegionId)
      .eq("country_code", countryCode)
      .eq("is_enabled", true)
      .maybeSingle();
    if (parentError) throw parentError;
    if (!parent) throw new Error("invalid_parent_region");

    const parentLevelIndex = levels.findIndex((level) => level.region_types.includes(parent.region_type));
    if (parentLevelIndex < 0 || parentLevelIndex + 1 >= levels.length) {
      throw new Error("country_region_level_not_found");
    }

    if (parentLevelIndex === 0 && parent.parent_id !== null) {
      throw new Error("invalid_parent_region");
    }
    if (parentLevelIndex > 0) {
      if (parent.parent_id === null) throw new Error("invalid_parent_region");
      const { data: grandParent, error: grandParentError } = await client.from("country_regions")
        .select("id, region_type, country_code, is_enabled")
        .eq("id", parent.parent_id)
        .eq("country_code", countryCode)
        .eq("is_enabled", true)
        .maybeSingle();
      if (grandParentError) throw grandParentError;
      const previousLevel = levels[parentLevelIndex - 1];
      if (!grandParent || !previousLevel || !previousLevel.region_types.includes(grandParent.region_type)) {
        throw new Error("invalid_parent_region");
      }
    }

    const nextLevel = levels[parentLevelIndex + 1];
    if (!nextLevel) throw new Error("country_region_level_not_found");
    selectedLevel = nextLevel;
    parentId = parent.id;
  }

  const client = getSupabaseClient();
  const query = client.from("country_regions")
    .select("id, country_code, parent_id, code, name_ar, name_fr, name_en, region_type, is_enabled")
    .eq("country_code", countryCode)
    .in("region_type", selectedLevel.region_types)
    .eq("is_enabled", true)
    .order("code", { ascending: true });

  const { data, error } = parentId === null
    ? await query.is("parent_id", null)
    : await query.eq("parent_id", parentId);
  if (error) throw error;

  return {
    countryCode,
    callingCode,
    levels,
    selectedLevel,
    regions: RegionSchema.array().parse(data as unknown)
  };

}

export async function fetchMyAccountRegions(parentRegionId?: number | null): Promise<AccountRegionOptions> {
  return fetchCountryRegions(await fetchMyAccountCountryCode(), parentRegionId);
}

export async function fetchMyAccountChildRegions(parentRegionId: number): Promise<CountryRegion[]> {
  return (await fetchMyAccountRegions(parentRegionId)).regions;
}

export function getRegionDisplayName(region: Pick<CountryRegion, "name_ar" | "name_fr" | "name_en">, language: string): string {
  if (language === "fr") return region.name_fr ?? region.name_en ?? region.name_ar;
  if (language === "en") return region.name_en ?? region.name_fr ?? region.name_ar;
  return region.name_ar;
}

export function normalizePhoneForCallingCode(value: string, callingCode: string): string {
  if (!/^\+[1-9]\d{0,2}$/.test(callingCode)) throw new Error("invalid_calling_code");
  let normalized = value.trim().replace(/[\s().-]/g, "");
  if (normalized.startsWith("00")) normalized = "+" + normalized.slice(2);
  if (!normalized.startsWith("+")) {
    const callingDigits = callingCode.slice(1);
    if (normalized.startsWith(callingDigits)) normalized = "+" + normalized;
    else if (normalized.startsWith("0")) normalized = callingCode + normalized.slice(1);
    else normalized = callingCode + normalized;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(normalized) || !normalized.startsWith(callingCode)) {
    throw new Error("invalid_phone");
  }
  return normalized;
}
