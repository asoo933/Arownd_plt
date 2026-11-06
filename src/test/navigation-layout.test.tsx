import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/components/sooqy/app-shell";
import { t, useTranslation } from "@/lib/i18n";
import { readFileSync } from "node:fs";
import path from "node:path";

const rootLayout = readFileSync(path.resolve(process.cwd(), "src/routes/__root.tsx"), "utf8");

describe("mobile application shell and role navigation labels", () => {
  it("uses a dynamic viewport and clips horizontal overflow", () => {
    render(<AppShell><div>محتوى الصفحة</div></AppShell>);
    const shell = screen.getByText("محتوى الصفحة").parentElement;
    expect(shell).toHaveClass("min-h-dvh");
    expect(shell).toHaveClass("overflow-x-clip");
  });

  it("reserves top and bottom safe areas at the application root", () => {
    expect(rootLayout).toContain("pt-[env(safe-area-inset-top)]");
    expect(rootLayout).toContain("pb-[calc(var(--nav-height)+env(safe-area-inset-bottom))]");
  });


  it("uses the shared confirmation dialog for unsaved browser and native navigation", () => {
    expect(rootLayout).not.toContain("window.confirm");
    expect(rootLayout).toContain('title={t("unsaved_changes_title")}');
    expect(rootLayout).toContain("pendingAnchor.current");
    expect(rootLayout).toContain("pendingBack.current");
    expect(rootLayout).toContain("anchor.click()");
  });

  it("provides matching delivery navigation labels in Arabic and English", () => {
    expect(t("delivery_dashboard", "ar")).toBe("لوحة التوصيل");
    expect(t("delivery_dashboard", "en")).toBe("Delivery");
    expect(t("delivery_nav_home", "ar")).toBe("الرئيسية");
    expect(t("delivery_nav_home", "en")).toBe("Home");
  });
});

  describe("document direction", () => {
    it("switches the document direction with the active language", async () => {
      const { result } = renderHook(() => useTranslation());

      await act(async () => {
        result.current.switchLang("en");
      });
      await waitFor(() => {
        expect(document.documentElement.lang).toBe("en");
        expect(document.documentElement.dir).toBe("ltr");
      });

      await act(async () => {
        result.current.switchLang("ar");
      });
      await waitFor(() => {
        expect(document.documentElement.lang).toBe("ar");
        expect(document.documentElement.dir).toBe("rtl");
      });
    });
  });
