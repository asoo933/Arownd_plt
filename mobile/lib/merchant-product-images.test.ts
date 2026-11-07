import { describe, expect, it } from "vitest";

import {
  getProductImageExtension,
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
