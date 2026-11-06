import { afterEach, describe, expect, it } from "vitest";
import { translate } from "./i18n";

const originalLanguage = document.documentElement.lang;

afterEach(() => {
  document.documentElement.lang = originalLanguage;
});

describe("map and explore translations", () => {
  it("provides Arabic labels for map controls and the explore map entry", () => {
    document.documentElement.lang = "ar";

    expect(translate("map_zoom_in")).toBe("تقريب الخريطة");
    expect(translate("map_zoom_out")).toBe("تصغير الخريطة");
    expect(translate("explore_open_map")).toBe("عرض المتاجر على الخريطة");
  });

  it("provides matching English labels", () => {
    document.documentElement.lang = "en";

    expect(translate("map_zoom_in")).toBe("Zoom in");
    expect(translate("map_zoom_out")).toBe("Zoom out");
    expect(translate("explore_open_map")).toBe("View stores on map");
  });
});
