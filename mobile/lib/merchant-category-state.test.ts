import { describe, expect, it } from "vitest";

import {
  getSelectableMerchantCategories,
  groupMerchantCategories
} from "@/lib/merchant-category-state";
import type { MerchantCategory } from "@/lib/merchant";

const categories: MerchantCategory[] = [
  { id: "fashion", parentId: null, label: "الأزياء", emoji: "👗" },
  { id: "clothes", parentId: "fashion", label: "الملابس", emoji: "👕" },
  { id: "shoes", parentId: "fashion", label: "الأحذية", emoji: "👟" },
  { id: "books", parentId: null, label: "الكتب", emoji: "📚" },
  { id: "orphan", parentId: "missing-parent", label: "تصنيف مستقل", emoji: "🛍️" }
];

describe("groupMerchantCategories", () => {
  it("groups child categories under their parent and preserves root order", () => {
    expect(groupMerchantCategories(categories)).toEqual([
      {
        parent: categories[0],
        children: [categories[1], categories[2]]
      },
      {
        parent: categories[3],
        children: []
      },
      {
        parent: categories[4],
        children: []
      }
    ]);
  });

  it("allows choosing leaf categories and roots without children only", () => {
    const groups = groupMerchantCategories(categories);

    expect(getSelectableMerchantCategories(groups).map((category) => category.id)).toEqual([
      "clothes",
      "shoes",
      "books",
      "orphan"
    ]);
  });

  it("returns an empty list for an empty category response", () => {
    expect(groupMerchantCategories([])).toEqual([]);
    expect(getSelectableMerchantCategories([])).toEqual([]);
  });
});
