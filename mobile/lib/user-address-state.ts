import { z } from "zod";

export const UserAddressSchema = z.object({
  label: z.enum(["home", "work", "other"]),
  recipient_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/),
  region_id: z.number().int().positive(),
  secondary_region_id: z.number().int().positive().nullable(),
  commune: z.string().trim().min(2).max(100),
  address_line: z.string().trim().min(5).max(240),
  additional_info: z.string().trim().max(240).optional().or(z.literal(""))
});

export type UserAddressInput = z.infer<typeof UserAddressSchema>;

export function isValidAddressPhone(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(normalizeAddressPhone(value));
}

export function normalizeAddressPhone(value: string): string {
  return value.replace(/[\s()-]/g, "");
}
