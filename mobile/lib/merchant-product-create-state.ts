export type MerchantProductInput = {
  name: string;
  price: number;
  stock_quantity: number;
  category: string;
  brand: string | null;
  description: string | null;
  options: { sizes: string[]; colors: string[] };
};

export function parseMerchantOptionList(value: string): string[] | null {
  const values = value.split(/[،,]/).map((item) => item.trim()).filter(Boolean);
  const unique = [...new Set(values)];

  if (unique.length > 20 || unique.some((item) => item.length > 40)) return null;
  return unique;
}

export function validateMerchantProductInput(input: {
  name: string;
  price: string;
  stock: string;
  category: string;
  brand: string;
  description: string;
  sizes: string;
  colors: string;
}): MerchantProductInput | null {
  const name = input.name.trim();
  const brand = input.brand.trim();
  const description = input.description.trim();
  const price = Number(input.price);
  const stock = Number(input.stock);
  const sizes = parseMerchantOptionList(input.sizes);
  const colors = parseMerchantOptionList(input.colors);

  if (
    name.length < 2 ||
    name.length > 120 ||
    !input.price.trim() ||
    !Number.isSafeInteger(price) ||
    price <= 0 ||
    price > 2_147_483_647 ||
    !input.stock.trim() ||
    !Number.isInteger(stock) ||
    stock < 0 ||
    stock > 9999 ||
    !input.category.trim() ||
    brand.length > 80 ||
    description.length > 3000 ||
    sizes === null ||
    colors === null
  ) {
    return null;
  }

  return {
    name,
    price,
    stock_quantity: stock,
    category: input.category,
    brand: brand || null,
    description: description || null,
    options: { sizes, colors }
  };
}
