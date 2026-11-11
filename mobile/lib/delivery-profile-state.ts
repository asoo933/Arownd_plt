import { z } from "zod";

export const DeliveryProfileSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/),
  region_id: z.number().int().positive(),
  secondary_region_id: z.number().int().positive().nullable(),
  commune: z.string().trim().min(2).max(100)
});

export type DeliveryProfileInput = z.infer<typeof DeliveryProfileSchema>;
