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
