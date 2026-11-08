import { describe, expect, it } from "vitest";

import { designTokens, getAppTheme } from "./theme";

describe("design system theme tokens", () => {
  it("keeps brand and base colors consistent in both modes", () => {
    expect(designTokens.brand.accent).toBe("#C6F135");
    expect(getAppTheme("light").colors.accent).toBe("#C6F135");
    expect(getAppTheme("dark").colors.accent).toBe("#C6F135");
    expect(getAppTheme("light").colors.background).toBe("#F5F5F5");
    expect(getAppTheme("dark").colors.background).toBe("#0A0A0A");
  });

  it("provides readable foreground and surface colors for both modes", () => {
    const light = getAppTheme("light");
    const dark = getAppTheme("dark");

    expect(light.colors.foreground).toBe("#0A0A0A");
    expect(light.colors.surface).toBe("#FFFFFF");
    expect(dark.colors.foreground).toBe("#F5F5F5");
    expect(dark.colors.surface).toBe("#171717");
    expect(light.colors.foregroundSecondary).toBe("#525252");
    expect(dark.colors.foregroundSecondary).toBe("#D4D4D4");
  });

  it("exposes consistent spacing, radius, typography and dimensions", () => {
    expect(designTokens.spacing.md).toBe(12);
    expect(designTokens.radius.lg).toBe(18);
    expect(designTokens.typography.body).toBe(14);
    expect(designTokens.dimensions.controlHeight.md).toBe(44);
    expect(designTokens.fontFamilies.arabic).toBe("IBMPlexSansArabic");
    expect(getAppTheme("light").fontFamilies).toEqual(designTokens.fontFamilies);
    expect(getAppTheme("dark").fontWeights).toEqual(designTokens.fontWeights);
    expect(getAppTheme("light").dimensions).toEqual(designTokens.dimensions);
    expect(getAppTheme("dark").shadows).toEqual(designTokens.shadows);
  });

  it("keeps semantic, commerce and delivery colors centralized", () => {
    expect(designTokens.semantic.success).toBe("#16A34A");
    expect(designTokens.commerce.discount).toBe("#DC2626");
    expect(designTokens.delivery.completed).toBe("#16A34A");
  });
});
