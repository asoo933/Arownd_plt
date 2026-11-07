import type { ImagePickerAsset } from "expo-image-picker";
import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";
import type { MerchantProductInput } from "@/lib/merchant-product-create-state";
import {
  getProductImageExtension,
  PRODUCT_IMAGE_MAX_BYTES,
  validateProductImageMetadata
} from "@/lib/merchant-product-images";
import { MerchantProductOfferSchema } from "@/lib/merchant-products-schema";
import type { MerchantOfferValues, MerchantProductOffer } from "@/lib/merchant-products-state";

async function assertOwnedStore(storeId: string): Promise<string> {
  const client = getSupabaseClient();
  const { data: authData, error: authError } = await client.auth.getUser();

  if (authError) throw authError;
  if (!authData.user) throw new Error("not_authenticated");

  const { data, error } = await client
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", authData.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("merchant_store_not_found");
  return authData.user.id;
}

export async function fetchMerchantProducts(storeId: string): Promise<MerchantProductOffer[]> {
  await assertOwnedStore(storeId);

  const { data, error } = await getSupabaseClient()
    .from("store_offers")
    .select("id, store_id, product_id, price, stock_quantity, is_available, is_merchant_hidden, created_at, product:products!inner(id, name, brand), images:product_images(id, image_url, is_primary)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return MerchantProductOfferSchema.array().parse(data as unknown);
}

async function updateOwnedOffer(
  offerId: string,
  storeId: string,
  patch: Partial<MerchantOfferValues> | { is_merchant_hidden: boolean }
): Promise<void> {
  await assertOwnedStore(storeId);

  const { data, error } = await getSupabaseClient()
    .from("store_offers")
    .update({
      ...patch,
      last_confirmed_at: new Date().toISOString()
    })
    .eq("id", offerId)
    .eq("store_id", storeId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("merchant_offer_not_updated");
}

export async function updateMerchantProductOffer(
  offerId: string,
  storeId: string,
  values: MerchantOfferValues
): Promise<void> {
  const parsed = z.object({
    price: z.number().int().positive().max(2_147_483_647),
    stock_quantity: z.number().int().min(0).max(9999)
  }).parse(values);

  await updateOwnedOffer(offerId, storeId, parsed);
}

export async function setMerchantProductVisibility(
  offerId: string,
  storeId: string,
  isVisible: boolean
): Promise<void> {
  await updateOwnedOffer(offerId, storeId, {
    is_merchant_hidden: !isVisible
  });
}

export async function createMerchantProductOffer(
  storeId: string,
  input: MerchantProductInput,
  selectedImages: readonly ImagePickerAsset[] = []
): Promise<string> {
  if (selectedImages.length > 5) throw new Error("too_many_product_images");

  const userId = await assertOwnedStore(storeId);
  const client = getSupabaseClient();
  const uploadedPaths: string[] = [];
  const uploadedImages: { path: string; url: string }[] = [];

  try {
    for (const [index, asset] of selectedImages.entries()) {
      const metadata = {
        mimeType: asset.mimeType ?? null,
        fileName: asset.fileName ?? null,
        fileSize: asset.fileSize ?? null
      };

      if (!validateProductImageMetadata(metadata)) {
        throw new Error("invalid_product_image");
      }

      const extension = getProductImageExtension(metadata);
      if (!extension) throw new Error("invalid_product_image");

      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error("product_image_read_failed");

      const body = await response.arrayBuffer();
      if (body.byteLength === 0 || body.byteLength > PRODUCT_IMAGE_MAX_BYTES) {
        throw new Error("invalid_product_image_size");
      }

      const contentType = asset.mimeType?.toLowerCase() ?? (
        extension === "jpg" ? "image/jpeg" : `image/${extension}`
      );
      const uniquePart = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${index}`;
      const path = `${userId}/products/${uniquePart}.${extension}`;

      const { error: uploadError } = await client.storage
        .from("product-media")
        .upload(path, body, {
          contentType,
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) throw uploadError;

      uploadedPaths.push(path);
      const { data } = client.storage.from("product-media").getPublicUrl(path);
      uploadedImages.push({ path, url: data.publicUrl });
    }

    const { data, error } = await client.rpc("create_merchant_product_offer", {
      _store_id: storeId,
      _name: input.name,
      _price: input.price,
      _stock_quantity: input.stock_quantity,
      _category: input.category,
      _brand: input.brand,
      _description: input.description,
      _options: input.options,
      _images: uploadedImages
    });

    if (error) throw error;
    return z.string().uuid().parse(data as unknown);
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await client.storage
        .from("product-media")
        .remove(uploadedPaths);

      if (cleanupError) {
        throw new Error("product_creation_failed_storage_cleanup_required", { cause: error });
      }
    }
    throw error;
  }
}
