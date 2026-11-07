export const PRODUCT_IMAGE_MAX_COUNT = 5;
export const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif"
};

export type ProductImageMetadata = {
  mimeType: string | null;
  fileName: string | null;
  fileSize: number | null;
};

export function getProductImageExtension(asset: ProductImageMetadata): string | null {
  const mimeType = asset.mimeType?.toLowerCase();
  if (mimeType && MIME_EXTENSIONS[mimeType]) return MIME_EXTENSIONS[mimeType];

  const fileName = asset.fileName?.toLowerCase() ?? "";
  const extension = fileName.split(".").pop();
  if (!extension) return null;

  const extensionMap: Readonly<Record<string, string>> = {
    jpg: "jpg",
    jpeg: "jpg",
    png: "png",
    webp: "webp",
    avif: "avif",
    heic: "heic",
    heif: "heif",
    gif: "gif"
  };

  return extensionMap[extension] ?? null;
}

export function validateProductImageMetadata(asset: ProductImageMetadata): boolean {
  const extension = getProductImageExtension(asset);
  const mimeType = asset.mimeType?.toLowerCase();

  if (!extension || (mimeType && !MIME_EXTENSIONS[mimeType])) return false;
  if (asset.fileSize !== null && (!Number.isFinite(asset.fileSize) || asset.fileSize <= 0 || asset.fileSize > PRODUCT_IMAGE_MAX_BYTES)) {
    return false;
  }

  return true;
}


export type MerchantProductImageReference = {
  id: string;
  image_url: string;
  is_primary: boolean;
};

/**
 * Returns a storage path only for this user's product-media files.
 * This intentionally refuses arbitrary URLs and paths outside the product folder.
 */
export function getProductImageStoragePath(
  publicUrl: string,
  userId: string
): string | null {
  if (!publicUrl.startsWith("https://") || !userId.trim()) return null;

  const marker = "/storage/v1/object/public/product-media/";
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex < 0) return null;

  const encodedPath = publicUrl
    .slice(markerIndex + marker.length)
    .split(/[?#]/, 1)[0];

  let storagePath: string;
  try {
    storagePath = decodeURIComponent(encodedPath);
  } catch {
    return null;
  }

  const segments = storagePath.split("/");
  if (
    !storagePath.startsWith(`${userId}/products/`) ||
    segments.length !== 3 ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return null;
  }

  return storagePath;
}

/** Finds a replacement primary image only when the removed image was primary. */
export function getNextPrimaryProductImageId(
  images: readonly MerchantProductImageReference[],
  removedImageId: string
): string | null {
  const removed = images.find((image) => image.id === removedImageId);
  if (!removed?.is_primary) return null;

  return images.find((image) => image.id !== removedImageId)?.id ?? null;
}
