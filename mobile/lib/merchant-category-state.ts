import type { MerchantCategory } from "@/lib/merchant";

export type MerchantCategoryGroup = {
  parent: MerchantCategory;
  children: MerchantCategory[];
};

export function groupMerchantCategories(
  categories: MerchantCategory[]
): MerchantCategoryGroup[] {
  const categoryIds = new Set(categories.map((category) => category.id));
  const roots = categories.filter(
    (category) => category.parentId === null || !categoryIds.has(category.parentId)
  );

  return roots.map((parent) => ({
    parent,
    children: categories.filter((category) => category.parentId === parent.id)
  }));
}

export function getSelectableMerchantCategories(
  groups: MerchantCategoryGroup[]
): MerchantCategory[] {
  return groups.flatMap((group) =>
    group.children.length > 0 ? group.children : [group.parent]
  );
}
