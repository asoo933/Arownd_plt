import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("Arownd Premium Marketplace design tokens", () => {
  it("preserves the approved brand palette", () => {
    expect(stylesheet).toContain("--neutral-950: #0A0A0A;");
    expect(stylesheet).toContain("--neutral-100: #F5F5F5;");
    expect(stylesheet).toContain("--neutral-0: #FFFFFF;");
    expect(stylesheet).toContain("--lime-500: #C6F135;");
  });

  it("defines both light and dark semantic themes", () => {
    expect(stylesheet).toContain(':root[data-theme="light"]');
    expect(stylesheet).toContain(':root[data-theme="dark"]');
    expect(stylesheet).toContain("--color-bg-surface: var(--neutral-0);");
  });

  it("uses the selected Arabic and Latin font families", () => {
    expect(stylesheet).toContain('--font-family-arabic: "Tajawal"');
    expect(stylesheet).toContain('--font-family-latin: "Inter"');
    expect(stylesheet).toContain('@import "@fontsource/tajawal/400.css";');
  });

  it("keeps touch targets and compact premium shapes usable", () => {
    expect(stylesheet).toContain("--touch-target-size: 44px;");
    expect(stylesheet).toContain("--radius-control: 14px;");
    expect(stylesheet).toContain("--radius-card: 20px;");
    expect(stylesheet).toContain("--radius-sheet: 24px;");
  });

  it("reserves native safe areas and bottom navigation space", () => {
    expect(stylesheet).toContain("padding-bottom: env(safe-area-inset-bottom, 0px);");
    expect(stylesheet).toContain("@utility app-bottom-nav");
    expect(stylesheet).toContain("backdrop-filter: blur(16px);");
  });

  it("respects reduced-motion preferences", () => {
    expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
