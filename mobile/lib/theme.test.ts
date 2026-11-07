import { describe, expect, it } from "vitest";

import { designTokens, getAppTheme } from "./theme";

describe("getAppTheme", () => {
  it("keeps the Arownd brand colors in both modes", () => {
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
  });

  it("exposes consistent spacing and radius tokens", () => {
    expect(designTokens.spacing.md).toBe(12);
    expect(designTokens.radius.lg).toBe(18);
    expect(designTokens.typography.body).toBe(14);
  });
});
