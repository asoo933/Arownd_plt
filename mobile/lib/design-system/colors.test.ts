import { describe, expect, it } from "vitest";

import { brandColors, extendedThemeColors, themeColors } from "./colors";
import { getAppTheme } from "./themes";

function luminance(hex: string): number {
  const linearChannel = (start: number): number => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return linearChannel(1) * 0.2126 + linearChannel(3) * 0.7152 + linearChannel(5) * 0.0722;
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

  it("keeps semantic status text readable on the base theme surface", () => {
    for (const mode of ["light", "dark"] as const) {
      const theme = getAppTheme(mode);
      const statusColors = [theme.colors.danger, theme.colors.success, theme.colors.warning, theme.colors.info];

      for (const foreground of statusColors) {
        expect(contrastRatio(foreground, theme.colors.surface)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps semantic text readable on its semantic background surfaces", () => {
    const light = getAppTheme("light");
    const statusPairs: Array<[string, string]> = [
      [light.colors.dangerText, light.colors.dangerSurface],
      [light.colors.successText, light.colors.successSurface],
      [light.colors.warningText, light.colors.warningSurface],
      [light.colors.infoText, light.colors.infoSurface]
    ];

    for (const [foreground, background] of statusPairs) {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("uses mode-specific focus colors", () => {
    expect(getAppTheme("light").colors.focus).toBe("#000000");
    expect(getAppTheme("dark").colors.focus).toBe("#FFF01F");
  });

  it("uses the approved semantic background colors for both modes", () => {
    expect(extendedThemeColors.light.dangerSurface).toBe("#FEE2E2");
    expect(extendedThemeColors.light.successSurface).toBe("#DCFCE7");
    expect(extendedThemeColors.light.warningSurface).toBe("#FEF3C7");
    expect(extendedThemeColors.light.infoSurface).toBe("#DBEAFE");
    expect(extendedThemeColors.dark.dangerSurface).toBe("rgba(248,113,113,0.15)");
    expect(extendedThemeColors.dark.successSurface).toBe("rgba(74,222,128,0.15)");
    expect(extendedThemeColors.dark.warningSurface).toBe("rgba(251,191,36,0.15)");
    expect(extendedThemeColors.dark.infoSurface).toBe("rgba(96,165,250,0.15)");
  });

  it("uses black text on the approved yellow brand surface", () => {
    expect(brandColors.primary).toBe("#FFF01F");
    expect(contrastRatio(brandColors.black, brandColors.primary)).toBeGreaterThanOrEqual(4.5);
  });
});
