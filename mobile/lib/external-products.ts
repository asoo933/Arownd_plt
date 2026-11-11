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

async function fetchMarketProducts(country: "ae" | "eg", language: "ar" | "en"): Promise<ExternalProduct[]> {
  const { data, error } = await getSupabaseClient().functions.invoke("external-products", {
    body: { country, language },
  });

  if (error) throw error;
  return ExternalProductsResponseSchema.parse(data).products;
}

export async function fetchExternalProducts(language: "ar" | "en"): Promise<ExternalProduct[]> {
  const markets = await Promise.all([
    fetchMarketProducts("ae", language),
    fetchMarketProducts("eg", language),
  ]);

  const unique = new Map<string, ExternalProduct>();
  for (const product of markets.flat()) {
    if (!unique.has(product.id)) unique.set(product.id, product);
  }
  return [...unique.values()];
}
