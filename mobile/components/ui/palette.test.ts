import { describe, expect, it } from "vitest";

import { getAppTheme } from "@/lib/theme";
import { getButtonPalette } from "./palette";

describe("getButtonPalette", () => {
  it("uses the Arownd accent for primary buttons in both themes", () => {
    for (const mode of ["light", "dark"] as const) {
      const palette = getButtonPalette(getAppTheme(mode), "primary");
      expect(palette.backgroundColor).toBe("#C6F135");
      expect(palette.foregroundColor).toBe("#0A0A0A");
    }
  });

  it("keeps outline and ghost buttons transparent", () => {
    const theme = getAppTheme("light");
    expect(getButtonPalette(theme, "outline")).toEqual({
      backgroundColor: "transparent",
      foregroundColor: theme.colors.foreground,
      borderColor: theme.colors.border
    });
    expect(getButtonPalette(theme, "ghost")).toEqual({
      backgroundColor: "transparent",
      foregroundColor: theme.colors.foreground
    });
  });

  it("uses the semantic danger color for destructive actions", () => {
    const theme = getAppTheme("dark");
    expect(getButtonPalette(theme, "danger")).toEqual({
      backgroundColor: theme.colors.danger,
      foregroundColor: "#FFFFFF"
    });
  });
});
