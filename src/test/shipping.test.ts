import { describe, expect, it } from "vitest";
import {
  getShippingFee,
  isMerchantManagedDelivery,
  requiresDeliveryAddress,
} from "@/lib/shipping";

describe("direct trade delivery options", () => {
  it("requires an address for merchant home delivery", () => {
    expect(requiresDeliveryAddress("home")).toBe(true);
  });

  it("does not require a home address for store pickup", () => {
    expect(requiresDeliveryAddress("desk")).toBe(false);
  });

  it("keeps store pickup free of delivery fees", () => {
    expect(getShippingFee(16, "desk")).toBe(0);
  });

  it("lets the merchant manage home delivery when no carrier is assigned", () => {
    expect(isMerchantManagedDelivery("home", false)).toBe(true);
  });

  it("keeps carrier-assigned home delivery on the carrier workflow", () => {
    expect(isMerchantManagedDelivery("home", true)).toBe(false);
  });

  it("keeps store pickup merchant-managed", () => {
    expect(isMerchantManagedDelivery("desk", false)).toBe(true);
  });

  it("keeps store pickup merchant-managed regardless of carrier state", () => {
    expect(isMerchantManagedDelivery("desk", true)).toBe(true);
  });

  it("rejects unsupported delivery types for merchant fulfillment", () => {
    expect(isMerchantManagedDelivery("unknown", false)).toBe(false);
  });
});
