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

/**
 * Administrative hierarchy is configured in the database, not in a
 * country-code switch. Adding a market only requires country and level data.
 */
export async function fetchMyAccountRegionLevels(): Promise<{
  countryCode: SupportedCountryCode;
  levels: CountryRegionLevel[];
}> {
  const countryCode = await fetchMyAccountCountryCode();
  const client = getSupabaseClient();

  const { data: country, error: countryError } = await client.from("countries")
    .select("code, is_enabled")
    .eq("code", countryCode)
    .single();
  if (countryError) throw countryError;
  if (!country.is_enabled) throw new Error("account_country_disabled");

  const { data, error } = await client.from("country_region_levels")
    .select("country_code, level, region_types, label_ar, label_en, is_required")
    .eq("country_code", countryCode)
    .order("level", { ascending: true });
  if (error) throw error;

  const levels = CountryRegionLevelSchema.array().parse(data as unknown);
  if (levels.length === 0 || levels[0].level !== 1) {
    throw new Error("country_region_levels_not_configured");
  }
  for (let index = 0; index < levels.length; index += 1) {
    if (levels[index].level !== index + 1) {
      throw new Error("country_region_levels_invalid_sequence");
    }
  }

  return { countryCode, levels };
}

export async function fetchMyAccountRegions(parentRegionId?: number | null): Promise<AccountRegionOptions> {
  const { countryCode, levels } = await fetchMyAccountRegionLevels();
  let selectedLevel = levels[0];
  let parentId: number | null = null;

  if (parentRegionId !== undefined && parentRegionId !== null) {
    if (!Number.isInteger(parentRegionId) || parentRegionId <= 0) {
      throw new Error("invalid_parent_region");
    }

    const { data: parent, error: parentError } = await getSupabaseClient().from("country_regions")
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

    const expectedParentLevel = levels[parentLevelIndex];
    const { data: parentParent, error: parentParentError } = parent.parent_id === null
      ? { data: null, error: null }
      : await getSupabaseClient().from("country_regions")
          .select("id, region_type, country_code")
          .eq("id", parent.parent_id)
          .eq("country_code", countryCode)
          .maybeSingle();
    if (parentParentError) throw parentParentError;
    if (parent.parent_id === null && expectedParentLevel.level !== 1) {
      throw new Error("invalid_parent_region");
    }
    if (parent.parent_id !== null && !parentParent) {
      throw new Error("invalid_parent_region");
    }

    selectedLevel = levels[parentLevelIndex + 1];
    parentId = parent.id;
  }

  const { data, error } = await getSupabaseClient().from("country_regions")
    .select("id, country_code, parent_id, code, name_ar, name_fr, name_en, region_type, is_enabled")
    .eq("country_code", countryCode)
    .in("region_type", selectedLevel.region_types)
    .eq("is_enabled", true)
    .order("code", { ascending: true });

  if (error) throw error;

  const regions = RegionSchema.array().parse(data as unknown)
    .filter((region) => region.parent_id === parentId);

  return { countryCode, levels, selectedLevel, regions };
}

export async function fetchMyAccountChildRegions(parentRegionId: number): Promise<CountryRegion[]> {
  const result = await fetchMyAccountRegions(parentRegionId);
  return result.regions;
}

export function getRegionDisplayName(region: CountryRegion, language: string): string {
  if (language === "fr") return region.name_fr ?? region.name_en ?? region.name_ar;
  if (language === "en") return region.name_en ?? region.name_fr ?? region.name_ar;
  return region.name_ar;
}
