import { describe, expect, it } from "vitest";

import { DeliveryProfileSchema, normalizeAlgerianPhone } from "@/lib/delivery-profile-state";

describe("delivery profile validation", () => {
  it("accepts valid Algerian mobile numbers", () => {
    expect(DeliveryProfileSchema.safeParse({
      full_name: "أحمد",
      phone: "0550123456",
      wilaya_id: 9,
      commune: "البليدة"
    }).success).toBe(true);
  });

  it("rejects invalid phone, location, and short names", () => {
    const base = { full_name: "أحمد", phone: "12345", wilaya_id: 0, commune: "ب" };
    expect(DeliveryProfileSchema.safeParse(base).success).toBe(false);
  });

  it("normalizes phone formatting before validation", () => {
    expect(normalizeAlgerianPhone("+213 550-123-456")).toBe("+213550123456");
  });
});
