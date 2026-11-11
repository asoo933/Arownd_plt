import { describe, expect, it } from "vitest";

import { getRegionDisplayName } from "@/lib/country-regions";

describe("country region helpers", () => {
  it("uses the best available localized region name", () => {
    const region = {
      id: 1,
      country_code: "DZ",
      parent_id: null,
      code: "DZ-01",
      name_ar: "الجزائر",
      name_fr: "Alger",
      name_en: null,
      region_type: "wilaya",
      is_enabled: true
    };

    expect(getRegionDisplayName(region, "ar")).toBe("الجزائر");
    expect(getRegionDisplayName(region, "fr")).toBe("Alger");
    expect(getRegionDisplayName(region, "en")).toBe("Alger");
  });
});
