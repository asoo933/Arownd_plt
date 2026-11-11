import { describe, expect, it } from "vitest";

import { COUNTRY_REGION_CONFIG, getCountryRegionConfig } from "@/lib/country-regions";

describe("country region configuration", () => {
  it("maps each supported country to its real administrative hierarchy", () => {
    expect(COUNTRY_REGION_CONFIG.DZ).toMatchObject({ primaryType: "wilaya", secondaryTypes: ["daira"], secondaryRequired: true });
    expect(COUNTRY_REGION_CONFIG.MA).toMatchObject({ primaryType: "region", secondaryTypes: ["province", "prefecture"], secondaryRequired: false });
    expect(COUNTRY_REGION_CONFIG.EG).toMatchObject({ primaryType: "governorate", secondaryTypes: [], secondaryRequired: false });
    expect(COUNTRY_REGION_CONFIG.SA).toMatchObject({ primaryType: "region", secondaryTypes: ["governorate"], secondaryRequired: true });
    expect(COUNTRY_REGION_CONFIG.AE).toMatchObject({ primaryType: "emirate", secondaryTypes: ["municipality"], secondaryRequired: false });
  });

  it("rejects countries outside the supported Arownd markets", () => {
    expect(() => getCountryRegionConfig("US")).toThrow("unsupported_country");
    expect(() => getCountryRegionConfig("dz")).not.toThrow();
  });
});
