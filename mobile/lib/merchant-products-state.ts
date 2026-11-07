export type MerchantInventoryFilter = "all" | "low" | "out" | "hidden";
export type MerchantInventoryLevel = "in" | "low" | "out";

export type MerchantProductOffer = {
  id: string;
  store_id: string;
  product_id: string;
  price: number;
  stock_quantity: number;
  options: MerchantProductOptions;
  is_available: boolean;
  is_merchant_hidden: boolean;
  created_at: string;
  product: {
    id: string;
    name: string;
    description: string | null;
    brand: string | null;
    category: string;
  };
  images: Array<{
    id: string;
    image_url: string;
    is_primary: boolean;
  }>;
};

export type MerchantProductOptions = {
  sizes: string[];
  colors: string[];
};

export type MerchantOfferValues = {
  price: number;
  stock_quantity: number;
  options?: MerchantProductOptions;
};

export function getMerchantInventoryLevel(stock: number): MerchantInventoryLevel {
  if (stock <= 0) return "out";
  if (stock <= 3) return "low";
  return "in";
}

export function filterMerchantProducts(
  offers: MerchantProductOffer[],
  query: string,
  filter: MerchantInventoryFilter
): MerchantProductOffer[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return offers.filter((offer) => {
    const level = getMerchantInventoryLevel(offer.stock_quantity);
    const matchesFilter = filter === "all"
      || (filter === "hidden"
        ? offer.is_merchant_hidden
        : !offer.is_merchant_hidden && level === filter);
    const searchableText = [offer.product.name, offer.product.brand ?? ""]
      .join(" ")
      .toLocaleLowerCase();
    const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);

    return matchesFilter && matchesQuery;
  });
}

export function getMerchantInventorySummary(offers: MerchantProductOffer[]) {
  return offers.reduce(
    (summary, offer) => {
      summary.total += 1;
      const level = getMerchantInventoryLevel(offer.stock_quantity);
      if (level === "low") summary.low += 1;
      if (level === "out") summary.out += 1;
      return summary;
    },
    { total: 0, low: 0, out: 0 }
  );
}

export function validateMerchantOfferOptions(
  sizesInput: string,
  colorsInput: string
): MerchantProductOptions | null {
  const parseList = (value: string): string[] | null => {
    const entries = value.split(/[،,]/).map((entry) => entry.trim()).filter(Boolean);
    const unique = new Map<string, string>();
    for (const entry of entries) {
      const identity = entry.normalize("NFKC").toLocaleLowerCase();
      if (!unique.has(identity)) unique.set(identity, entry);
    }
    const normalized = [...unique.values()];
    if (normalized.length > 20 || normalized.some((entry) => entry.length > 40)) return null;
    return normalized;
  };

  const sizes = parseList(sizesInput);
  const colors = parseList(colorsInput);
  if (sizes === null || colors === null) return null;
  return { sizes, colors };
}

export function validatePromotionSalePrice(salePriceInput: string, regularPrice: number): number | null {
  if (!Number.isSafeInteger(regularPrice) || regularPrice <= 0 || !salePriceInput.trim()) return null;
  const salePrice = Number(salePriceInput);
  return Number.isSafeInteger(salePrice) && salePrice > 0 && salePrice < regularPrice ? salePrice : null;
}

export function getPromotionDiscountPercent(regularPrice: number, salePrice: number): number | null {
  if (!Number.isSafeInteger(regularPrice) || !Number.isSafeInteger(salePrice) || regularPrice <= 0 || salePrice <= 0 || salePrice >= regularPrice) return null;
  return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
}

export function validateMerchantOfferValues(
  priceInput: string,
  stockInput: string
): MerchantOfferValues | null {
  if (!priceInput.trim() || !stockInput.trim()) return null;

  const price = Number(priceInput);
  const stock = Number(stockInput);

  if (
    !Number.isSafeInteger(price) ||
    price <= 0 ||
    price > 2_147_483_647 ||
    !Number.isInteger(stock) ||
    stock < 0 ||
    stock > 9999
  ) {
    return null;
  }

  return { price, stock_quantity: stock };
}

export type MerchantProductDetailsValues = {
  name: string;
  description: string;
  brand: string;
  category: string;
};

export function validateMerchantProductDetails(
  nameInput: string,
  descriptionInput: string,
  brandInput: string,
  categoryInput: string
): MerchantProductDetailsValues | null {
  const name = nameInput.trim();
  const description = descriptionInput.trim();
  const brand = brandInput.trim();
  const category = categoryInput.trim();

  if (
    !name ||
    name.length > 120 ||
    description.length > 3000 ||
    brand.length > 80 ||
    !category
  ) {
    return null;
  }

  return { name, description, brand, category };
}
