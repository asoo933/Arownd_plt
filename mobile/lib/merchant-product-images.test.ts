import { describe, expect, it } from "vitest";

import {
  getNextPrimaryProductImageId,
  getProductImageExtension,
  getProductImageStoragePath,
  PRODUCT_IMAGE_MAX_BYTES,
  validateProductImageMetadata
} from "@/lib/merchant-product-images";

describe("merchant product image metadata", () => {
  it("maps supported MIME types to safe file extensions", () => {
    expect(getProductImageExtension({ mimeType: "image/jpeg", fileName: "photo.jpeg", fileSize: 100 })).toBe("jpg");
    expect(getProductImageExtension({ mimeType: "image/webp", fileName: "photo.webp", fileSize: 100 })).toBe("webp");
  });

  it("uses a supported filename extension when MIME metadata is absent", () => {
    expect(getProductImageExtension({ mimeType: null, fileName: "photo.HEIC", fileSize: null })).toBe("heic");
  });

  it("rejects unsupported file types", () => {
    expect(validateProductImageMetadata({ mimeType: "application/pdf", fileName: "file.pdf", fileSize: 100 })).toBe(false);
    expect(validateProductImageMetadata({ mimeType: null, fileName: "file.exe", fileSize: 100 })).toBe(false);
  });

  it("rejects empty, invalid, or oversized files", () => {
    expect(validateProductImageMetadata({ mimeType: "image/png", fileName: "x.png", fileSize: 0 })).toBe(false);
    expect(validateProductImageMetadata({ mimeType: "image/png", fileName: "x.png", fileSize: Number.NaN })).toBe(false);
    expect(validateProductImageMetadata({ mimeType: "image/png", fileName: "x.png", fileSize: PRODUCT_IMAGE_MAX_BYTES + 1 })).toBe(false);
  });

  it("accepts files up to the application upload limit", () => {
    expect(validateProductImageMetadata({ mimeType: "image/png", fileName: "x.png", fileSize: PRODUCT_IMAGE_MAX_BYTES })).toBe(true);
  });
});


describe("product image storage helpers", () => {
  const userId = "00000000-0000-4000-8000-000000000001";

  it("extracts only a storage path inside the signed-in user's product folder", () => {
    expect(getProductImageStoragePath(
      `https://cdn.example.test/storage/v1/object/public/product-media/${userId}/products/photo.webp`,
      userId
    )).toBe(`${userId}/products/photo.webp`);
  });

  it("extracts signed URLs and ignores their token query string", () => {\n    expect(getProductImageStoragePath(\n      "https://cdn.example.test/storage/v1/object/sign/product-media/" + userId + "/products/photo.webp?token=abc.def.ghi",\n      userId\n    )).toBe(userId + "/products/photo.webp");\n  });\n\n  it("rejects other buckets, other users, malformed URLs, and traversal paths", () => {
    expect(getProductImageStoragePath(
      `https://cdn.example.test/storage/v1/object/public/avatars/${userId}/products/photo.webp`,
      userId
    )).toBeNull();
    expect(getProductImageStoragePath(
      "https://cdn.example.test/storage/v1/object/public/product-media/another-user/products/photo.webp",
      userId
    )).toBeNull();
    expect(getProductImageStoragePath(
      `https://cdn.example.test/storage/v1/object/public/product-media/${userId}/products/../photo.webp`,
      userId
    )).toBeNull();
    expect(getProductImageStoragePath("not-a-url", userId)).toBeNull();\n    expect(getProductImageStoragePath(\n      "https://cdn.example.test/storage/v1/object/sign/product-media/" + userId + "/products/%252e%252e/photo.webp?token=x",\n      userId\n    )).toBeNull();
  });

  it("selects a replacement only when the removed image was primary", () => {
    const images = [
      { id: "image-1", image_url: "https://example.test/1", is_primary: true },
      { id: "image-2", image_url: "https://example.test/2", is_primary: false }
    ];

    expect(getNextPrimaryProductImageId(images, "image-1")).toBe("image-2");
    expect(getNextPrimaryProductImageId(images, "image-2")).toBeNull();
    expect(getNextPrimaryProductImageId(images, "missing")).toBeNull();
    expect(getNextPrimaryProductImageId([
      ...images,
      { id: "image-3", image_url: "https://example.test/3", is_primary: true }
    ], "image-1")).toBeNull();
  });
});
