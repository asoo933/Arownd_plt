import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, createRouter, type Router } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { resetSupabaseFake, setSession, state } from "./supabase-fake";

// استبدال عميل Supabase الحقيقي بالـfake (لا شبكة، بيانات ثابتة)
vi.mock("@/integrations/supabase/client", async () => {
  const { fakeSupabase } = await import("./supabase-fake");
  return { supabase: fakeSupabase };
});
// شاشات لا علاقة لها بالتدفقات
vi.mock("@/components/sooqy/Splash", () => ({ Splash: () => null }));
vi.mock("@/components/sooqy/OnboardingGate", () => ({ OnboardingGate: () => null }));
// طبقة تشخيص الشاشة — لا علاقة لها بمنطق التطبيق وحرّاسها يلوّثون DOM الاختبارات
vi.mock("@/lib/screen-error", () => ({ reportScreenError: vi.fn() }));
// WebGL غير متاح في jsdom — الخريطة تُستبدل بعنصر بسيط
vi.mock("@/components/sooqy/StoreMap", () => ({
  default: () => <div>خريطة تجريبية</div>,
}));
// WebGL is unavailable in jsdom; the map picker has a dedicated component test.
vi.mock("@/components/sooqy/StoreLocationPicker", () => ({
  StoreLocationPicker: () => <div>محدد موقع تجريبي</div>,
}));

import { createMemoryHistory } from "@tanstack/react-router";

function renderApp(initialPath = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const history = createMemoryHistory({ initialEntries: [initialPath] });
  const router = createRouter({ routeTree, context: { queryClient }, history });
  render(<RouterProvider router={router} />);
  return router;
}

async function go(
  router: Router<typeof routeTree>,
  to: string,
  params?: Record<string, string>,
  search?: Record<string, unknown>,
) {
  await act(async () => {
    await router.navigate({ to: to as never, params: params as never, search: search as never });
  });
  await waitFor(() => expect(router.state.status).toBe("idle"));
}

async function expectText(text: string | RegExp) {
  await waitFor(() => expect(screen.getAllByText(text).length).toBeGreaterThan(0));
}

describe("جولة المستخدم — كل صفحة تُرسم بمحتواها", () => {
  beforeEach(() => {
    resetSupabaseFake();
    localStorage.clear();
  });

  const SMOKE: Array<{
    to: string;
    params?: Record<string, string>;
    expect?: string | RegExp;
    placeholder?: string;
  }> = [
    { to: "/", expect: "وصل حديثًا" },
    { to: "/explore", placeholder: "ابحث عن منتج..." },
    { to: "/stores", expect: "المتاجر" },
    { to: "/stores/$storeId", params: { storeId: "store-1" }, expect: "متجر التجربة" },
    { to: "/category/$catId", params: { catId: "shoes" }, expect: "الأحذية" },
    { to: "/products/$productId", params: { productId: "prod-1" }, expect: "حذاء رياضي" },
    { to: "/map", expect: "تقريب الخريطة" },
    { to: "/bag", expect: "سلة التسوق" },
    { to: "/checkout", expect: /تحتاج لدخول الحساب|تسجيل الدخول|دخول/ },
    { to: "/favorites", expect: "المفضلة" },
    { to: "/settings", expect: "الإعدادات" },
    { to: "/about", expect: "حول Arownd" },
    { to: "/create-store", expect: "أصبح تاجرًا" },
    { to: "/profile", expect: /سجّل الدخول|تسجيل الدخول|الملف الشخصي/ },
    { to: "/notifications", expect: "الإشعارات" },
    { to: "/reservations/", expect: "حجوزاتي" },
    { to: "/orders/", expect: /سجّل الدخول|طلباتي/ },
    { to: "/orders/$orderId", params: { orderId: "order-1" }, expect: /سجّل الدخول|طلب/ },
    { to: "/studio", expect: /استوديو Arownd|لوحة التاجر|أنشئ متجر/ },
    { to: "/delivery-register", expect: /تحتاج إلى تسجيل الدخول|تسجيل الدخول/ },
    { to: "/studio/settings", expect: "معلومات المتجر" },
    { to: "/studio/add-product", expect: /إضافة منتج|أضف منتج/ },
    { to: "/studio/shipments", expect: /شحنات|سجّل الدخول/ },
    { to: "/help", expect: "مساعدة والأسئلة الشائعة" },
    { to: "/terms", expect: "شروط الاستخدام" },
    { to: "/privacy", expect: "سياسة الخصوصية" },
    { to: "/auth", expect: /AROWND|SOOQY/i },
  ];

  it.each(SMOKE)("الصفحة $to تُرسم", async ({ to, params, expect: expected, placeholder }) => {
    // نمرر المسار الابتدائي المباشر بدلاً من الانتقال لاحقاً لمنع تعليق التنقل عند عدم التهيئة
    const initialUrl = params
      ? Object.entries(params).reduce((acc, [k, v]) => acc.replace(`$${k}`, v), to)
      : to;
    renderApp(initialUrl);
    if (placeholder) {
      await waitFor(() => expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument());
    } else {
      await expectText(expected!);
    }
  });
});

