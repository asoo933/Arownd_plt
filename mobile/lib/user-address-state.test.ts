import { describe, expect, it } from "vitest";

import { isValidAddressPhone, normalizeAddressPhone, UserAddressSchema } from "@/lib/user-address-state";

const validAddress = {
  label: "home" as const,
  recipient_name: "أحمد علي",
  phone: "+213550123456",
  region_id: 9,
  secondary_region_id: 1,
  commune: "البليدة",
  address_line: "حي 1200 مسكن، العمارة 5",
  additional_info: ""
};

describe("user address validation", () => {
  it("accepts a valid Algerian delivery address", () => {
    expect(UserAddressSchema.safeParse(validAddress).success).toBe(true);
  });

  it("rejects invalid phone numbers and missing location details", () => {
    expect(UserAddressSchema.safeParse({
      ...validAddress,
      phone: "123",
      commune: "",
      region_id: 0
    }).success).toBe(false);
  });

  it("validates formatted Algerian phone numbers after normalization", () => {
    expect(isValidAddressPhone("+213 550 123 456")).toBe(true);
    expect(isValidAddressPhone("+213 550-123-456")).toBe(true);
    expect(isValidAddressPhone("123")).toBe(false);
  });

  it("normalizes common phone formatting", () => {
    expect(normalizeAddressPhone("+213 550-123-456")).toBe("+213550123456");
  });

  it("rejects unsupported address labels", () => {
    expect(UserAddressSchema.safeParse({ ...validAddress, label: "school" }).success).toBe(false);
  });
});
