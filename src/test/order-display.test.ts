import { describe, expect, it } from "vitest";
import { getMerchantOrderDisplayState, getMerchantOrderDisplayTotal, shouldShowParentOrderTimeline } from "@/lib/order-display";

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


describe("getMerchantOrderDisplayState", () => {
  it("keeps each merchant suborder state visible independently", () => {
    expect(getMerchantOrderDisplayState("pending")).toBe("awaiting_merchant");
    expect(getMerchantOrderDisplayState("quoted")).toBe("awaiting_customer");
    expect(getMerchantOrderDisplayState("cancelled")).toBe("cancelled");
  });

  it("uses the tracking timeline after the buyer accepts the quote", () => {
    expect(getMerchantOrderDisplayState("confirmed")).toBe("tracking");
    expect(getMerchantOrderDisplayState("shipped")).toBe("tracking");
    expect(getMerchantOrderDisplayState("delivered")).toBe("tracking");
  });

  it("does not guess when the backend returns an unknown status", () => {
    expect(getMerchantOrderDisplayState("unexpected")).toBe("unknown");
  });
});


describe("shouldShowParentOrderTimeline", () => {
  it("uses the parent timeline only when there are no merchant suborders", () => {
    expect(shouldShowParentOrderTimeline(0)).toBe(true);
    expect(shouldShowParentOrderTimeline(1)).toBe(false);
    expect(shouldShowParentOrderTimeline(3)).toBe(false);
  });
});
