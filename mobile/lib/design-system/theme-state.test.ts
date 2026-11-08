import { describe, expect, it } from "vitest";

import { isThemeMode, resolveThemeMode } from "./theme-state";

describe("theme preference state", () => {
  it("accepts only supported theme preferences", () => {
    expect(isThemeMode("system")).toBe(true);
    expect(isThemeMode("light")).toBe(true);
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("auto")).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });

  it("resolves system preference from the device appearance", () => {
    expect(resolveThemeMode("system", "dark")).toBe("dark");
    expect(resolveThemeMode("system", "light")).toBe("light");
    expect(resolveThemeMode("system", null)).toBe("light");
  });

  it("preserves an explicit light or dark preference", () => {
    expect(resolveThemeMode("light", "dark")).toBe("light");
    expect(resolveThemeMode("dark", "light")).toBe("dark");
  });
});
