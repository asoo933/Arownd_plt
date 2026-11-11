import { describe, expect, it } from "vitest";

import {
  EMPTY_FAVORITES,
  getFavoritesStorageKey,
  hasFavorite,
  parseFavorites,
  toggleFavoriteId
} from "@/lib/favorites-state";

describe("favorites state", () => {
  it("normalizes malformed values and removes duplicate identifiers", () => {
    expect(parseFavorites({ products: ["p1", "p1", 4], stores: ["s1"] })).toEqual({
      products: ["p1"],
      stores: ["s1"]
    });
    expect(parseFavorites(null)).toEqual(EMPTY_FAVORITES);
  });

  it("adds and removes product favorites without changing stores", () => {
    const added = toggleFavoriteId(EMPTY_FAVORITES, "products", "p1");
    expect(hasFavorite(added, "products", "p1")).toBe(true);
    expect(added.stores).toEqual([]);
    expect(toggleFavoriteId(added, "products", "p1").products).toEqual([]);
  });

  it("keeps product and store favorites independent", () => {
    const result = toggleFavoriteId(
      toggleFavoriteId(EMPTY_FAVORITES, "products", "p1"),
      "stores",
      "s1"
    );
    expect(result).toEqual({ products: ["p1"], stores: ["s1"] });
  });

  it("isolates favorites storage between accounts and anonymous sessions", () => {
    expect(getFavoritesStorageKey("user-a")).toBe("arownd:favorites:user-a");
    expect(getFavoritesStorageKey("user-b")).toBe("arownd:favorites:user-b");
    expect(getFavoritesStorageKey(null)).toBe("arownd:favorites:anonymous");
  });

  it("ignores empty identifiers", () => {
    expect(toggleFavoriteId(EMPTY_FAVORITES, "stores", " ")).toBe(EMPTY_FAVORITES);
  });
});
