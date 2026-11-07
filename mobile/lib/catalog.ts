import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";

const HomeProductSchema = z.object({
  id: z.string(),
  price: z.coerce.number(),
  stock_quantity: z.coerce.number(),
  is_available: z.boolean(),
  product: z.object({
    id: z.string(),
    name: z.string(),
    category: z.string().nullable().optional(),
    brand: z.string().nullable().optional()
  }),
  store: z.object({ id: z.string(), name: z.string() }),
  images: z.array(z.object({
    image_url: z.string().nullable(),
    is_primary: z.boolean()
  })).default([])
});

const FeaturedStoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  commune: z.string().nullable().optional(),
  rating: z.preprocess((value: unknown) => value == null ? null : Number(value), z.number().nullable()).optional(),
  is_verified: z.boolean()
});

export type HomeProduct = z.infer<typeof HomeProductSchema>;
export type FeaturedStore = z.infer<typeof FeaturedStoreSchema>;

export async function fetchHomeProducts(): Promise<HomeProduct[]> {
  const { data, error } = await getSupabaseClient()
    .from("store_offers")
    .select("id, price, stock_quantity, is_available, product:products!inner(id, name, category, brand), store:stores!inner(id, name), images:product_images(image_url, is_primary)")
    .eq("is_available", true)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) throw error;
  return HomeProductSchema.array().parse(data as unknown);
}

export async function fetchFeaturedStores(): Promise<FeaturedStore[]> {
  const { data, error } = await getSupabaseClient()
    .from("stores")
    .select("id, name, description, logo_url, commune, rating, is_verified")
    .eq("is_verified", true)
    .order("rating", { ascending: false })
    .limit(6);

  if (error) throw error;
  return FeaturedStoreSchema.array().parse(data as unknown);
}

export async function searchCatalogProducts(query: string, category?: string): Promise<HomeProduct[]> {
  const normalized = query.trim().replace(/[%,()]/g, " ");
  let request = getSupabaseClient()
    .from("store_offers")
    .select("id, price, stock_quantity, is_available, product:products!inner(id, name, category, brand), store:stores!inner(id, name), images:product_images(image_url, is_primary)")
    .eq("is_available", true)
    .gt("stock_quantity", 0);

  if (normalized) {
    request = request.ilike("product.name", "%" + normalized + "%");
  }

  const { data, error } = await request
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw error;
  return HomeProductSchema.array().parse(data as unknown);
}

export function getPrimaryImage(product: HomeProduct): string | null {
  const image = product.images.find((item) => item.is_primary) ?? product.images[0];
  return image?.image_url ?? null;
}

export function formatDZD(amount: number): string {
  return new Intl.NumberFormat("ar-DZ", {
    style: "currency",
    currency: "DZD",
    maximumFractionDigits: 0
  }).format(amount);
}
