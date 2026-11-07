import { describe, expect, it } from "vitest";

import { resolveMerchantAccessStatus } from "@/lib/merchant-state";

describe("resolveMerchantAccessStatus", () => {
  it("allows merchant mode only when account type, role, and owned store agree", () => {
    expect(resolveMerchantAccessStatus({
      accountType: "merchant",
      roles: ["merchant"],
      hasOwnedStore: true
    })).toBe("merchant_ready");
  });

  it("keeps a personal account in personal mode without merchant capabilities", () => {
    expect(resolveMerchantAccessStatus({
      accountType: "personal",
      roles: [],
      hasOwnedStore: false
    })).toBe("personal");
  });

  it("identifies an incomplete merchant setup without granting merchant access", () => {
    expect(resolveMerchantAccessStatus({
      accountType: "merchant",
      roles: ["merchant"],
      hasOwnedStore: false
    })).toBe("merchant_setup_required");
  });

  it("rejects mismatched account type, role, and store ownership signals", () => {
    expect(resolveMerchantAccessStatus({
      accountType: "personal",
      roles: ["merchant"],
      hasOwnedStore: true
    })).toBe("inconsistent");
  });

  it("does not grant merchant access to delivery companies", () => {
    expect(resolveMerchantAccessStatus({
      accountType: "delivery_company",
      roles: ["delivery_company"],
      hasOwnedStore: false
    })).toBe("delivery_company");
  });

  it("flags conflicting merchant and delivery capabilities", () => {
    expect(resolveMerchantAccessStatus({
      accountType: "delivery_company",
      roles: ["delivery_company", "merchant"],
      hasOwnedStore: true
    })).toBe("inconsistent");
  });
});
