import { describe, expect, it } from "vitest";

import { brandColors } from "@/lib/design-system";
import { getAppTheme } from "@/lib/theme";
import { getButtonPalette } from "./palette";

describe("getButtonPalette", () => {
  it("uses the Arownd accent for primary buttons in both themes", () => {
    for (const mode of ["light", "dark"] as const) {
      const palette = getButtonPalette(getAppTheme(mode), "primary");
      expect(palette.backgroundColor).toBe("#FFF01F");
      expect(palette.foregroundColor).toBe("#000000");
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

  it("uses the accent for transparent secondary buttons in dark mode", () => {
    const theme = getAppTheme("dark");
    expect(getButtonPalette(theme, "outline").foregroundColor).toBe(theme.colors.accent);
    expect(getButtonPalette(theme, "ghost").foregroundColor).toBe(theme.colors.accent);
  });

  it("uses contrasting foregrounds for destructive actions in both themes", () => {
    const lightTheme = getAppTheme("light");
    const darkTheme = getAppTheme("dark");
    expect(getButtonPalette(lightTheme, "danger")).toEqual({
      backgroundColor: lightTheme.colors.danger,
      foregroundColor: brandColors.white
    });
    expect(getButtonPalette(darkTheme, "danger")).toEqual({
      backgroundColor: darkTheme.colors.danger,
      foregroundColor: brandColors.black
    });
  });
});
