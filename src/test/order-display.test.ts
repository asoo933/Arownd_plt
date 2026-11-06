import { describe, expect, it } from "vitest";
import { getMerchantOrderDisplayTotal } from "@/lib/order-display";

describe("getMerchantOrderDisplayTotal", () => {
  it("does not show a retained quote as payable after cancellation", () => {
    expect(getMerchantOrderDisplayTotal("cancelled", 2500, 400)).toBe(0);
  });

  it("includes the store shipping quote for active suborders", () => {
    expect(getMerchantOrderDisplayTotal("quoted", 2500, 400)).toBe(2900);
    expect(getMerchantOrderDisplayTotal("confirmed", 2500, 400)).toBe(2900);
  });

  it("keeps the product subtotal while a store quote is pending", () => {
    expect(getMerchantOrderDisplayTotal("pending", 2500, 0)).toBe(2500);
  });
});
