import { describe, expect, it } from "vitest";
import { telUrl, whatsappUrl } from "@/lib/contact";

describe("contact links", () => {
  it("يحوّل الرقم المحلي إلى صيغة دولية صالحة لواتساب", () => {
    expect(whatsappUrl("0550 12 34 56")).toBe("https://wa.me/213550123456");
    expect(whatsappUrl("+213 550 12 34 56")).toBe("https://wa.me/213550123456");
    expect(whatsappUrl("00213550123456")).toBe("https://wa.me/213550123456");
    expect(whatsappUrl("550123456")).toBe("https://wa.me/213550123456");
  });
  it("يُرمّز النص ويرفض الأرقام الناقصة", () => {
    expect(whatsappUrl("0550123456", "مرحبا بك")).toContain("?text=%D9%85");
    expect(whatsappUrl("")).toBeNull();
    expect(whatsappUrl(null)).toBeNull();
    expect(whatsappUrl("123")).toBeNull();
  });
  it("tel: لا يُنشأ لرقم فارغ", () => {
    expect(telUrl("")).toBeNull();
    expect(telUrl("0550 12 34 56")).toBe("tel:0550123456");
  });
});
