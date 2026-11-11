import { z } from "zod";

export const UserAddressSchema = z.object({
  label: z.enum(["home", "work", "other"]),
  recipient_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^(?:0[567]\d{8}|\+213[567]\d{8}|00213[567]\d{8})$/),
  wilaya_id: z.number().int().positive(),
  daira_region_id: z.number().int().positive(),
  commune: z.string().trim().min(2).max(100),
  address_line: z.string().trim().min(5).max(240),
  additional_info: z.string().trim().max(240).optional().or(z.literal(""))
});

export type UserAddressInput = z.infer<typeof UserAddressSchema>;

export function isValidAddressPhone(value: string): boolean {
  return /^(?:0[567]\d{8}|\+213[567]\d{8}|00213[567]\d{8})$/.test(normalizeAddressPhone(value));
}

export function normalizeAddressPhone(value: string): string {
  return value.replace(/[\s()-]/g, "");
}
