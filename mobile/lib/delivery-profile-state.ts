import { z } from "zod";

export const DeliveryProfileSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^(?:0[567]\d{8}|\+213[567]\d{8}|00213[567]\d{8})$/),
  wilaya_id: z.number().int().positive(),
  daira_region_id: z.number().int().positive(),
  commune: z.string().trim().min(2).max(100)
});

export type DeliveryProfileInput = z.infer<typeof DeliveryProfileSchema>;

export function normalizeAlgerianPhone(value: string): string {
  return value.replace(/[\s()-]/g, "");
}
