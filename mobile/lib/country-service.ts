import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";

const SELECTED_COUNTRY_STORAGE_KEY = "arownd:account-country";

const CountrySchema = z.object({
  code: z.string().length(2),
  name_ar: z.string(),
  name_en: z.string().nullable(),
  flag_emoji: z.string().nullable(),
  currency_code: z.string(),
  currency_name_ar: z.string().nullable(),
  currency_name_en: z.string().nullable(),
  is_enabled: z.boolean()
});

export type Country = z.infer<typeof CountrySchema>;

export async function fetchCountries(): Promise<Country[]> {
  const { data, error } = await getSupabaseClient()
    .from("countries")
    .select("code, name_ar, name_en, flag_emoji, currency_code, currency_name_ar, currency_name_en, is_enabled")
    .order("name_ar", { ascending: true });

  if (error) throw error;
  return CountrySchema.array().parse(data as unknown);
}

export async function getSelectedCountryCode(): Promise<string | null> {
  const value = await AsyncStorage.getItem(SELECTED_COUNTRY_STORAGE_KEY);
  return value && /^[A-Z]{2}$/.test(value) ? value : null;
}

export async function saveSelectedCountryCode(countryCode: string): Promise<void> {
  if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error("INVALID_COUNTRY_CODE");
  await AsyncStorage.setItem(SELECTED_COUNTRY_STORAGE_KEY, countryCode);
}

export async function detectCountryFromIp(): Promise<string | null> {
  try {
    const response = await fetch("https://ipwho.is/");
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) return null;
    const result = payload as { success?: unknown; country_code?: unknown };
    if (result.success !== true || typeof result.country_code !== "string") return null;
    const countryCode = result.country_code.toUpperCase();
    return /^[A-Z]{2}$/.test(countryCode) ? countryCode : null;
  } catch {
    return null;
  }
}
