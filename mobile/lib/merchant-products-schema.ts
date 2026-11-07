import { z } from "zod";

export const MerchantProductOfferSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  product_id: z.string().uuid(),
  price: z.coerce.number(),
  old_price: z.preprocess((value: unknown) => value == null ? null : Number(value), z.number().nullable()).optional(),
  stock_quantity: z.coerce.number(),
  options: z.object({
    sizes: z.array(z.string()).default([]),
    colors: z.array(z.string()).default([])
  }).passthrough().default({ sizes: [], colors: [] }),
  is_available: z.boolean(),
  is_merchant_hidden: z.boolean(),
  created_at: z.string(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable().optional().default(null),
    brand: z.string().nullable().optional().default(null),
    category: z.string().optional().default("other")
  }).passthrough(),
  images: z.array(z.object({
    id: z.string().uuid(),
    image_url: z.string().url(),
    is_primary: z.boolean()
  }).passthrough()).default([])
}).passthrough();
