/**
 * مفاتيح مشتركة بين كل الشاشات — تُستورد في أي مكان.
 * تُدمج مع القاموس الأساسي في `src/lib/i18n.ts`.
 */
import type { DictGroup } from "./types";

export const shared: DictGroup = {
  ar: {
    // التنقل والوصول
    nav_main: "التنقل الرئيسي",
    aria_notifications: "الإشعارات",
    aria_account: "الحساب",
    aria_home: "Arownd الرئيسية",
    aria_favorite_add: "إضافة إلى المفضلة",
    aria_favorite_remove: "إزالة من المفضلة",
    aria_close: "إغلاق",
    aria_back: "رجوع",
    aria_share: "مشاركة",
    aria_prev: "السابق",
    aria_next: "التالي",
    aria_increase_qty: "زيادة الكمية",
    aria_decrease_qty: "إنقاص الكمية",
    aria_delete_item: "حذف من السلة",
    aria_filters: "فلاتر متقدمة",

    // حالات عامة
    state_loading: "جاري التحميل...",
    state_error: "حدث خطأ",
    state_empty: "لا توجد نتائج",
    action_retry: "إعادة المحاولة",
    action_load_more: "تحميل المزيد",
    action_view_all: "عرض الكل",

    // عملات وأرقام
    currency_dzd: "دج",

    // عدّ المنتجات (صيغ الجمع العربية)
    product_count_zero: "لا منتجات",
    product_count_one: "منتج واحد",
    product_count_two: "منتجان",
    product_count_few: "{count} منتجات",
    product_count_many: "{count} منتجًا",
    product_count_other: "{count} منتج",

    // عدّ العناصر في السلة
    item_count_zero: "لا عناصر",
    item_count_one: "عنصر واحد",
    item_count_two: "عنصران",
    item_count_few: "{count} عناصر",
    item_count_many: "{count} عنصرًا",
    item_count_other: "{count} عنصر",

    // الولاية المفضّلة للتسوق (نُقلت زرّها إلى الملف الشخصي)
    profile_favorite_wilaya: "الولاية المفضّلة للتسوق",
    image_search_label: "ابحث بصورة",
    image_search_analyzing: "جارٍ التحليل…",
  },
  en: {
    // General
    nav_main: "Main navigation",
    aria_notifications: "Notifications",
    aria_account: "Account",
    aria_home: "Arownd home",
    aria_favorite_add: "Add to favorites",
    aria_favorite_remove: "Remove from favorites",
    aria_close: "Close",
    aria_back: "Back",
    aria_share: "Share",
    aria_prev: "Previous",
    aria_next: "Next",
    aria_increase_qty: "Increase quantity",
    aria_decrease_qty: "Decrease quantity",
    aria_delete_item: "Remove from bag",
    aria_filters: "Advanced filters",

    state_loading: "Loading...",
    state_error: "Something went wrong",
    state_empty: "No results",
    action_retry: "Retry",
    action_load_more: "Load more",
    action_view_all: "View all",

    currency_dzd: "DZD",

    product_count_zero: "No products",
    product_count_one: "1 product",
    product_count_two: "2 products",
    product_count_few: "{count} products",
    product_count_many: "{count} products",
    product_count_other: "{count} products",

    item_count_zero: "No items",
    item_count_one: "1 item",
    item_count_two: "2 items",
    item_count_few: "{count} items",
    item_count_many: "{count} items",
    item_count_other: "{count} items",

    profile_favorite_wilaya: "Favorite shopping wilaya",
    image_search_label: "Search by image",
    image_search_analyzing: "Analyzing…",
  },
};
