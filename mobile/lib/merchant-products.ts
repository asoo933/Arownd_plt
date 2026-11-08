import type { ImagePickerAsset } from "expo-image-picker";
import { z } from "zod";

import { getSupabaseClient } from "@/lib/supabase";
import type { MerchantProductInput } from "@/lib/merchant-product-create-state";
import {
  getNextPrimaryProductImageId,
  getProductImageExtension,
  getProductImageStoragePath,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MAX_COUNT,
  validateProductImageMetadata
} from "@/lib/merchant-product-images";
import { MerchantProductOfferSchema } from "@/lib/merchant-products-schema";
import type {
  MerchantOfferValues,
  MerchantProductDetailsValues,
  MerchantProductOffer
} from "@/lib/merchant-products-state";

const MerchantProductImageSchema = z.object({
  id: z.string().uuid(),
  image_url: z.string().url(),
  is_primary: z.boolean()
});

export type MerchantProductImage = z.infer<typeof MerchantProductImageSchema>;

export type RemoveMerchantProductImageResult = {
  storageCleanupPending: boolean;
  primaryPromotionPending: boolean;
};

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

async function uploadProductImage(
  userId: string,
  asset: ImagePickerAsset,
  suffix: string
): Promise<{ path: string; url: string }> {
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
  const uniquePart = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${suffix}`;
  const path = `${userId}/products/${uniquePart}.${extension}`;
  const client = getSupabaseClient();

  const { error: uploadError } = await client.storage
    .from("product-media")
    .upload(path, body, {
      contentType,
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data } = client.storage.from("product-media").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function fetchMerchantProducts(storeId: string): Promise<MerchantProductOffer[]> {
  await assertOwnedStore(storeId);

  const { data, error } = await getSupabaseClient()
    .from("store_offers")
    .select("id, store_id, product_id, price, stock_quantity, options, is_available, is_merchant_hidden, created_at, product:products!inner(id, name, description, brand, category), images:product_images(id, image_url, is_primary)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return MerchantProductOfferSchema.array().parse(data as unknown);
}

export async function fetchMerchantProductOffer(
  storeId: string,
  offerId: string
): Promise<MerchantProductOffer> {
  await assertOwnedStore(storeId);

  const { data, error } = await getSupabaseClient()
    .from("store_offers")
    .select("id, store_id, product_id, price, stock_quantity, options, is_available, is_merchant_hidden, created_at, product:products!inner(id, name, description, brand, category), images:product_images(id, image_url, is_primary)")
    .eq("store_id", storeId)
    .eq("id", offerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("merchant_offer_not_found");
  return MerchantProductOfferSchema.parse(data as unknown);
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
    stock_quantity: z.number().int().min(0).max(9999),
    options: z.object({
      sizes: z.array(z.string().trim().min(1).max(40)).max(20),
      colors: z.array(z.string().trim().min(1).max(40)).max(20)
    }).optional()
  }).parse(values);

  await updateOwnedOffer(offerId, storeId, { price: parsed.price, stock_quantity: parsed.stock_quantity, ...(parsed.options ? { options: parsed.options } : {}) });
}

export async function updateMerchantProductDetails(
  offerId: string,
  storeId: string,
  values: MerchantProductDetailsValues
): Promise<string> {
  const parsed = z.object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(3000),
    brand: z.string().trim().max(80),
    category: z.string().trim().min(1)
  }).parse(values);

  await assertOwnedStore(storeId);
  const { data, error } = await getSupabaseClient().rpc("update_merchant_product_details", {
    _offer_id: offerId,
    _store_id: storeId,
    _name: parsed.name,
    _description: parsed.description,
    _brand: parsed.brand,
    _category: parsed.category
  });

  if (error) throw error;
  return z.string().uuid().parse(data as unknown);
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

export async function addMerchantProductImage(
  storeId: string,
  offerId: string,
  asset: ImagePickerAsset
): Promise<MerchantProductImage> {
  const userId = await assertOwnedStore(storeId);
  const client = getSupabaseClient();

  const { data: offer, error: offerError } = await client
    .from("store_offers")
    .select("id")
    .eq("id", offerId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (offerError) throw offerError;
  if (!offer) throw new Error("merchant_offer_not_found");

  const { data: currentImages, error: imagesError } = await client
    .from("product_images")
    .select("id, is_primary")
    .eq("offer_id", offerId)
    .limit(PRODUCT_IMAGE_MAX_COUNT);

  if (imagesError) throw imagesError;
  if ((currentImages ?? []).length >= PRODUCT_IMAGE_MAX_COUNT) {
    throw new Error("product_image_limit_reached");
  }

  const uploaded = await uploadProductImage(userId, asset, "edit");
  const { data: latestImages, error: latestImagesError } = await client
    .from("product_images")
    .select("id, is_primary")
    .eq("offer_id", offerId)
    .limit(PRODUCT_IMAGE_MAX_COUNT);

  if (latestImagesError || (latestImages ?? []).length >= PRODUCT_IMAGE_MAX_COUNT) {
    const { error: cleanupError } = await client.storage
      .from("product-media")
      .remove([uploaded.path]);

    if (cleanupError) {
      throw new Error("product_image_upload_cleanup_required", {
        cause: latestImagesError ?? new Error("product_image_limit_reached")
      });
    }
    if (latestImagesError) throw latestImagesError;
    throw new Error("product_image_limit_reached");
  }

  const { data, error } = await client
    .from("product_images")
    .insert({
      offer_id: offerId,
      image_url: uploaded.url,
      is_primary: !(latestImages ?? []).some((image) => image.is_primary)
    })
    .select("id, image_url, is_primary")
    .single();

  if (error) {
    const { error: cleanupError } = await client.storage
      .from("product-media")
      .remove([uploaded.path]);

    if (cleanupError) {
      throw new Error("product_image_insert_failed_storage_cleanup_required", { cause: error });
    }
    throw error;
  }

  return MerchantProductImageSchema.parse(data as unknown);
}

export async function removeMerchantProductImage(
  storeId: string,
  offerId: string,
  imageId: string
): Promise<RemoveMerchantProductImageResult> {
  const userId = await assertOwnedStore(storeId);
  const client = getSupabaseClient();

  const { data: offer, error: offerError } = await client
    .from("store_offers")
    .select("id")
    .eq("id", offerId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (offerError) throw offerError;
  if (!offer) throw new Error("merchant_offer_not_found");

  const { data: currentImages, error: imagesError } = await client
    .from("product_images")
    .select("id, image_url, is_primary")
    .eq("offer_id", offerId);

  if (imagesError) throw imagesError;

  const imageReferences = z.array(MerchantProductImageSchema).parse(currentImages ?? []);
  const image = imageReferences.find((item) => item.id === imageId);
  if (!image) throw new Error("merchant_product_image_not_found");

  const { data: removed, error: deleteError } = await client
    .from("product_images")
    .delete()
    .eq("offer_id", offerId)
    .eq("id", imageId)
    .select("id, image_url, is_primary")
    .maybeSingle();

  if (deleteError) throw deleteError;
  if (!removed) throw new Error("merchant_product_image_not_removed");

  let primaryPromotionPending = false;
  const nextPrimaryId = getNextPrimaryProductImageId(
    imageReferences,
    imageId
  );

  if (nextPrimaryId) {
    const { data: promotedImage, error: primaryError } = await client
      .from("product_images")
      .update({ is_primary: true })
      .eq("offer_id", offerId)
      .eq("id", nextPrimaryId)
      .select("id")
      .maybeSingle();

    primaryPromotionPending = !!primaryError || !promotedImage;
  }

  const { data: remainingReferences, error: referencesError } = await client
    .from("product_images")
    .select("id")
    .eq("image_url", removed.image_url)
    .limit(1);

  if (referencesError || (remainingReferences ?? []).length > 0) {
    return {
      storageCleanupPending: !!referencesError,
      primaryPromotionPending
    };
  }

  const storagePath = getProductImageStoragePath(removed.image_url, userId);
  if (!storagePath) {
    return { storageCleanupPending: true, primaryPromotionPending };
  }

  const { error: storageError } = await client.storage
    .from("product-media")
    .remove([storagePath]);

  return {
    storageCleanupPending: !!storageError,
    primaryPromotionPending
  };
}

export async function createMerchantProductOffer(
  storeId: string,
  input: MerchantProductInput,
  selectedImages: readonly ImagePickerAsset[] = []
): Promise<string> {
  if (selectedImages.length > PRODUCT_IMAGE_MAX_COUNT) {
    throw new Error("too_many_product_images");
  }

  const userId = await assertOwnedStore(storeId);
  const client = getSupabaseClient();
  const uploadedPaths: string[] = [];
  let rpcCommitted = false;
  const uploadedImages: { path: string; url: string }[] = [];

  try {
    for (const [index, asset] of selectedImages.entries()) {
      const uploaded = await uploadProductImage(userId, asset, String(index));
      uploadedPaths.push(uploaded.path);
      uploadedImages.push(uploaded);
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
    rpcCommitted = true;
    return z.string().uuid().parse(data as unknown);
  } catch (error) {
    if (!rpcCommitted && uploadedPaths.length > 0) {
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
