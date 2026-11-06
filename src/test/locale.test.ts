import { describe, expect, it } from "vitest";
import {
  DEFAULT_LANG,
  LANG_COOKIE,
  detectLang,
  langFromAcceptLanguage,
  langFromCookie,
  parseLocalePrefix,
  withLocalePrefix,
} from "@/lib/locale";

describe("طبقة اللغة — بادئات المسارات", () => {
  it("يتعرّف على بادئة اللغة", () => {
    expect(parseLocalePrefix("/ar/")).toEqual({ lang: "ar", rest: "/" });
    expect(parseLocalePrefix("/en/explore")).toEqual({ lang: "en", rest: "/explore" });
    expect(parseLocalePrefix("/en")).toEqual({ lang: "en", rest: "/" });
  });

  it("لا يخلط المسارات العادية مع البادئات", () => {
    expect(parseLocalePrefix("/explore")).toBeNull();
    expect(parseLocalePrefix("/")).toBeNull();
    expect(parseLocalePrefix("/stores/arabic")).toBeNull();
    expect(parseLocalePrefix("/order")).toBeNull();
  });

  it("يبني المسار ببادئة اللغة", () => {
    expect(withLocalePrefix("ar", "/")).toBe("/ar");
    expect(withLocalePrefix("en", "/explore")).toBe("/en/explore");
    expect(withLocalePrefix("en", "explore")).toBe("/en/explore");
  });
});

describe("طبقة اللغة — الكشف", () => {
  it("يقرأ اللغة من Accept-Language", () => {
    expect(langFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(langFromAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.5")).toBe("en");
    expect(langFromAcceptLanguage("ar-DZ,ar;q=0.9")).toBe("ar");
    expect(langFromAcceptLanguage(null)).toBeNull();
  });

  it("يقرأ اللغة من الكوكي", () => {
    expect(langFromCookie(`${LANG_COOKIE}=en`)).toBe("en");
    expect(langFromCookie(`other=1; ${LANG_COOKIE}=ar; x=2`)).toBe("ar");
    expect(langFromCookie("other=1")).toBeNull();
  });

  it("الأولوية: الكوكي ثم الترويسة ثم Accept-Language ثم الافتراضي", () => {
    expect(detectLang({ cookie: `${LANG_COOKIE}=ar`, acceptLanguage: "en-US" })).toBe("ar");
    expect(detectLang({ header: "en", acceptLanguage: "ar-DZ" })).toBe("en");
    expect(detectLang({ acceptLanguage: "en-US" })).toBe("en");
    expect(detectLang({})).toBe(DEFAULT_LANG);
  });
});