describe("جولة المستخدم — تدفقات حقيقية", () => {
  beforeEach(() => {
    resetSupabaseFake();
    localStorage.clear();
  });

  it("يعرض التسجيل لشركة توصيل لم تنشئ حسابًا بعد", async () => {
    setSession({ id: "user-1", email: "courier@test.dz" });
    renderApp("/delivery-dashboard");

    expect(
      await screen.findByRole("link", { name: "تسجيل شركة توصيل جديدة" }),
    ).toHaveAttribute("href", "/delivery-register");
  });

  it("يعرض الشحنات المعلقة لشركة توصيل معتمدة", async () => {
    setSession({ id: "carrier-1", email: "courier@test.dz" });
    state.deliveryCompanies = [
      {
        id: "delivery-1",
        user_id: "carrier-1",
        company_name: "شركة التوصيل التجريبية",
        is_approved: true,
      },
    ];
    state.shipments = [
      {
        id: "shipment-1",
        company_id: "delivery-1",
        order_id: "order-1",
        status: "pending",
        recipient_name: "محمد أمين",
        recipient_phone: "0551234567",
        delivery_address: "شارع ديدوش مراد",
        fee: 500,
      },
    ];

    renderApp("/delivery-dashboard");

    expect(await screen.findByText("شحنة #shipment")).toBeInTheDocument();
    await waitFor(() => expect(state.calls).toContain("shipments.eq(status, pending)"));
  });

  it("إضافة متجر إلى المفضلة من صفحته تُظهره في قائمة المفضلة", async () => {
    const router = renderApp();
    await go(router, "/stores/$storeId", { storeId: "store-1" });

    const follow = await screen.findByRole("button", { name: /إضافة إلى المفضلة/ });
    fireEvent.click(follow);

    await waitFor(() => {
      const favs = JSON.parse(localStorage.getItem("arownd:favorites") ?? "{}") as {
        stores?: string[];
      };
      expect(favs.stores).toContain("store-1");
    });
    expect(await screen.findByRole("button", { name: /إزالة من المفضلة/ })).toBeInTheDocument();

    await go(router, "/favorites");
    fireEvent.click(screen.getByRole("tab", { name: /المتاجر/ }));
    await expectText("متجر التجربة");
  });

  it("إضافة منتج للسلة ثم زيادة الكمية ثم إفراغ السلة", async () => {
    const router = renderApp();
    await go(router, "/products/$productId", { productId: "prod-1" });

    const add = await screen.findByRole("button", { name: /أضف للسلة/ });
    fireEvent.click(add);

    await go(router, "/bag");
    await expectText("حذاء رياضي");

    fireEvent.click(screen.getByRole("button", { name: "زيادة الكمية" }));
    await expectText("الإجمالي (2 منتج)");

    fireEvent.click(screen.getByRole("button", { name: "حذف من السلة" }));
    await expectText("سلتك فارغة");
  });

  it("البحث عن المنتجات من صفحة استكشف يستعلم عن كتالوج المنتجات", async () => {
    const router = renderApp("/explore");

    expect(await screen.findByText("حذاء رياضي")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("ابحث عن منتج..."), {
      target: { value: "حذاء" },
    });

    await waitFor(() => {
      expect(state.calls.some((call) => call.startsWith("store_offers.or("))).toBe(true);
      expect(router.state.location.search).toMatchObject({ q: "حذاء" });
    });
  });

  it("تبقي شحن المحفظة والسحب معطلين في وضع المعاينة", async () => {
    setSession({ id: "user-1", email: "customer@test.dz" });
    renderApp("/wallet");

    expect(await screen.findByText("معاينة فقط")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /شحن الرصيد/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /طلب سحب/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "اشحن رصيدك" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/سند الدفع|طريقة الدفع|بيانات الحساب/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /إرسال طلب الشحن|إرسال طلب السحب/ })).not.toBeInTheDocument();
    expect(state.calls.some((call) => /wallet_transactions\.(insert|update)/.test(call))).toBe(false);
  });

  it("تاجر بلا متجر ينشئ متجره من الاستوديو وتظهر اللوحة", async () => {
    setSession({ id: "user-2", email: "tajir@test.dz" });
    state.userRoles = [{ user_id: "user-2", role: "merchant" }];
    const router = renderApp();
    await go(router, "/studio");

    await expectText(/أنشئ متجر/);

    fireEvent.change(screen.getByPlaceholderText("اسم المتجر"), {
      target: { value: "متجري الجديد" },
    });
    fireEvent.change(screen.getByPlaceholderText("هاتف المتجر"), {
      target: { value: "0551234567" },
    });
    fireEvent.change(screen.getByPlaceholderText("البلدية"), { target: { value: "باب الزوار" } });
    fireEvent.change(screen.getByPlaceholderText("العنوان"), { target: { value: "حي 5 جويلية" } });
    fireEvent.change(screen.getByLabelText("اختيار الولاية"), { target: { value: "16" } });

    // التصنيف الرئيسي للمتجر صار مطلوبًا (شجرة التصنيفات الجديدة)
    fireEvent.click(screen.getByRole("button", { name: /الأزياء والملابس/ }));
    fireEvent.click(screen.getByRole("button", { name: /الأحذية/ }));

    fireEvent.click(screen.getByRole("button", { name: "فتح المتجر" }));

    await waitFor(() =>
      expect(state.calls.some((c) => c.startsWith("rpc.create_my_store"))).toBe(true),
    );
    await waitFor(() =>
      expect(state.stores.some((store) => store["id"] === "store-created")).toBe(true),
    );

    // بعد التحديث تظهر لوحة التاجر مع اسم المتجر الجديد
    await expectText("مساحة عمل متجرك");
    await expectText("متجري الجديد");
  });

  it("تاجر لديه متجر يصل لصفحة تخصيص المتجر من اللوحة", async () => {
    setSession({ id: "user-1", email: "malik@test.dz" });
    state.userRoles = [{ user_id: "user-1", role: "merchant" }];
    const router = renderApp();
    await go(router, "/studio");

    await expectText("مساحة عمل متجرك");
    fireEvent.click(await screen.findByRole("link", { name: /تخصيص المتجر/ }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/studio/settings"));
    await expectText("هوية متجرك تظهر للعملاء في صفحته");
  });

  it("إتمام طلب كامل: كل السلة تنشأ في طلب رئيسي واحد", async () => {
    setSession({ id: "customer-1", email: "customer@test.dz" });
    // نسختان من العرض نفسه بخيارات مختلفة يجب أن تبقيا منفصلتين داخل الطلب.
    localStorage.setItem(
      "sooqy:bag",
      JSON.stringify([
        {
          offerId: "offer-1",
          quantity: 1,
          options: { color: "أسود", size: "M" },
          price: 2500,
          name: "حذاء رياضي",
          productId: "prod-1",
        },
        {
          offerId: "offer-1",
          quantity: 1,
          options: { color: "أبيض", size: "L" },
          price: 2500,
          name: "حذاء رياضي",
          productId: "prod-1",
        },
      ]),
    );
    const router = renderApp();

    await go(router, "/checkout");
    await expectText("سلعك (2)");
    expect(screen.getByText(/أسود · M/)).toBeInTheDocument();
    expect(screen.getByText(/أبيض · L/)).toBeInTheDocument();

    // الخطوة 1: العنوان والولاية
    fireEvent.click(screen.getByRole("button", { name: "متابعة إلى العنوان" }));
    await expectText("العنوان والولاية");
    // ننتظر تحميل الولايات حتى يوجد خيار value="16" فعلًا
    await screen.findByRole("option", { name: /16 - الجزائر/ });
    fireEvent.change(screen.getByLabelText("اختيار الولاية"), { target: { value: "16" } });
    fireEvent.change(screen.getByPlaceholderText("البلدية"), {
      target: { value: "الجزائر الوسطى" },
    });
    fireEvent.change(screen.getByPlaceholderText("الاسم الكامل"), {
      target: { value: "محمد أمين" },
    });
    fireEvent.change(screen.getByPlaceholderText("رقم الهاتف"), {
      target: { value: "0551234567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "متابعة إلى التوصيل" }));

    // الخطوة 2: التوصيل المنزلي — Checkout يعتمد عنواناً تفصيلياً ولا يعرض خيار الاستلام من المكتب.
    await expectText("طريقة التوصيل");
    fireEvent.change(screen.getByPlaceholderText("عنوان التوصيل التفصيلي (مطلوب للتوصيل للمنزل)"), {
      target: { value: "شارع ديدوش مراد، الجزائر الوسطى" },
    });
    fireEvent.click(screen.getByRole("button", { name: "متابعة إلى الدفع" }));

    // الخطوة 3: الدفع عند الاستلام (افتراضي)
    await expectText("طريقة الدفع");
    fireEvent.click(screen.getByRole("button", { name: "إرسال طلب الشراء" }));

    // شاشة النجاح
    await expectText("تم إرسال طلبك إلى المتاجر");
    await expectText(/رمز التتبع/);
    await waitFor(() =>
      expect(state.calls.filter((c) => c === "rpc.create_order_with_delivery")).toHaveLength(1),
    );
    // السلة فُرشت بعد الطلب
    await go(router, "/bag");
    await expectText("سلتك فارغة");
  });

  it("الملف الشخصي لمستخدم مسجّل يُرسم بحقوله وروابطه", async () => {
    // حماية من انحدار: كان `<Wallet>` مستخدمًا في الصفحة بلا استيراد، فتسقط
    // الصفحة كلها بـ ReferenceError («Wallet is not defined») بمجرد فتحها.
    setSession({ id: "user-1", email: "malik@test.dz" });
    // مستخدم عادي (بلا متجر) — لكي يبقى ملفه الشخصي (وليس استوديو التاجر)
    state.stores = [];
    const router = renderApp();
    await go(router, "/profile");

    // روابط الصفحة الداخلية حقيقية (لا href فارغ)
    const inner = Array.from(document.querySelectorAll(".max-w-xl a")).filter(
      (a) => !a.closest("nav"),
    );
    expect(inner.length).toBeGreaterThan(2);
    for (const a of inner) expect(a.getAttribute("href")).toBeTruthy();

    // فتح نموذج التعديل، ثم التحقق من حقوله وأزراره
    fireEvent.click(screen.getByRole("button", { name: /تعديل/ }));
    await expectText("تعديل الملف الشخصي");
    expect(screen.getByPlaceholderText("مثال: أحمد بن يوسف")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("05XX XX XX XX")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "حفظ التغييرات" })).toBeInTheDocument();
  });

  it("إرسال تقييم لمنتج يظهر تأكيد «قمت بتقييم هذا العنصر»", async () => {
    setSession({ id: "customer-1", email: "customer@test.dz" });
    const router = renderApp();
    await go(router, "/products/$productId", { productId: "prod-1" });

    await expectText("قيّم هذا العنصر");
    fireEvent.click(screen.getByRole("button", { name: "اختر 4 نجوم" }));
    fireEvent.click(screen.getByRole("button", { name: "إرسال التقييم" }));

    await expectText("قمت بتقييم هذا العنصر 4/5");
    await waitFor(() =>
      expect(state.calls.some((c) => c.startsWith("rpc.submit_review"))).toBe(true),
    );
    expect(state.reviews).toHaveLength(1);
  });
});
