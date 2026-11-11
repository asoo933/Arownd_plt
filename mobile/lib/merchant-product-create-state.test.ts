import { describe, expect, it } from "vitest";

import {
  parseMerchantOptionList,
  validateMerchantProductInput
} from "@/lib/merchant-product-create-state";

const validInput = {
  name: "قميص قطني",
  price: "2500",
  stock: "12",
  category: "clothes",
  brand: "Arownd",
  description: "وصف المنتج",
  sizes: "S, M، L",
  colors: "أسود, أبيض"
};

describe("parseMerchantOptionList", () => {
  it("splits Arabic and English commas, trims values, and removes duplicates", () => {
    expect(parseMerchantOptionList(" S, M، L, S ")).toEqual(["S", "M", "L"]);
  });

  it("rejects more than twenty values or values longer than forty characters", () => {
    expect(parseMerchantOptionList(Array.from({ length: 21 }, (_, index) => String(index)).join(","))).toBeNull();
    expect(parseMerchantOptionList("x".repeat(41))).toBeNull();
  });
});

describe("validateMerchantProductInput", () => {
  it("normalizes a valid product and its variant labels", () => {
    expect(validateMerchantProductInput(validInput)).toEqual({
      name: "قميص قطني",
      price: 2500,
      stock_quantity: 12,
      category: "clothes",
      brand: "Arownd",
      description: "وصف المنتج",
      options: {
        sizes: ["S", "M", "L"],
        colors: ["أسود", "أبيض"]
      }
    });
  });

  it("allows zero stock but rejects invalid price, stock, and category", () => {
    expect(validateMerchantProductInput({ ...validInput, stock: "0" })?.stock_quantity).toBe(0);
    expect(validateMerchantProductInput({ ...validInput, price: "0" })).toBeNull();
    expect(validateMerchantProductInput({ ...validInput, price: "1.5" })).toBeNull();
    expect(validateMerchantProductInput({ ...validInput, stock: "10000" })).toBeNull();
    expect(validateMerchantProductInput({ ...validInput, category: "" })).toBeNull();
  });

  it("rejects empty or oversized names and oversized optional fields", () => {
    expect(validateMerchantProductInput({ ...validInput, name: " " })).toBeNull();
    expect(validateMerchantProductInput({ ...validInput, name: "x".repeat(121) })).toBeNull();
    expect(validateMerchantProductInput({ ...validInput, brand: "x".repeat(81) })).toBeNull();
    expect(validateMerchantProductInput({ ...validInput, description: "x".repeat(3001) })).toBeNull();
  });
});
