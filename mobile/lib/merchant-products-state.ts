export type MerchantInventoryFilter = "all" | "low" | "out";
export type MerchantInventoryLevel = "in" | "low" | "out";

export type MerchantProductOffer = {
  id: string;
  store_id: string;
  product_id: string;
  price: number;
  stock_quantity: number;
  is_available: boolean;
  is_merchant_hidden: boolean;
  created_at: string;
  product: {
    id: string;
    name: string;
    brand: string | null;
  };
  images: Array<{
    id: string;
    image_url: string;
    is_primary: boolean;
  }>;
};

export type MerchantOfferValues = {
  price: number;
  stock_quantity: number;
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
    const matchesFilter = filter === "all" || level === filter;
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
