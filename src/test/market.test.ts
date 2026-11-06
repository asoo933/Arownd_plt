import { describe, expect, it, beforeEach } from "vitest";
import {
  DEFAULT_MARKET,
  MARKETS,
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatTime,
  getMarket,
  setMarket,
  zonedParts,
} from "@/lib/market";
import { formatDA, getStoreStatus, isOpenNow } from "@/lib/geo";

const ALGERIA = DEFAULT_MARKET;

describe("طبقة السوق — التنسيق", () => {
  it("السوق العربي يعرض الدينار بالسلوك نفسه السابق", () => {
    // نفس الناتج الذي كان يعطيه `toLocaleString("fr-DZ")` — لا كسر بصري.
    expect(formatMoney(2500, ALGERIA)).toBe(`${(2500).toLocaleString("fr-DZ")} دج`);
    expect(formatDA(2500)).toBe(formatMoney(2500, ALGERIA));
  });

  it("السوق الإنجليزي يعرض DZD", () => {
    const en = MARKETS.find((m) => m.lang === "en")!;
    expect(formatMoney(2500, en)).toBe(`${(2500).toLocaleString("en-DZ")} DZD`);
  });

  it("الأرقام بلا رمز عملة", () => {
    expect(formatNumber(1234, ALGERIA)).toBe((1234).toLocaleString("fr-DZ"));
  });

  it("المبالغ غير الصالحة لا تُنتج NaN", () => {
    expect(formatMoney(Number.NaN, ALGERIA)).toContain("دج");
    expect(formatNumber(Number.POSITIVE_INFINITY, ALGERIA)).not.toContain("∞");
  });
});

describe("طبقة السوق — التاريخ بتوقيت السوق", () => {
  it("التاريخ يُحسب بتوقيت الجزائر لا بتوقيت الجهاز", () => {
    // 2026-03-15T23:30Z → 00:30 من اليوم التالي في الجزائر (UTC+1)
    const d = new Date("2026-03-15T23:30:00Z");
    const z = zonedParts(d, "Africa/Algiers");
    expect(z.day).toBe(16);
    expect(z.month).toBe(3);
    expect(z.year).toBe(2026);
    expect(z.hour).toBe(0);
    expect(z.minute).toBe(30);
  });

  it("التاريخ العربي بصيغة يوم/شهر/سنة", () => {
    const d = new Date("2026-03-15T10:30:00Z");
    expect(formatDate(d, ALGERIA)).toBe("15/03/2026");
  });

  it("الوقت بصيغة 24 ساعة", () => {
    const d = new Date("2026-03-15T10:30:00Z");
    expect(formatTime(d, ALGERIA)).toBe("11:30");
  });

  it("التاريخ والوقت معًا", () => {
    const d = new Date("2026-03-15T10:30:00Z");
    expect(formatDateTime(d, ALGERIA)).toBe("15/03/2026 — 11:30");
  });

  it("يوم الأسبوع صحيح (0 = الأحد)", () => {
    // 2026-03-15 هو يوم الأحد
    const z = zonedParts(new Date("2026-03-15T10:30:00Z"), "Africa/Algiers");
    expect(z.weekday).toBe(0);
  });
});

describe("السوق النشط", () => {
  beforeEach(() => {
    localStorage.clear();
    setMarket(DEFAULT_MARKET.id);
  });

  it("الافتراضي هو السوق العربي", () => {
    expect(getMarket().id).toBe("dz");
    expect(getMarket().dir).toBe("rtl");
  });

  it("التبديل يُحفظ ويُستعاد", () => {
    const en = MARKETS.find((m) => m.lang === "en")!;
    setMarket(en.id);
    expect(getMarket().id).toBe(en.id);
    expect(getMarket().dir).toBe("ltr");
  });

  it("معرّف مجهول يعود للافتراضي", () => {
    expect(getMarket("does-not-exist").id).toBe("dz");
  });
});

describe("ساعات العمل — إصلاح الإزاحة الثابتة", () => {
  const hours = { open: "09:00", close: "18:00", closed_days: [] as number[] };

  it("يفتح حسب توقيت السوق لا بتوقيت الجهاز", () => {
    // 10:30 في الجزائر (UTC+1) = 09:30Z → داخل ساعات العمل
    const inside = new Date("2026-03-15T09:30:00Z");
    expect(isOpenNow(hours, inside)).toBe(true);
    // 08:00Z = 09:00 الجزائر → بداية الدوام
    expect(isOpenNow(hours, new Date("2026-03-15T08:00:00Z"))).toBe(true);
    // 07:30Z = 08:30 الجزائر → قبل الدوام
    expect(isOpenNow(hours, new Date("2026-03-15T07:30:00Z"))).toBe(false);
    // 17:30Z = 18:30 الجزائر → بعد الدوام
    expect(isOpenNow(hours, new Date("2026-03-15T17:30:00Z"))).toBe(false);
  });

  it("الوصف يُحسب بنفس التوقيت", () => {
    const status = getStoreStatus(hours, new Date("2026-03-15T09:30:00Z"));
    expect(status.isOpen).toBe(true);
    expect(status.description).toContain("18:00");
  });

  it("أيام الإغلاق محسوبة بتوقيت السوق", () => {
    // 2026-03-15 الأحد → إذا كان الأحد يومًا مغلقًا فالمتجر مغلق
    const closedSunday = { ...hours, closed_days: [0] };
    expect(isOpenNow(closedSunday, new Date("2026-03-15T09:30:00Z"))).toBe(false);
  });
});
