export type FavoriteKind = "products" | "stores";

export type Favorites = {
  products: string[];
  stores: string[];
};

export const EMPTY_FAVORITES: Favorites = {
  products: [],
  stores: []
};

export function parseFavorites(value: unknown): Favorites {
  if (typeof value !== "object" || value === null) return EMPTY_FAVORITES;
  const record = value as Record<string, unknown>;
  const products = Array.isArray(record.products)
    ? record.products.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const stores = Array.isArray(record.stores)
    ? record.stores.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  return {
    products: [...new Set(products)],
    stores: [...new Set(stores)]
  };
}

export function toggleFavoriteId(favorites: Favorites, kind: FavoriteKind, id: string): Favorites {
  if (!id.trim()) return favorites;
  const current = favorites[kind];
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];
  return { ...favorites, [kind]: next };
}

export function hasFavorite(favorites: Favorites, kind: FavoriteKind, id: string): boolean {
  return favorites[kind].includes(id);
}
