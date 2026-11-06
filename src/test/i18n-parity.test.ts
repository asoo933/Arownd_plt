import { describe, expect, it } from "vitest";
import { GROUPS } from "@/lib/dictionaries";
import { t, pluralForm, translate } from "@/lib/i18n";

/** كل المفاتيح المعرّفة عبر المجموعات. */
function allKeys() {
  const ar = new Set<string>();
  const en = new Set<string>();
  for (const g of GROUPS) {
    for (const k of Object.keys(g.ar)) ar.add(k);
    for (const k of Object.keys(g.en)) en.add(k);
  }
  return { ar, en };
}

describe("توازن القاموس (i18n parity)", () => {
  it("مجموعة ar و en تحتويان نفس المفاتيح تمامًا", () => {
    const { ar, en } = allKeys();
    const missingInEn = [...ar].filter((k) => !en.has(k));
    const missingInAr = [...en].filter((k) => !ar.has(k));
    expect({ missingInEn, missingInAr }).toEqual({ missingInEn: [], missingInAr: [] });
  });


  it("لا تتعارض مفاتيح مجموعات القاموس إلا في المفاتيح المشتركة المصرّح بها", () => {
    const allowedDuplicates = new Set([
      "aria_favorite_add",
      "aria_favorite_remove",
      "aria_close",
      "aria_back",
      "aria_prev",
      "aria_next",
      "aria_increase_qty",
      "aria_decrease_qty",
      "action_retry",
    ]);
    const owners = new Map<string, string[]>();
    for (const group of GROUPS) {
      for (const key of Object.keys(group.ar)) {
        owners.set(key, [...(owners.get(key) ?? []), key]);
      }
    }
    const duplicates = [...owners.entries()]
      .filter(([key, entries]) => entries.length > 1 && !allowedDuplicates.has(key))
      .map(([key]) => key);
    expect(duplicates).toEqual([]);
  });

  it("أسماء مفاتيح التوصيل لا تستبدل مفاتيح عامة", () => {
    const deliveryGroup = GROUPS.find((group) => "delivery_register_title" in group.ar);
    expect(deliveryGroup).toBeDefined();
    expect(deliveryGroup?.ar).toHaveProperty("delivery_company_delivery_address");
    expect(deliveryGroup?.ar).toHaveProperty("delivery_company_shipment_fee");
    expect(deliveryGroup?.ar).not.toHaveProperty("delivery_address");
    expect(deliveryGroup?.ar).not.toHaveProperty("delivery_fee");
  });

  it("لا قيمة ترجمة فارغة", () => {
    const empty: string[] = [];
    for (const g of GROUPS) {
      for (const [k, v] of Object.entries(g.ar)) if (!v.trim()) empty.push(`ar:${k}`);
      for (const [k, v] of Object.entries(g.en)) if (!v.trim()) empty.push(`en:${k}`);
    }
    expect(empty).toEqual([]);
  });

  it("كل قيمة في ar/en تحمل نفس عدد المتغيّرات", () => {
    const mismatched: string[] = [];
    const varsOf = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(",");
    for (const g of GROUPS) {
      for (const [k, arv] of Object.entries(g.ar)) {
        const env = g.en[k];
        if (env === undefined) continue;
        if (varsOf(arv) !== varsOf(env)) mismatched.push(k);
      }
    }
    expect(mismatched).toEqual([]);
  });

  it("مراحل Checkout الجديدة مترجمة في اللغتين", () => {
    expect(t("checkout_step_counter", "ar", { current: 2, total: 4 })).toBe("الخطوة 2 من 4");
    expect(t("checkout_step_counter", "en", { current: 2, total: 4 })).toBe("Step 2 of 4");
    expect(t("checkout_continue_address", "ar")).toBe("متابعة إلى العنوان");
    expect(t("checkout_continue_address", "en")).toBe("Continue to address");
    expect(t("checkout_continue_delivery", "ar")).toBe("متابعة إلى التوصيل");
    expect(t("checkout_continue_delivery", "en")).toBe("Continue to delivery");
    expect(t("checkout_continue_payment", "ar")).toBe("متابعة إلى الدفع");
    expect(t("checkout_continue_payment", "en")).toBe("Continue to payment");
    expect(t("checkout_wilaya_label", "ar")).toBe("الولاية");
    expect(t("checkout_wilaya_label", "en")).toBe("Wilaya");
    expect(t("checkout_commune_label", "ar")).toBe("البلدية");
    expect(t("checkout_commune_label", "en")).toBe("Commune");
    expect(t("checkout_commune_placeholder", "ar")).toBe("اختر البلدية");
    expect(t("checkout_commune_placeholder", "en")).toBe("Choose commune");
  });

  it("الترجمة تُعيد النص المفاتيح لا المفتاح نفسه", () => {
    expect(t("bag_heading", "ar")).toBe("سلة التسوق");
    expect(t("bag_heading", "en")).toBe("Shopping bag");
    expect(t("orders_cancel_store_title", "ar")).toBe("إلغاء طلب هذا المتجر");
    expect(t("orders_cancel_store_title", "en")).toBe("Cancel this store order");
    expect(t("orders_archive_action", "ar")).toBe("إخفاء من السجل");
    expect(t("orders_archive_action", "en")).toBe("Hide from history");
    expect(t("delivery_register_title", "ar")).toBe("تسجيل شركة توصيل");
    expect(t("delivery_register_title", "en")).toBe("Register a delivery company");
    expect(t("notifications_title", "ar")).toBe("الإشعارات");
    expect(t("notifications_title", "en")).toBe("Notifications");
    expect(t("wallet_title", "ar")).toBe("المحفظة");
    expect(t("wallet_title", "en")).toBe("Wallet");
    expect(t("wallet_error_amount", "ar", { amount: 100 })).toContain("100");
    expect(t("wallet_error_amount", "en", { amount: 100 })).toContain("100");
    expect(t("reservations_cancel_message", "ar")).toContain("إلغاء هذا الحجز");
    expect(t("reservations_cancel_message", "en")).toContain("cancel this reservation");
    expect(t("settings_title", "ar")).toBe("الإعدادات");
    expect(t("settings_title", "en")).toBe("Settings");
    expect(t("profile_login_title", "ar")).toContain("ملفك الشخصي");
    expect(t("profile_login_title", "en")).toContain("your profile");
    expect(t("delete_title", "ar")).toBe("حذف الحساب");
    expect(t("delete_title", "en")).toBe("Delete account");
    expect(t("delete_status_under_review", "ar")).toBe("قيد المراجعة");
    expect(t("delete_status_under_review", "en")).toBe("Under review");
    expect(t("delete_intro", "ar")).toContain("فريق Arownd");
    expect(t("delete_intro", "en")).toContain("Arownd team");
    expect(t("about_hero_heading", "ar")).toContain("اكتشف ما حولك");
    expect(t("about_hero_heading", "en")).toContain("Discover what's around you");
    expect(t("about_delivery_description", "en")).toContain("delivery companies");
    expect(t("help_tab_delivery", "ar")).toBe("شركات التوصيل");
    expect(t("help_tab_delivery", "en")).toBe("Delivery companies");
    expect(t("help_faq_payment_q", "ar")).toContain("طرق الدفع");
    expect(t("help_faq_payment_q", "en")).toContain("payment methods");
    expect(t("help_delivery_mail_note", "ar")).toContain("لن يُرسل الطلب تلقائيًا");
    expect(t("help_delivery_mail_note", "en")).toContain("not sent automatically");
    expect(t("category_sort_newest", "ar")).toBe("الأحدث");
    expect(t("category_sort_newest", "en")).toBe("Newest");
    expect(t("category_product_count", "ar", { count: 4 })).toContain("4");
    expect(t("category_product_count", "en", { count: 4 })).toContain("4");
    expect(t("product_own_store_notice", "ar")).toContain("استوديو التاجر");
    expect(t("product_own_store_notice", "en")).toContain("Merchant Studio");
    expect(t("store_not_found_title", "ar")).toBe("المتجر غير موجود");
    expect(t("store_not_found_title", "en")).toBe("Store not found");
    expect(t("store_meta_description", "ar", { name: "متجر" })).toContain("متجر");
    expect(t("store_meta_description", "en", { name: "Store" })).toContain("Store");
    expect(t("store_tab_reviews", "ar")).toBe("التقييمات");
    expect(t("store_tab_reviews", "en")).toBe("Reviews");
    expect(t("checkout_partial_success", "ar", { orders: 2, remaining: 3 })).toContain("2");
    expect(t("checkout_partial_success", "en", { orders: 2, remaining: 3 })).toContain("3");
    expect(t("create_store_title", "ar")).toBe("أصبح تاجرًا");
    expect(t("create_store_title", "en")).toBe("Become a merchant");
    expect(t("create_store_seo_title", "ar")).toContain("متجرك");
    expect(t("create_store_seo_title", "en")).toContain("Create your store");
    expect(t("map_seo_title", "ar")).toBe("الخريطة — Arownd");
    expect(t("map_seo_title", "en")).toBe("Map — Arownd");
    expect(t("checkout_tracking_codes", "ar")).toContain("تتبع");
    expect(t("checkout_tracking_codes", "en")).toContain("tracking");
    expect(t("studio_settings_meta_title", "ar")).toContain("تخصيص المتجر");
    expect(t("studio_settings_meta_title", "en")).toContain("Customize store");
    expect(t("studio_settings_category_missing", "ar")).toContain("التصنيف");
    expect(t("studio_settings_category_missing", "en")).toContain("category");
    expect(t("studio_meta_title", "ar")).toContain("استوديو التاجر");
    expect(t("studio_meta_title", "en")).toContain("Merchant Studio");
    expect(t("studio_store_open_now", "ar")).toBe("مفتوح الآن");
    expect(t("studio_store_open_now", "en")).toBe("Open now");
    expect(t("studio_verified_badge", "ar")).toContain("موثق");
    expect(t("studio_verified_badge", "en")).toContain("verified");
    expect(t("studio_add_product_meta_title", "ar")).toContain("إضافة منتج");
    expect(t("studio_add_product_meta_title", "en")).toContain("Add product");
    expect(t("shipment_view_order", "ar")).toBe("عرض الطلب");
    expect(t("shipment_view_order", "en")).toBe("View order");
    expect(t("studio_manage_products_hint", "ar")).toContain("المنتجات");
    expect(t("studio_manage_products_hint", "en")).toContain("products");
    expect(t("studio_product_units", "ar", { name: "قميص", count: 3 })).toContain("3");
    expect(t("studio_product_units", "en", { name: "Shirt", count: 3 })).toContain("3");
    expect(t("studio_order_hash", "ar", { id: "1234" })).toContain("1234");
    expect(t("studio_order_hash", "en", { id: "1234" })).toContain("1234");
    expect(t("delivery_cod_collected_amount", "ar", { amount: "1,200" })).toContain("1,200");
    expect(t("delivery_cod_collected_amount", "en", { amount: "1,200" })).toContain("1,200");
  });

  it("لا تُعيد المفتاح الخام إذا كان مفقودًا (سلاح أمان)", () => {
    // المفتاح غير موجود في اللغتين → يعود نص المفتاح مع تحذير
    const out = t("key_that_does_not_exist_xyz", "ar");
    expect(out).toBe("key_that_does_not_exist_xyz");
  });
});

