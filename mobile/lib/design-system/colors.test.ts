import { describe, expect, it } from "vitest";

import { extendedThemeColors, themeColors } from "./colors";
import { getAppTheme } from "./themes";

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe("design system text contrast", () => {
  it("keeps muted, subtle, placeholder and accent text readable on theme surfaces", () => {
    for (const mode of ["light", "dark"] as const) {
      const theme = getAppTheme(mode);
      const surfaces = [themeColors[mode].background, themeColors[mode].surface, themeColors[mode].input];
      const textColors = [
        theme.colors.foregroundMuted,
        theme.colors.muted,
        theme.colors.subtle,
        theme.colors.placeholder,
        theme.colors.accentMuted
      ];

      for (const foreground of textColors) {
        for (const background of surfaces) {
          expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("keeps semantic status text readable on base surfaces and status surfaces", () => {
    for (const mode of ["light", "dark"] as const) {
      const theme = getAppTheme(mode);
      const semantic = extendedThemeColors[mode];
      const cases = [
        [theme.colors.danger, theme.colors.dangerSurface],
        [theme.colors.success, theme.colors.successSurface],
        [theme.colors.warning, theme.colors.warningSurface]
      ] as const;

      for (const [foreground, statusSurface] of cases) {
        expect(contrastRatio(foreground, theme.colors.surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(foreground, statusSurface)).toBeGreaterThanOrEqual(4.5);
      }

      expect(semantic.accentMuted).toBe(theme.colors.accentMuted);
    }
  });

  it("uses dark text on the lime brand surface", () => {
    expect(contrastRatio("#0A0A0A", "#C6F135")).toBeGreaterThanOrEqual(4.5);
  });
});
