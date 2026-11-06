import { describe, expect, it } from "vitest";
import { getMarketForLang } from "./market";

describe("getMarketForLang", () => {
  it("returns the Arabic market explicitly", () => {
    expect(getMarketForLang("ar").currencySymbol).toBe("دج");
  });

  it("returns the English market without reading browser storage", () => {
    const englishMarket = getMarketForLang("en");
    expect(englishMarket.currencySymbol).toBe("DZD");
    expect(englishMarket.locale).toBe("en-DZ");
  });
});
