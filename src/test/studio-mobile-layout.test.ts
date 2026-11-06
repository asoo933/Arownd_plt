import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n";

const studioDashboard = readFileSync(path.resolve(process.cwd(), "src/routes/studio.index.tsx"), "utf8");
const addProduct = readFileSync(path.resolve(process.cwd(), "src/routes/studio.add-product.tsx"), "utf8");
const productRow = readFileSync(path.resolve(process.cwd(), "src/components/sooqy/studio-product-row.tsx"), "utf8");
const shipments = readFileSync(path.resolve(process.cwd(), "src/routes/studio.shipments.tsx"), "utf8");

describe("merchant studio mobile experience", () => {
  it("keeps the dashboard compact and responsive", () => {
    expect(studioDashboard).toContain("space-y-5 overflow-x-clip pb-28 pt-3");
    expect(studioDashboard).toContain("grid grid-cols-2 gap-2.5");
    expect(studioDashboard).toContain("min-h-[4.5rem]");
  });

  it("keeps product management actions touch-friendly", () => {
    expect(productRow).toContain("size-[4.5rem]");
    expect(productRow).toContain("grid grid-cols-3 gap-1.5");
    expect(productRow).toContain("min-h-11");
  });

  it("uses a safe-area aware add-product layout and translated form labels", () => {
    expect(addProduct).toContain("pb-[calc(7rem+env(safe-area-inset-bottom))]");
    expect(addProduct).toContain('t("studio_product_name_label")');
    expect(addProduct).toContain('t("studio_product_images_label")');
    expect(addProduct).not.toContain("سجّل الدخول بحساب التاجر لإضافة منتجاتك.");
  });

  it("keeps shipment filters horizontally browsable on phones", () => {
    expect(shipments).toContain("min-h-dvh");
    expect(shipments).toContain("no-scrollbar flex gap-2 overflow-x-auto");
    expect(shipments).toContain("min-w-max shrink-0");
  });

  it("provides matching Arabic and English product form copy", () => {
    expect(t("studio_add_product_title", "ar")).toBe("إضافة منتج");
    expect(t("studio_add_product_title", "en")).toBe("Add product");
    expect(t("studio_product_name_label", "ar")).toBe("اسم المنتج");
    expect(t("studio_product_name_label", "en")).toBe("Product name");
  });
});
