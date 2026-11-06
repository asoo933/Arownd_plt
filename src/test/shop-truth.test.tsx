import { act, render, screen, waitFor } from "@testing-library/react";
import {
  RouterProvider,
  createRouter,
  createMemoryHistory,
  type Router,
} from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { resetSupabaseFake, setSession, state } from "./supabase-fake";
import { evaluateBag } from "@/lib/bag-check";
import { bagItemKey, sanitizeBagItems } from "@/lib/bag";
import { pickBestOffer, type BagItem, type OfferFull, type Product, type Store } from "@/lib/sooqy";

// استبدال عميل Supabase الحقيقي بالـfake (لا شبكة، بيانات ثابتة)
vi.mock("@/integrations/supabase/client", async () => {
  const { fakeSupabase } = await import("./supabase-fake");
  return { supabase: fakeSupabase };
});
vi.mock("@/components/sooqy/Splash", () => ({ Splash: () => null }));
vi.mock("@/components/sooqy/OnboardingGate", () => ({ OnboardingGate: () => null }));
vi.mock("@/lib/screen-error", () => ({}));

// ---------- مصانع بيانات ----------

const product: Product = {
  id: "prod-1",
  name: "حذاء رياضي",
  brand: "نايك",
  category: "shoes",
  description: null,
  created_at: "2026-01-01T00:00:00Z",
  created_by: null,
  rating: 0,
  view_count: 0,
};

const store = { id: "store-1", name: "متجر التجربة" } as unknown as Store;

function makeOffer(over: Partial<OfferFull> = {}): OfferFull {
  return {
    id: "offer-1",
    product_id: "prod-1",
    store_id: "store-1",
    price: 1000,
    old_price: null,
    stock_quantity: 5,
    is_available: true,
    is_merchant_hidden: false,
    options: {},
    created_at: "2026-01-01T00:00:00Z",
    last_confirmed_at: "2026-01-01T00:00:00Z",
    product,
    store,
    images: [],
    ...over,
  };
}

function makeItem(over: Partial<BagItem> = {}): BagItem {
  return {
    offerId: "offer-1",
    quantity: 1,
    options: {},
    price: 1000,
    name: "حذاء رياضي",
    productId: "prod-1",
    ...over,
  };
}

