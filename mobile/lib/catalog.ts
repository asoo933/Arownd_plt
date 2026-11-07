import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";

const ProductSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  brand: z.string().nullable().optional()
}).passthrough();

const StoreSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  commune: z.string().nullable().optional(),
  address_line: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  instagram_url: z.string().nullable().optional(),
  facebook_url: z.string().nullable().optional(),
  rating: z.preprocess((value: unknown) => value == null ? null : Number(value), z.number().nullable()).optional(),
  is_verified: z.boolean().optional(),
  opening_hours: z.unknown().optional(),
  latitude: z.preprocess((value: unknown) => value == null ? null : Number(value), z.number().nullable()).optional(),
  longitude: z.preprocess((value: unknown) => value == null ? null : Number(value), z.number().nullable()).optional()
}).passthrough();

const ProductImageSchema = z.object({
  id: z.string().optional(),
  image_url: z.string().nullable(),
  is_primary: z.boolean().optional()
}).passthrough();

const HomeProductSchema = z.object({
  id: z.string(),
  price: z.coerce.number(),
  stock_quantity: z.coerce.number(),
  is_available: z.boolean(),
  product: ProductSummarySchema,
  store: z.object({ id: z.string(), name: z.string() }),
  images: z.array(ProductImageSchema).default([])
}).passthrough();

const FeaturedStoreSchema = StoreSummarySchema.extend({
  id: z.string(),
  name: z.string(),
  is_verified: z.boolean()
});

const ProductOfferSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  price: z.coerce.number(),
  old_price: z.coerce.number().nullable().optional(),
  stock_quantity: z.coerce.number(),
  is_available: z.boolean(),
  last_confirmed_at: z.string().nullable().optional(),
  options: z.unknown().optional(),
  product: ProductSummarySchema,
  store: StoreSummarySchema,
  images: z.array(ProductImageSchema).default([])
}).passthrough();

export type HomeProduct = z.infer<typeof HomeProductSchema>;
export type FeaturedStore = z.infer<typeof FeaturedStoreSchema>;
export type ProductSummary = z.infer<typeof ProductSummarySchema>;
export type StoreDetails = z.infer<typeof StoreSummarySchema>;
export type ProductOffer = z.infer<typeof ProductOfferSchema>;

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

  if (normalized) request = request.ilike("product.name", "%" + normalized + "%");
  if (category) request = request.eq("product.category", category);

  const { data, error } = await request
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw error;
  return HomeProductSchema.array().parse(data as unknown);
}

export async function fetchProductDetails(productId: string): Promise<ProductSummary | null> {
  const { data, error } = await getSupabaseClient()
    .from("products")
    .select("id, name, description, category, brand")
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;
  return data ? ProductSummarySchema.parse(data as unknown) : null;
}

export async function fetchProductOffers(productId: string): Promise<ProductOffer[]> {
  const { data, error } = await getSupabaseClient()
    .from("store_offers")
    .select("*, product:products!inner(id, name, description, category, brand), store:stores!inner(*), images:product_images(*)")
    .eq("product_id", productId)
    .order("price", { ascending: true });

  if (error) throw error;
  return ProductOfferSchema.array().parse(data as unknown);
}

export async function fetchStoreDetails(storeId: string): Promise<StoreDetails | null> {
  const { data, error } = await getSupabaseClient()
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .maybeSingle();

  if (error) throw error;
  return data ? StoreSummarySchema.parse(data as unknown) : null;
}

export async function fetchStoreOffers(storeId: string): Promise<HomeProduct[]> {
  const { data, error } = await getSupabaseClient()
    .from("store_offers")
    .select("id, price, stock_quantity, is_available, product:products!inner(id, name, category, brand), store:stores!inner(id, name), images:product_images(image_url, is_primary)")
    .eq("store_id", storeId)
    .eq("is_available", true)
    .gt("stock_quantity", 0)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) throw error;
  return HomeProductSchema.array().parse(data as unknown);
}

export function getPrimaryImage(product: HomeProduct | ProductOffer): string | null {
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

export function chooseBestProductOffer(offers: ProductOffer[]): ProductOffer | null {
  const available = offers.filter((offer) => offer.is_available && offer.stock_quantity > 0);
  const candidates = available.length > 0 ? available : offers;
  return candidates.reduce<ProductOffer | null>(
    (best, offer) => best === null || offer.price < best.price ? offer : best,
    null
  );
}
