import type { ImagePickerAsset } from "expo-image-picker";

import { getSupabaseClient } from "@/lib/supabase";

export const STORE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif"
};

type StoreImageMetadata = Pick<ImagePickerAsset, "mimeType" | "fileName" | "fileSize">;

function getStoreImageExtension(asset: StoreImageMetadata): string | null {
  const mime = asset.mimeType?.toLowerCase();
  if (mime) return MIME_EXTENSIONS[mime] ?? null;
  const extension = asset.fileName?.split(".").pop()?.toLowerCase();
  if (!extension) return null;
  const extensions: Readonly<Record<string, string>> = { jpeg: "jpg", jpg: "jpg", png: "png", webp: "webp", heic: "heic", heif: "heif" };
  return extensions[extension] ?? null;
}

export function validateStoreImageAsset(asset: StoreImageMetadata): boolean {
  const extension = getStoreImageExtension(asset);
  return Boolean(extension)
    && (asset.fileSize === null || asset.fileSize === undefined
      || (Number.isFinite(asset.fileSize) && asset.fileSize > 0 && asset.fileSize <= STORE_IMAGE_MAX_BYTES));
}

export function getStoreImageStoragePath(publicUrl: string, userId: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = "/storage/v1/object/public/store-media/";
    const markerIndex = url.pathname.indexOf(marker);
    if (url.protocol !== "https:" || markerIndex < 0) return null;
    const path = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    const segments = path.split("/");
    if (!path.startsWith(`${userId}/stores/`) || segments.length !== 3
      || segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
    return path;
  } catch {
    return null;
  }
}

export async function uploadMerchantStoreImage(
  storeId: string,
  asset: ImagePickerAsset,
  kind: "logo" | "cover"
): Promise<{ url: string; cleanupPending: boolean }> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("not_authenticated");

  const { data: store, error: storeError } = await client.from("stores")
    .select("id, logo_url, cover_url")
    .eq("id", storeId)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (storeError) throw storeError;
  if (!store) throw new Error("merchant_store_not_found");
  const oldUrl = kind === "logo" ? store.logo_url : store.cover_url;
  if (!validateStoreImageAsset(asset)) throw new Error("invalid_store_image");

  const extension = getStoreImageExtension(asset);
  if (!extension) throw new Error("invalid_store_image");
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error("store_image_read_failed");
  const body = await response.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > STORE_IMAGE_MAX_BYTES) throw new Error("invalid_store_image_size");

  const path = `${auth.user.id}/stores/${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const contentType = asset.mimeType?.toLowerCase() ?? (extension === "jpg" ? "image/jpeg" : `image/${extension}`);
  const { error: uploadError } = await client.storage.from("store-media").upload(path, body, {
    contentType,
    cacheControl: "3600",
    upsert: false
  });
  if (uploadError) throw uploadError;

  const { data: publicData } = client.storage.from("store-media").getPublicUrl(path);
  const publicUrl = publicData.publicUrl;
  const column = kind === "logo" ? "logo_url" : "cover_url";
  const { data: updated, error: updateError } = await client.from("stores")
    .update({ [column]: publicUrl })
    .eq("id", storeId)
    .eq("owner_id", auth.user.id)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    const { error: cleanupError } = await client.storage.from("store-media").remove([path]);
    if (cleanupError) throw new Error("store_image_upload_cleanup_required", { cause: updateError ?? cleanupError });
    if (updateError) throw updateError;
    throw new Error("merchant_store_not_updated");
  }

  let cleanupPending = false;
  if (oldUrl) {
    const oldPath = getStoreImageStoragePath(oldUrl, auth.user.id);
    if (oldPath) {
      const { error: cleanupError } = await client.storage.from("store-media").remove([oldPath]);
      cleanupPending = !!cleanupError;
    }
  }
  return { url: publicUrl, cleanupPending };
}