describe("هوية عناصر السلة — المنتج وخياراته", () => {
  it("يحافظ على المقاسات والألوان المختلفة كعناصر مستقلة", () => {
    const rows = sanitizeBagItems([
      makeItem({ options: { color: "أسود", size: "M" } }),
      makeItem({ options: { color: "أبيض", size: "L" }, quantity: 2 }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.quantity)).toEqual([1, 2]);
    expect(rows.map((row) => row.options)).toEqual([
      { color: "أسود", size: "M" },
      { color: "أبيض", size: "L" },
    ]);
  });

  it("يدمج تكرار الخيار نفسه حتى لو اختلف ترتيب مفاتيح الخيارات", () => {
    const rows = sanitizeBagItems([
      makeItem({ options: { color: "أسود", size: "M" }, quantity: 2 }),
      makeItem({ options: { size: "M", color: "أسود" }, quantity: 3 }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.quantity).toBe(5);
    expect(bagItemKey(rows[0]!)).toBe(
      bagItemKey(makeItem({ options: { size: "M", color: "أسود" } })),
    );
  });
});

// ---------- اختيار العرض الأفضل ----------

describe("سعر واحد للجميع — pickBestOffer", () => {
  it("يختار الأرخص المتاح ويتجاهل العرض النافد الأرخص", () => {
    const out = makeOffer({ id: "out", price: 500, stock_quantity: 0, is_available: false });
    const inStock = makeOffer({ id: "in", price: 1200, stock_quantity: 3 });
    const best = pickBestOffer([out, inStock]);
    expect(best?.id).toBe("in");
    expect(best?.price).toBe(1200);
  });

  it("يعود للأرخص إجمالًا إذا لم يوجد أي عرض متاح", () => {
    const out = makeOffer({ id: "out", price: 500, stock_quantity: 0, is_available: false });
    const out2 = makeOffer({ id: "out2", price: 700, stock_quantity: 0, is_available: false });
    expect(pickBestOffer([out, out2])?.id).toBe("out");
  });

  it("يعود null لمجموعة فارغة", () => {
    expect(pickBestOffer([])).toBeNull();
  });

  it("يفضّل الأرخص بين العروض المتاحة مهما كان الترتيب", () => {
    const a = makeOffer({ id: "a", price: 900, stock_quantity: 2 });
    const b = makeOffer({ id: "b", price: 700, stock_quantity: 2 });
    expect(pickBestOffer([a, b])?.id).toBe("b");
  });
});

// ---------- تقييم السلة ----------

describe("تقييم السلة — evaluateBag", () => {
  it("عنصر سليم بلا مشاكل", () => {
    const res = evaluateBag([makeItem()], [makeOffer()]);
    expect(res.hasBlocking).toBe(false);
    expect(res.blockingCount).toBe(0);
    expect(res.subtotal).toBe(1000);
  });

  it("العرض المحذوف يُبلّغ عنه كـ missing", () => {
    const res = evaluateBag([makeItem()], []);
    expect(res.rows[0]?.issue?.kind).toBe("missing");
    expect(res.hasBlocking).toBe(true);
  });

  it("لا يُبلّغ عن مفقود قبل اكتمال تحميل العروض", () => {
    const res = evaluateBag([makeItem()], undefined);
    expect(res.loaded).toBe(false);
    expect(res.rows[0]?.issue).toBeNull();
    expect(res.hasBlocking).toBe(false);
  });

  it("العرض غير المتاح يمنع الشراء", () => {
    const res = evaluateBag([makeItem()], [makeOffer({ is_available: false })]);
    expect(res.rows[0]?.issue?.kind).toBe("unavailable");
    expect(res.hasBlocking).toBe(true);
  });

  it("نفاد المخزون يمنع الشراء", () => {
    const res = evaluateBag([makeItem()], [makeOffer({ stock_quantity: 0 })]);
    expect(res.rows[0]?.issue?.kind).toBe("out_of_stock");
    expect(res.hasBlocking).toBe(true);
  });

  it("الكمية الأكبر من المتاح تمنع الشراء", () => {
    const res = evaluateBag([makeItem({ quantity: 5 })], [makeOffer({ stock_quantity: 2 })]);
    expect(res.rows[0]?.issue?.kind).toBe("over_stock");
    expect(res.hasBlocking).toBe(true);
  });

  it("يجمع كميات خيارات العرض نفسه عند التحقق من المخزون", () => {
    const res = evaluateBag(
      [
        makeItem({ quantity: 6, options: { size: "M" } }),
        makeItem({ quantity: 6, options: { size: "L" } }),
      ],
      [makeOffer({ stock_quantity: 10 })],
    );

    expect(res.rows.every((row) => row.issue?.kind === "over_stock")).toBe(true);
    expect(res.hasBlocking).toBe(true);
  });

  it("تغيّر السعر تحذير غير حاجب — والمجموع بال السعر الجديد", () => {
    const res = evaluateBag([makeItem({ price: 1000 })], [makeOffer({ price: 1500 })]);
    const changed = res.rows[0]?.issues.find((i) => i.kind === "price_changed");
    expect(changed).toBeDefined();
    expect(changed?.blocking).toBe(false);
    expect(res.hasBlocking).toBe(false);
    expect(res.subtotal).toBe(1500);
  });

  it("السعر نفسه بلا تحذير", () => {
    const res = evaluateBag([makeItem({ price: 1000 })], [makeOffer({ price: 1000 })]);
    expect(res.rows[0]?.issues.find((i) => i.kind === "price_changed")).toBeUndefined();
  });

  it("عدّ العناصر الحاجبة يعكس العدد الصحيح", () => {
    // "a" سليم · "b" غير متاح · "c" لا يوجد له عرض إطلاقًا
    const res = evaluateBag(
      [makeItem({ offerId: "a" }), makeItem({ offerId: "b" }), makeItem({ offerId: "c" })],
      [makeOffer({ id: "a" }), makeOffer({ id: "b", is_available: false })],
    );
    expect(res.blockingCount).toBe(2);
    expect(res.hasBlocking).toBe(true);
    expect(res.rows[0]?.issue).toBeNull();
    expect(res.rows[1]?.issue?.kind).toBe("unavailable");
    expect(res.rows[2]?.issue?.kind).toBe("missing");
  });
});

// ---------- سلوك الواجهة ----------

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
}

describe("السلة — منع الشراء غير الممكن", () => {
  beforeEach(() => {
    resetSupabaseFake();
    localStorage.clear();
  });

  it("السلة تعرض سبب التعذّر وتُعطّل متابعة الطلب", async () => {
    setSession({ id: "user-1", email: "malik@test.dz" });
    // نضع عنصرًا في السلة ثم نجعل العرض غير متاح في قاعدة البيانات.
    localStorage.setItem(
      "sooqy:bag",
      JSON.stringify([
        { offerId: "offer-1", quantity: 1, options: {}, price: 2500, name: "حذاء رياضي" },
      ]),
    );
    state.offers = [{ ...state.offers[0], is_available: false }];

    const router = renderApp("/bag");

    await waitFor(() =>
      expect(screen.getAllByText(/بعض المنتجات تحتاج تعديلًا/).length).toBeGreaterThan(0),
    );
    // لا يظهر زر متابعة الطلب — ويظهر بدله توضيح السبب.
    expect(screen.queryByRole("link", { name: /متابعة الطلب/ })).toBeNull();
    expect(screen.getAllByText(/عالج المنتجات غير المتاحة/).length).toBeGreaterThan(0);
  });

  it("السلة السليمة تعرض متابعة الطلب", async () => {
    setSession({ id: "user-1", email: "malik@test.dz" });
    localStorage.setItem(
      "sooqy:bag",
      JSON.stringify([
        { offerId: "offer-1", quantity: 1, options: {}, price: 2500, name: "حذاء رياضي" },
      ]),
    );

    const router = renderApp("/bag");

    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: /متابعة الطلب/ }).length).toBeGreaterThan(0),
    );
  });
});
