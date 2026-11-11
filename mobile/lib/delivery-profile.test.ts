import { describe, expect, it } from "vitest";

import { DeliveryProfileSchema } from "@/lib/delivery-profile-state";
import { normalizePhoneForCallingCode } from "@/lib/country-regions";

describe("delivery profile validation", () => {
  it("accepts canonical international numbers and generic regions", () => {
    expect(DeliveryProfileSchema.safeParse({
      full_name: "أحمد",
      phone: "+213550123456",
      region_id: 9,
      secondary_region_id: 1,
      commune: "البليدة"
    }).success).toBe(true);
  });

  it("rejects invalid phone, location, and short names", () => {
    const base = { full_name: "أحمد", phone: "12345", region_id: 0, secondary_region_id: null, commune: "ب" };
    expect(DeliveryProfileSchema.safeParse(base).success).toBe(false);
  });

  it("normalizes phone formatting before validation", () => {
    expect(normalizePhoneForCallingCode("+213 550-123-456", "+213")).toBe("+213550123456");
  });

  it("accepts normalized international Algerian mobile numbers", () => {
    expect(DeliveryProfileSchema.safeParse({
      full_name: "أحمد",
      phone: normalizePhoneForCallingCode("+213 550-123-456", "+213"),
      region_id: 9,
      secondary_region_id: 1,
      commune: "البليدة"
    }).success).toBe(true);
  });
});
