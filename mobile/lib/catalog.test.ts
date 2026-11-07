import { describe, expect, it } from "vitest";

import {
  chooseBestProductOffer,
  formatDZD,
  getPrimaryImage,
  getCategoryFilterIds,
  type HomeProduct,
  type ProductOffer
} from "@/lib/catalog";

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

function makeOffer(id: string, price: number, isAvailable: boolean, stock: number): ProductOffer {
  return {
    id,
    product_id: "product-1",
    price,
    stock_quantity: stock,
    is_available: isAvailable,
    product: { id: "product-1", name: "Test", description: null },
    store: { id: "store-1", name: "Store" },
    images: []
  };
}

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
    expect(formatDZD(1250)).not.toBe("1250");
  });
});

describe("chooseBestProductOffer", () => {
  it("prefers an available offer over a cheaper unavailable offer", () => {
    const result = chooseBestProductOffer([
      makeOffer("unavailable", 500, false, 5),
      makeOffer("available", 900, true, 2)
    ]);
    expect(result?.id).toBe("available");
  });

  it("chooses the cheapest offer when none is available", () => {
    const result = chooseBestProductOffer([
      makeOffer("expensive", 1200, false, 0),
      makeOffer("cheap", 800, false, 0)
    ]);
    expect(result?.id).toBe("cheap");
  });

  it("returns null when there are no offers", () => {
    expect(chooseBestProductOffer([])).toBeNull();
  });
});

describe("getCategoryFilterIds", () => {
  it("includes child category identifiers for a main category", () => {
    expect(getCategoryFilterIds("fashion")).toContain("shoes");
    expect(getCategoryFilterIds("fashion")).toContain("bags");
  });

  it("keeps unknown category identifiers intact", () => {
    expect(getCategoryFilterIds("custom-category")).toEqual(["custom-category"]);
  });
});
