import { describe, expect, it } from "vitest";

import { MerchantProductOfferSchema } from "@/lib/merchant-products-schema";
import {
  filterMerchantProducts,
  getMerchantInventoryLevel,
  getMerchantInventorySummary,
  validateMerchantOfferOptions,
  validateMerchantOfferValues,
  type MerchantProductOffer
} from "@/lib/merchant-products-state";

function offer(overrides: Partial<MerchantProductOffer> = {}): MerchantProductOffer {
  return {
    id: "offer-1",
    store_id: "store-1",
    product_id: "product-1",
    price: 2500,
    stock_quantity: 8,
    options: { sizes: ["M"], colors: ["Black"] },
    is_available: true,
    is_merchant_hidden: false,
    created_at: "2026-11-07T10:00:00.000Z",
    product: { id: "product-1", name: "قميص قطني", description: "قميص قطني مريح", brand: "Arownd Basics", category: "clothing" },
    images: [],
    ...overrides
  };
}

describe("getMerchantInventoryLevel", () => {
  it("distinguishes out-of-stock, low, and available inventory", () => {
    expect(getMerchantInventoryLevel(0)).toBe("out");
    expect(getMerchantInventoryLevel(1)).toBe("low");
    expect(getMerchantInventoryLevel(3)).toBe("low");
    expect(getMerchantInventoryLevel(4)).toBe("in");
  });
});

describe("filterMerchantProducts", () => {
  const offers = [
    offer(),
    offer({
      id: "offer-2",
      product_id: "product-2",
      stock_quantity: 2,
      product: { id: "product-2", name: "حذاء رياضي", description: null, brand: "North", category: "shoes" }
    }),
    offer({
      id: "offer-3",
      product_id: "product-3",
      stock_quantity: 0,
      product: { id: "product-3", name: "حقيبة", description: null, brand: null, category: "bags" }
    }),
    offer({
      id: "offer-hidden",
      is_merchant_hidden: true,
      stock_quantity: 2,
      product: { id: "product-hidden", name: "منتج مخفي", description: null, brand: null, category: "other" }
    })
  ];

  it("filters products by inventory state", () => {
    expect(filterMerchantProducts(offers, "", "low").map((item) => item.id)).toEqual(["offer-2"]);
    expect(filterMerchantProducts(offers, "", "out").map((item) => item.id)).toEqual(["offer-3"]);
    expect(filterMerchantProducts(offers, "", "all")).toHaveLength(4);
  });

  it("shows hidden offers independently from their inventory level", () => {
    expect(filterMerchantProducts(offers, "", "hidden").map((item) => item.id)).toEqual(["offer-hidden"]);
    expect(filterMerchantProducts(offers, "منتج مخفي", "hidden").map((item) => item.id)).toEqual(["offer-hidden"]);
    expect(filterMerchantProducts(offers, "", "low").map((item) => item.id)).toEqual(["offer-2"]);
    expect(filterMerchantProducts(offers, "", "out").map((item) => item.id)).toEqual(["offer-3"]);
  });

  it("searches product names and brands without changing the source list", () => {
    expect(filterMerchantProducts(offers, "NORTH", "all").map((item) => item.id)).toEqual(["offer-2"]);
    expect(filterMerchantProducts(offers, "قميص", "all").map((item) => item.id)).toEqual(["offer-1"]);
    expect(offers).toHaveLength(3);
  });
});

describe("getMerchantInventorySummary", () => {
  it("counts every offer and its inventory warning state", () => {
    const summary = getMerchantInventorySummary([
      offer(),
      offer({ id: "offer-2", stock_quantity: 1 }),
      offer({ id: "offer-3", stock_quantity: 0 })
    ]);

    expect(summary).toEqual({ total: 3, low: 1, out: 1 });
  });
});

describe("validateMerchantOfferValues", () => {
  it("accepts a positive integer price and a stock value from zero to 9999", () => {
    expect(validateMerchantOfferValues("1200", "0")).toEqual({
      price: 1200,
      stock_quantity: 0
    });
    expect(validateMerchantOfferValues("1200", "9999")).toEqual({
      price: 1200,
      stock_quantity: 9999
    });
  });

  it("rejects empty, fractional, negative, and out-of-range values", () => {
    expect(validateMerchantOfferValues("", "2")).toBeNull();
    expect(validateMerchantOfferValues("1200.5", "2")).toBeNull();
    expect(validateMerchantOfferValues("0", "2")).toBeNull();
    expect(validateMerchantOfferValues("1200", "-1")).toBeNull();
    expect(validateMerchantOfferValues("1200", "10000")).toBeNull();
  });
});

describe("MerchantProductOfferSchema", () => {
  it("normalizes an offer and defaults missing image relations to an empty list", () => {
    const parsed = MerchantProductOfferSchema.parse({
      id: "00000000-0000-4000-8000-000000000001",
      store_id: "00000000-0000-4000-8000-000000000002",
      product_id: "00000000-0000-4000-8000-000000000003",
      price: "1500",
      stock_quantity: "4",
      is_available: true,
      is_merchant_hidden: false,
      created_at: "2026-11-07T10:00:00.000Z",
      product: {
        id: "00000000-0000-4000-8000-000000000003",
        name: "قميص",
        description: "وصف تجريبي",
        brand: null,
        category: "clothing"
      }
    });

    expect(parsed.price).toBe(1500);
    expect(parsed.stock_quantity).toBe(4);
    expect(parsed.options).toEqual({ sizes: [], colors: [] });
    expect(parsed.images).toEqual([]);
    expect(parsed.product.description).toBe("وصف تجريبي");
    expect(parsed.product.category).toBe("clothing");
  });
});


describe("validateMerchantOfferOptions", () => {
  it("normalizes comma-separated sizes and colors and removes duplicates", () => {
    expect(validateMerchantOfferOptions("S, M، L, M", "أحمر, أزرق، أحمر")).toEqual({
      sizes: ["S", "M", "L"],
      colors: ["أحمر", "أزرق"]
    });
  });

  it("accepts empty option lists", () => {
    expect(validateMerchantOfferOptions("", "")).toEqual({ sizes: [], colors: [] });
  });

  it("rejects more than twenty options or values longer than forty characters", () => {
    expect(validateMerchantOfferOptions(
      Array.from({ length: 21 }, (_, index) => `size-${index}`).join(","),
      ""
    )).toBeNull();
    expect(validateMerchantOfferOptions("x".repeat(41), "")).toBeNull();
  });
});
