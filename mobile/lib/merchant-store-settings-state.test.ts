import { describe, expect, it } from "vitest";
import { MerchantStoreSettingsSchema } from "@/lib/merchant-store-settings-state";

const valid = {
  name: "متجر الاختبار",
  wilaya_id: 9,
  description: "",
  phone: "0550123456",
  whatsapp: "",
  commune: "البليدة",
  address_line: "شارع الاستقلال رقم 10",
  opening_hours: { open: "09:00", close: "20:00", closed_days: [5] },
  instagram_url: "",
  facebook_url: ""
};

describe("MerchantStoreSettingsSchema", () => {
  it("accepts valid store settings", () => {
    expect(MerchantStoreSettingsSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a valid wilaya identifier", () => {
    expect(MerchantStoreSettingsSchema.safeParse({ ...valid, wilaya_id: 0 }).success).toBe(false);
    expect(MerchantStoreSettingsSchema.safeParse({ ...valid, wilaya_id: 9 }).success).toBe(true);
  });

  it("rejects unsafe social URLs, invalid opening times and duplicate closing days", () => {
    expect(MerchantStoreSettingsSchema.safeParse({
      ...valid,
      instagram_url: "javascript:alert(1)"
    }).success).toBe(false);
    expect(MerchantStoreSettingsSchema.safeParse({
      ...valid,
      instagram_url: "https://"
    }).success).toBe(false);
    expect(MerchantStoreSettingsSchema.safeParse({
      ...valid,
      facebook_url: "http://facebook.com/example"
    }).success).toBe(false);
    expect(MerchantStoreSettingsSchema.safeParse({
      ...valid,
      instagram_url: "https://instagram.com/example",
      facebook_url: "https://facebook.com/example"
    }).success).toBe(true);
    expect(MerchantStoreSettingsSchema.safeParse({
      ...valid,
      opening_hours: { ...valid.opening_hours, open: "29:90" }
    }).success).toBe(false);
    expect(MerchantStoreSettingsSchema.safeParse({
      ...valid,
      opening_hours: { ...valid.opening_hours, closed_days: [5, 5] }
    }).success).toBe(false);
  });
});
