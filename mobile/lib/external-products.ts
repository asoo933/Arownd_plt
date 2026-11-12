import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";
import type { ExternalProduct } from "@/components/external-product-card";

const ExternalProductsResponseSchema = z.object({
  products: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    storeName: z.string().min(1),
    productUrl: z.string().url(),
    imageUrl: z.string().url().nullable(),
    priceLabel: z.string().min(1),
  })),
});

const SUPPORTED_MARKETS: Record<string, "ae" | "eg" | "ma"> = {
  AE: "ae",
  EG: "eg",
  MA: "ma",
};

async function fetchMarketProducts(
  language: "ar" | "en",
): Promise<ExternalProduct[]> {
  const { data, error } = await getSupabaseClient().functions.invoke("external-products", {
    body: { language },
  });

  if (error) throw error;
  return ExternalProductsResponseSchema.parse(data).products;
}

/**
 * External product sources are displayed only when the selected browsing
 * country has a configured market. The Edge Function independently resolves
 * the authenticated user's browsing country before querying a provider.
 */
export async function fetchExternalProducts(
  language: "ar" | "en",
  browsingCountryCode: string,
): Promise<ExternalProduct[] | null> {
  if (!SUPPORTED_MARKETS[browsingCountryCode]) return null;
  return fetchMarketProducts(language);
}
