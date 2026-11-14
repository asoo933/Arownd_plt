import { describe, expect, it } from "vitest";

import { getRegionDisplayName, getRegionLevelDisplayName, normalizePhoneForCallingCode } from "@/lib/country-regions";

describe("country region and phone helpers", () => {
  it("uses the best available localized region name", () => {
    const region = { name_ar: "الجزائر", name_fr: "Alger", name_en: null };
    expect(getRegionDisplayName(region, "ar")).toBe("الجزائر");
    expect(getRegionDisplayName(region, "fr")).toBe("Alger");
    expect(getRegionDisplayName(region, "en")).toBe("Alger");
  });

  it("localizes administrative level labels for the selected app language", () => {
    const level = {
      country_code: "DZ",
      level: 1,
      region_types: ["wilaya"],
      label_ar: "الولاية",
      label_en: "Wilaya",
      is_required: true
    };
    expect(getRegionLevelDisplayName(level, "ar")).toBe("الولاية");
    expect(getRegionLevelDisplayName(level, "en")).toBe("Wilaya");
    expect(getRegionLevelDisplayName(level, "fr")).toBe("Wilaya");
  });

  it("normalizes national and international phone formats using the account calling code", () => {
    expect(normalizePhoneForCallingCode("0550 123 456", "+213")).toBe("+213550123456");
    expect(normalizePhoneForCallingCode("06 12 34 56 78", "+212")).toBe("+212612345678");
    expect(normalizePhoneForCallingCode("+966 50 123 4567", "+966")).toBe("+966501234567");
    expect(normalizePhoneForCallingCode("٠٥٥٠ ١٢٣ ٤٥٦", "+213")).toBe("+213550123456");
    expect(normalizePhoneForCallingCode("۰۵۵۰ ۱۲۳ ۴۵۶", "+213")).toBe("+213550123456");
    expect(normalizePhoneForCallingCode("00213 550 123 456", "+213")).toBe("+213550123456");
  });

  it("rejects a number from another country or an invalid E.164 length", () => {
    expect(() => normalizePhoneForCallingCode("+212612345678", "+213")).toThrow("invalid_phone");
    expect(() => normalizePhoneForCallingCode("123", "+213")).toThrow("invalid_phone");
  });
});
