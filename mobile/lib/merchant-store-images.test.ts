import { describe, expect, it } from "vitest";

import { getStoreImageStoragePath, validateStoreImageAsset } from "@/lib/merchant-store-images";

describe("merchant store images", () => {
  it("accepts supported image formats within the upload limit", () => {
    expect(validateStoreImageAsset({ mimeType: "image/jpeg", fileName: "logo.jpg", fileSize: 1024 })).toBe(true);
    expect(validateStoreImageAsset({ mimeType: "image/webp", fileName: "cover.webp" })).toBe(true);
  });

  it("rejects unsupported formats and oversized or empty files", () => {
    expect(validateStoreImageAsset({ mimeType: "image/svg+xml", fileName: "logo.svg", fileSize: 100 })).toBe(false);
    expect(validateStoreImageAsset({ mimeType: "image/png", fileName: "logo.png", fileSize: 8 * 1024 * 1024 + 1 })).toBe(false);
    expect(validateStoreImageAsset({ mimeType: "image/png", fileName: "logo.png", fileSize: 0 })).toBe(false);
  });

  it("extracts signed URLs and ignores their token query string", () => {
    expect(getStoreImageStoragePath(
      "https://example.supabase.co/storage/v1/object/sign/store-media/user-1/stores/logo.webp?token=abc.def.ghi",
      "user-1"
    )).toBe("user-1/stores/logo.webp");
  });

  it("returns only this user's store-media object path", () => {
    expect(getStoreImageStoragePath(
      "https://example.supabase.co/storage/v1/object/public/store-media/user-1/stores/logo.webp",
      "user-1"
    )).toBe("user-1/stores/logo.webp");
    expect(getStoreImageStoragePath(
      "https://example.supabase.co/storage/v1/object/public/store-media/user-2/stores/logo.webp",
      "user-1"
    )).toBeNull();
    expect(getStoreImageStoragePath(
      "https://example.supabase.co/storage/v1/object/public/product-media/user-1/products/logo.webp",
      "user-1"
    )).toBeNull();
    expect(getStoreImageStoragePath(
      "https://example.supabase.co/storage/v1/object/public/store-media/user-1/stores/../logo.webp",
      "user-1"
    )).toBeNull();
    expect(getStoreImageStoragePath(
      "https://example.supabase.co/storage/v1/object/sign/store-media/user-1/stores/%2e%2e/logo.webp?token=x",
      "user-1"
    )).toBeNull();
  });
});
