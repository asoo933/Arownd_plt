import { describe, expect, it } from "vitest";

import { addCartItem, cartLineKey, EMPTY_CART, evaluateCart, readCartOptions, removeCartItem, sanitizeCart, setCartItemQuantity, type CartItem } from "@/lib/cart-state";

const base: CartItem = {
  offerId: "offer-1",
  productId: "product-1",
  name: "Product",
  quantity: 1,
  options: { size: "M", color: "Black" },
  price: 1200
};

describe("cart state", () => {
  it("keeps different variants as separate lines", () => {
    const other = { ...base, options: { color: "Black", size: "L" } };
    expect(cartLineKey(base)).not.toBe(cartLineKey(other));
    expect(addCartItem([base], other)).toHaveLength(2);
  });

  it("uses option order-independent identity for the same variant", () => {
    const reordered = { ...base, options: { color: "Black", size: "M" } };
    expect(cartLineKey(base)).toBe(cartLineKey(reordered));
    expect(addCartItem([base], reordered)).toHaveLength(1);
  });

  it("normalizes legacy localized option labels to stable keys", () => {
    const legacyArabic = { ...base, options: { "اللون": "أسود", "المقاس": "M" } };
    const legacyEnglish = { ...base, options: { Color: "Black", Size: "M" } };
    expect(cartLineKey(legacyArabic)).toBe(cartLineKey({ ...base, options: { color: "أسود", size: "M" } }));
    expect(cartLineKey(legacyEnglish)).toBe(cartLineKey(base));
    expect(sanitizeCart([legacyEnglish, { ...base, options: { color: "Black", size: "M" } }])).toHaveLength(1);
  });

  it("reads persisted order options defensively", () => {
    expect(readCartOptions({ "اللون": " أسود ", "المقاس": " M ", ignored: 12 })).toEqual({
      color: "أسود",
      size: "M"
    });
    expect(readCartOptions(null)).toEqual({});
    expect(readCartOptions(["M"])).toEqual({});
  });

  it("merges identical variants and caps quantity at ten", () => {
    const result = addCartItem([{ ...base, quantity: 8 }], { ...base, quantity: 5 });
    expect(result).toHaveLength(1);
    expect(result[0]?.quantity).toBe(10);
  });

  it("sanitizes malformed records and duplicate lines", () => {
    const result = sanitizeCart([base, base, null, { offerId: "", quantity: 1 }]);
    expect(result).toHaveLength(1);
    expect(result[0]?.quantity).toBe(2);
  });

  it("omits an invalid cached price instead of storing undefined", () => {
    const [item] = sanitizeCart([{ ...base, price: Number.NaN }]);
    expect(item).toBeDefined();
    expect(item).not.toHaveProperty("price");
  });

  it("updates and removes a specific variant only", () => {
    const second = { ...base, options: { size: "L", color: "Black" } };
    expect(setCartItemQuantity([base, second], cartLineKey(base), 4)[0]?.quantity).toBe(4);
    expect(removeCartItem([base, second], cartLineKey(base))).toEqual([second]);
  });

  it("checks stock across variants and uses the current server price", () => {
    const second = { ...base, options: { size: "L" }, quantity: 2 };
    const result = evaluateCart([base, second], [{
      id: "offer-1", price: 1500, stock_quantity: 2, is_available: true,
      product: { id: "product-1", name: "Product" },
      store: { id: "store-1", name: "Store" }, images: []
    }]);
    expect(result.blockingCount).toBe(2);
    expect(result.subtotal).toBe(4500);
    expect(result.lines[0]?.issues).toContain("overStock");
    expect(result.lines[0]?.issues).toContain("priceChanged");
    expect(result.lines[1]?.issues).toContain("priceChanged");
  });

  it("waits for offers before reporting missing products", () => {
    expect(evaluateCart([base], undefined).blockingCount).toBe(0);
    expect(evaluateCart([base], []).blockingCount).toBe(1);
    expect(evaluateCart([base], []).subtotal).toBe(0);
    expect(EMPTY_CART).toEqual([]);
  });
});
