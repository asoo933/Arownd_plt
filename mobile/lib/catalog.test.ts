import { describe, expect, it } from "vitest";

import { formatDZD, getPrimaryImage, type HomeProduct } from "@/lib/catalog";

const product: HomeProduct = {
  id: "offer-1",
  price: 1250,
  stock_quantity: 4,
  is_available: true,
  product: { id: "product-1", name: "Test", category: null, brand: null },
  store: { id: "store-1", name: "Store" },
  images: [
    { image_url: "https://cdn.example.com/secondary.jpg", is_primary: false },
    { image_url: "https://cdn.example.com/primary.jpg", is_primary: true }
  ]
};

describe("catalog presentation helpers", () => {
  it("uses the primary product image", () => {
    expect(getPrimaryImage(product)).toBe("https://cdn.example.com/primary.jpg");
  });

  it("falls back to the first image when no primary image exists", () => {
    expect(getPrimaryImage({ ...product, images: [product.images[0]!] }))
      .toBe("https://cdn.example.com/secondary.jpg");
  });

  it("returns null when no product image exists", () => {
    expect(getPrimaryImage({ ...product, images: [] })).toBeNull();
  });

  it("formats prices with the Algerian dinar currency", () => {
    expect(formatDZD(1250)).toContain("دج");
  });
});
