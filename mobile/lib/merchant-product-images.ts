export const PRODUCT_IMAGE_MAX_COUNT = 5;
export const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/avif": "avif", "image/heic": "heic", "image/heif": "heif", "image/gif": "gif"
};

export type ProductImageMetadata = { mimeType: string | null; fileName: string | null; fileSize: number | null };

export function getProductImageExtension(asset: ProductImageMetadata): string | null {
  const mimeType = asset.mimeType?.toLowerCase();
  if (mimeType && MIME_EXTENSIONS[mimeType]) return MIME_EXTENSIONS[mimeType];
  const fileName = asset.fileName?.toLowerCase() ?? "";
  const extension = fileName.split(".").pop();
  if (!extension) return null;
  const extensionMap: Readonly<Record<string, string>> = {
    jpg: "jpg", jpeg: "jpg", png: "png", webp: "webp", avif: "avif", heic: "heic", heif: "heif", gif: "gif"
  };
  return extensionMap[extension] ?? null;
}

export function validateProductImageMetadata(asset: ProductImageMetadata): boolean {
  const extension = getProductImageExtension(asset);
  const mimeType = asset.mimeType?.toLowerCase();
  if (!extension || (mimeType && !MIME_EXTENSIONS[mimeType])) return false;
  if (asset.fileSize !== null && (!Number.isFinite(asset.fileSize) || asset.fileSize <= 0 || asset.fileSize > PRODUCT_IMAGE_MAX_BYTES)) return false;
  return true;
}

export type MerchantProductImageReference = { id: string; image_url: string; is_primary: boolean };

/** Extracts public or signed object paths restricted to this user's product folder. */
export function getProductImageStoragePath(imageUrl: string, userId: string): string | null {
  if (!userId.trim()) return null;
  try {
    const url = new URL(imageUrl);
    if (url.protocol !== "https:") return null;
    const markers = [
      "/storage/v1/object/public/product-media/",
      "/storage/v1/object/sign/product-media/"
    ];
    const marker = markers.find((item) => url.pathname.includes(item));
    if (!marker) return null;
    const markerIndex = url.pathname.indexOf(marker);
    const storagePath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    const segments = storagePath.split("/");
    if (!storagePath.startsWith(userId + "/products/") || segments.length !== 3 ||
      segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
    return storagePath;
  } catch {
    return null;
  }
}

export function getNextPrimaryProductImageId(images: readonly MerchantProductImageReference[], removedImageId: string): string | null {
  const removed = images.find((image) => image.id === removedImageId);
  if (!removed?.is_primary) return null;
  const remaining = images.filter((image) => image.id !== removedImageId);
  if (remaining.some((image) => image.is_primary)) return null;
  return remaining[0]?.id ?? null;
}
