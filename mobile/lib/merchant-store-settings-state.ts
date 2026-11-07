import { z } from "zod";

function isHttpsUrl(value: string): boolean {
  if (!value) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export const MerchantStoreSettingsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000),
  phone: z.string().trim().regex(/^[+0-9()\s-]{7,20}$/),
  whatsapp: z.string().trim().max(20).refine((value) => value.length === 0 || /^[+0-9()\s-]{7,20}$/.test(value)),
  commune: z.string().trim().min(2).max(80),
  address_line: z.string().trim().min(4).max(300),
  opening_hours: z.object({
    open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    closed_days: z.array(z.number().int().min(0).max(6)).max(7).refine((days) => new Set(days).size === days.length)
  }),
  instagram_url: z.string().trim().max(300).refine(isHttpsUrl),
  facebook_url: z.string().trim().max(300).refine(isHttpsUrl)
});

export type MerchantStoreSettings = z.infer<typeof MerchantStoreSettingsSchema>;

export function parseMerchantStoreSettings(value: unknown): MerchantStoreSettings {
  return MerchantStoreSettingsSchema.parse(value);
}
