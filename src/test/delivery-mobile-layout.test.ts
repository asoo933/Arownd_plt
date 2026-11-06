import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(path.resolve(process.cwd(), "src/routes/delivery-dashboard.tsx"), "utf8");
const registration = readFileSync(path.resolve(process.cwd(), "src/routes/delivery-register.tsx"), "utf8");

describe("delivery company mobile experience", () => {
  it("reserves the native bottom safe area and keeps dashboard tabs scrollable", () => {
    expect(dashboard).toContain("pb-[calc(7rem+env(safe-area-inset-bottom))]");
    expect(dashboard).toContain("no-scrollbar flex gap-2 overflow-x-auto");
    expect(dashboard).toContain('aria-pressed={activeTab === "pending"}');
    expect(dashboard).toContain('aria-pressed={activeTab === "all"}');
  });

  it("keeps delivery actions at comfortable mobile touch sizes", () => {
    expect(dashboard).toContain("min-h-11 flex-1 rounded-[var(--radius-control)]");
    expect(dashboard).toContain("min-h-11 rounded-2xl border px-3 py-2");
    expect(dashboard).toContain("min-h-[5.5rem] rounded-[var(--radius-card)]");
    expect(dashboard).toContain('className={cn("size-6 shrink-0", color)}');
  });

  it("uses safe-area aware spacing and full-height form controls during registration", () => {
    expect(registration).toContain("pb-[calc(7rem+env(safe-area-inset-bottom))]");
    expect(registration).toContain("h-12 w-full rounded-[var(--radius-control)]");
    expect(registration).toContain("min-h-[var(--control-height)] rounded-full");
    expect(registration).toContain("const payload: Database[\"public\"][\"Tables\"][\"delivery_companies\"][\"Insert\"]");
    expect(registration).not.toContain("Record<string, unknown>");
    expect(registration).toContain('type="tel"\n            dir="ltr"');
    expect(registration).toContain('type="email"\n            dir="ltr"');
  });

  it("uses dictionary keys instead of hardcoded Arabic UI strings", () => {
    const arabicLiteral = /["'`][^"'`]*[\u0600-\u06FF][^"'`]*["'`]/;
    expect(dashboard).not.toMatch(arabicLiteral);
    expect(registration).not.toMatch(arabicLiteral);
  });

  it("does not contain escaped newline fragments in JSX", () => {
    expect(dashboard).not.toContain("\\n            className=");
  });
});
