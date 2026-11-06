import { describe, expect, it } from "vitest";
import { categoryLabel, filterAndSortStoreOffers, inventoryLevel, primaryImage, stockLevel } from "./sooqy";
import type { ProductImage } from "./sooqy";

describe("stockLevel", () => {
  it("غير متوفر عند الإيقاف أو الصفر", () => {
    expect(stockLevel({ is_available: false, stock_quantity: 5 })).toBe("out");
    expect(stockLevel({ is_available: true, stock_quantity: 0 })).toBe("out");
  });
  it("منخفض عند 3 أو أقل", () => {
    expect(stockLevel({ is_available: true, stock_quantity: 3 })).toBe("low");
    expect(stockLevel({ is_available: true, stock_quantity: 1 })).toBe("low");
  });
  it("متوفر عند أكثر من 3", () => {
    expect(stockLevel({ is_available: true, stock_quantity: 4 })).toBe("in");
  });
});

describe("inventoryLevel", () => {
  it("measures physical stock independently from listing visibility", () => {
    expect(inventoryLevel({ stock_quantity: 5 })).toBe("in");
    expect(inventoryLevel({ stock_quantity: 3 })).toBe("low");
    expect(inventoryLevel({ stock_quantity: 0 })).toBe("out");
  });
});

describe("primaryImage", () => {
  const images: ProductImage[] = [
    {
      id: "1",
      offer_id: "o",
      image_url: "a.jpg",
      is_primary: false,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      id: "2",
      offer_id: "o",
      image_url: "b.jpg",
      is_primary: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];

  it("يفضّل الصورة الأساسية", () => {
    expect(primaryImage(images)).toBe("b.jpg");
  });
  it("يعيد null بدون صور", () => {
    expect(primaryImage(undefined)).toBeNull();
    expect(primaryImage([])).toBeNull();
  });
});

describe("categoryLabel", () => {
  it("يعيد التسمية العربية للفئة المعروفة", () => {
    expect(categoryLabel("shoes")).toBeTruthy();
  });
  it("يعيد المعرّف نفسه للفئة المجهولة", () => {
    expect(categoryLabel("unknown-cat")).toBe("unknown-cat");
  });
});

describe("filterAndSortStoreOffers", () => {
  const makeOffer = (id: string, name: string, price: number, createdAt: string) =>
    ({
      id,
      price,
      created_at: createdAt,
      product: { name },
    }) as unknown as import("./sooqy").OfferFull;

  const offers = [
    makeOffer("older", "قميص أزرق", 2500, "2026-01-01T00:00:00Z"),
    makeOffer("newer", "حذاء رياضي", 5000, "2026-02-01T00:00:00Z"),
    makeOffer("cheapest", "قميص أبيض", 1500, "2026-01-15T00:00:00Z"),
  ];

  it("filters by product name without changing the source array", () => {
    expect(filterAndSortStoreOffers(offers, "قميص", "newest").map((offer) => offer.id)).toEqual([
      "cheapest",
      "older",
    ]);
    expect(offers).toHaveLength(3);
  });

  it("sorts by ascending and descending price", () => {
    expect(filterAndSortStoreOffers(offers, "", "price-asc").map((offer) => offer.id)).toEqual([
      "cheapest",
      "older",
      "newer",
    ]);
    expect(filterAndSortStoreOffers(offers, "", "price-desc").map((offer) => offer.id)).toEqual([
      "newer",
      "older",
      "cheapest",
    ]);
  });
});
