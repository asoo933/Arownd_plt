import { describe, expect, it } from "vitest";

import { canCancelLegacyOrder, canCancelMerchantOrder, getOrderStatusTone, getOrderTrackingSteps } from "@/lib/orders-state";

describe("customer order display", () => {
  it("maps order statuses to tracking steps", () => {
    expect(getOrderTrackingSteps("pending")).toBe(0);
    expect(getOrderTrackingSteps("confirmed")).toBe(1);
    expect(getOrderTrackingSteps("shipped")).toBe(2);
    expect(getOrderTrackingSteps("delivered")).toBe(3);
    expect(getOrderTrackingSteps("cancelled")).toBe(-1);
  });

  it("classifies terminal and waiting statuses", () => {
    expect(getOrderStatusTone("delivered")).toBe("success");
    expect(getOrderStatusTone("pending")).toBe("pending");
    expect(getOrderStatusTone("quoted")).toBe("pending");
    expect(getOrderStatusTone("cancelled")).toBe("danger");
    expect(getOrderStatusTone("rejected")).toBe("danger");
    expect(getOrderStatusTone("unknown")).toBe("muted");
  });
  it("allows cancelling only pending unquoted merchant orders", () => {
    expect(canCancelMerchantOrder("pending", null)).toBe(true);
    expect(canCancelMerchantOrder("pending", undefined)).toBe(true);
    expect(canCancelMerchantOrder("pending", "2026-11-01T10:00:00Z")).toBe(false);
    expect(canCancelMerchantOrder("quoted", null)).toBe(false);
    expect(canCancelMerchantOrder("confirmed", null)).toBe(false);
  });

  it("allows legacy parent cancellation only for pending orders without suborders", () => {
    expect(canCancelLegacyOrder("pending", false)).toBe(true);
    expect(canCancelLegacyOrder("pending", true)).toBe(false);
    expect(canCancelLegacyOrder("confirmed", false)).toBe(false);
    expect(canCancelLegacyOrder("cancelled", false)).toBe(false);
  });

});