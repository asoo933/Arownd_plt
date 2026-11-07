import { describe, expect, it } from "vitest";

import {
  filterMerchantProducts,
  getMerchantInventoryLevel,
  getMerchantInventorySummary,
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
    is_available: true,
    is_merchant_hidden: false,
    created_at: "2026-11-07T10:00:00.000Z",
    product: { id: "product-1", name: "قميص قطني", brand: "Arownd Basics" },
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
      product: { id: "product-2", name: "حذاء رياضي", brand: "North" }
    }),
    offer({
      id: "offer-3",
      product_id: "product-3",
      stock_quantity: 0,
      product: { id: "product-3", name: "حقيبة", brand: null }
    })
  ];

  it("filters products by inventory state", () => {
    expect(filterMerchantProducts(offers, "", "low").map((item) => item.id)).toEqual(["offer-2"]);
    expect(filterMerchantProducts(offers, "", "out").map((item) => item.id)).toEqual(["offer-3"]);
    expect(filterMerchantProducts(offers, "", "all")).toHaveLength(3);
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
