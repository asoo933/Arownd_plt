import { describe, expect, it } from "vitest";
import { sanitizeBagItems } from "@/lib/bag";

describe("sanitizeBagItems", () => {
  it("يُسقط العناصر التالفة ويقيّد الكمية ويدمج المكرر", () => {
    const out = sanitizeBagItems([
      { offerId: "a", quantity: 3, options: { size: "M" }, price: 100 },
      { offerId: "a", quantity: 9, options: { size: "M" } },
      { offerId: "", quantity: 1 },
      { quantity: 2 },
      null,
      "x",
      { offerId: "b", quantity: -5, price: Number.NaN },
      { offerId: "c", quantity: "abc" },
    ]);
    expect(out.map((i) => i.offerId)).toEqual(["a", "b", "c"]);
    expect(out.find((i) => i.offerId === "a")?.quantity).toBe(10);
    expect(out.find((i) => i.offerId === "b")?.quantity).toBe(1);
    expect(out.find((i) => i.offerId === "b")?.price).toBeUndefined();
    expect(out.find((i) => i.offerId === "c")?.quantity).toBe(1);
  });

  it("يعيد مصفوفة فارغة لغير المصفوفات", () => {
    expect(sanitizeBagItems({})).toEqual([]);
    expect(sanitizeBagItems(null)).toEqual([]);
  });
});