describe("صيغ الجمع", () => {
  it("العربية تميّز صفر/واحد/اثنان/قليل/كثير", () => {
    expect(pluralForm(0, "ar")).toBe("zero");
    expect(pluralForm(1, "ar")).toBe("one");
    expect(pluralForm(2, "ar")).toBe("two");
    expect(pluralForm(3, "ar")).toBe("few");
    expect(pluralForm(11, "ar")).toBe("many");
    expect(pluralForm(100, "ar")).toBe("other");
  });

  it("الإنجليزية: واحد/باقي", () => {
    expect(pluralForm(1, "en")).toBe("one");
    expect(pluralForm(2, "en")).toBe("other");
  });

  it("العدّ يعرض الصيغة الصحيحة", () => {
    expect(t("product_count", "ar", { count: 1 })).toBe("منتج واحد");
    expect(t("product_count", "ar", { count: 2 })).toBe("منتجان");
    expect(t("product_count", "ar", { count: 5 })).toContain("5");
  });
});

describe("الاستبدال في النصوص", () => {
  it("يستبدل {name} بالقيمة", () => {
    const out = t("product_reserved_body", "ar", { name: "حذاء", store: "سوق" });
    expect(out).toContain("حذاء");
    expect(out).toContain("سوق");
    expect(out).not.toContain("{name}");
  });

  it("translate() تعمل خارج مكوّن React (وسوم الميتا)", () => {
    expect(translate("bag_title")).toBe("سلة التسوق — Arownd");
  });
});
