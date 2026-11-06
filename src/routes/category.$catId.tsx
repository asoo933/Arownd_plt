import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Armchair, Baby, CarFront, Gift, Laptop, ArrowRight, Search, Shirt, SlidersHorizontal, Smartphone, Sparkles, Utensils, Watch, type LucideIcon } from "lucide-react";
import { useGeo } from "@/lib/geo";
import { searchProducts, type SortBy } from "@/lib/sooqy";
import {
  MAIN_CATEGORIES,
  categoryHint,
  categoryLabel,
  parentOf,
  resolveCategoryId,
} from "@/lib/taxonomy";
import { ProductCard } from "@/components/sooqy/cards";
import { CategoryIcon } from "@/components/sooqy/category-icons";
import { CategoryBreadcrumb, SubcategoryChips } from "@/components/sooqy/category-tiles";
import { ProductGridSkeleton } from "@/components/sooqy/skeleton";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { SideSheet } from "@/components/sooqy/side-sheet";
import { Reveal } from "@/components/sooqy/reveal";
import { cn } from "@/lib/utils";
import { SeoHead } from "@/components/seo/SeoHead";
import { goBackOrTo } from "@/lib/nav";
import { useTranslation, translate } from "@/lib/i18n";

const PAGE_SIZE = 24;

export const Route = createFileRoute("/category/$catId")({
  head: ({ params }) => ({}),
  component: CategoryPage,
});

function CategoryPage() {
  const { catId } = Route.useParams();
  const { t, lang } = useTranslation();
  const sorts: { id: SortBy; label: string }[] = [
    { id: "newest", label: t("category_sort_newest") },
    { id: "cheapest", label: t("category_sort_cheapest") },
    { id: "rating", label: t("category_sort_rating") },
  ];
  const nearestSort: { id: SortBy; label: string } = { id: "nearest", label: t("category_sort_nearest") };
  const { pos } = useGeo();
  const router = useRouter();
  const [sort, setSort] = useState<SortBy>("newest");
  const [inStock, setInStock] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // `searchProducts` يوسّع التصنيف الرئيسي إلى كل فئاته الفرعية تلقائيًا
  const products = useInfiniteQuery({
    queryKey: ["category", catId, sort, inStock, pos?.lat],
    queryFn: ({ pageParam }) =>
      searchProducts({
        category: catId,
        sortBy: sort,
        inStockOnly: inStock,
        pos,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = products;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, catId, sort, inStock]);

  const list = (products.data?.pages ?? []).flat();
  const active = resolveCategoryId(catId);
  const current = parentOf(active);
  const otherMains = MAIN_CATEGORIES.filter((c) => c.id !== current?.id).slice(0, 6);


  const catLabel = categoryLabel(catId);
  const catHint = categoryHint(current?.id) || t("category_seo_fallback", { category: catLabel });

  return (
    <>
      <SeoHead
        title={catLabel}
        description={catHint}
        keywords={t("category_keywords", { category: catLabel })}
        ogType="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: catLabel,
          numberOfItems: list.length,
          description: catHint,
          inLanguage: lang === "ar" ? "ar-DZ" : "en-DZ",
        }}
      />
      <div className="space-y-5 px-4 pt-3">
        <header className="flex items-start gap-3 py-1">
          <button
            onClick={() => goBackOrTo(router, "/explore")}
            aria-label={t("category_back")}
            className="icon-btn shrink-0"
          >
            <ArrowRight className="size-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-accent-ink"><CategoryIcon categoryId={current?.id ?? active} className="size-6" /></span>
            <div className="min-w-0">
              <h1 className="truncate text-h1 text-foreground">{catLabel}</h1>
              {categoryHint(current?.id) && (
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {categoryHint(current?.id)}
                </p>
              )}
            </div>
          </div>
        </header>

        <CategoryBreadcrumb categoryId={catId} />

        {/* الفئات الفرعية للتصنيف الرئيسي */}
        <SubcategoryChips categoryId={catId} />

        {/* الترتيب والفلاتر */}
        <div className="flex items-center justify-between gap-2">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {(pos ? [...sorts, nearestSort] : sorts).map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={sort === s.id}
                onClick={() => setSort(s.id)}
                className={cn(
                  "min-h-10 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors",
                  sort === s.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-1 rounded-xl border px-3 text-xs font-bold",
              inStock
                ? "border-accent-ink bg-primary-soft text-accent-ink-soft-foreground"
                : "border-border bg-card text-foreground",
            )}
          >
            <SlidersHorizontal className="size-3.5" /> {t("category_filters")}
          </button>
        </div>

        <p className="text-xs font-medium text-muted-foreground">
          {products.isLoading
            ? t("category_loading")
            : `${t("category_product_count", { count: list.length })}${products.hasNextPage ? "+" : ""}`}
        </p>

        {products.isLoading && <ProductGridSkeleton count={6} />}
        {products.isError && (
          <ErrorState
            scope="category:list"
            error={products.error}
            onRetry={() => void products.refetch()}
          />
        )}
        {!products.isLoading && !products.isError && list.length === 0 && (
          <EmptyState
            Icon={Search}
            title={t("category_empty_title")}
            hint={t("category_empty_hint")}
          />
        )}
        <div className="grid grid-cols-2 gap-2.5">
          {list.map((g, i) => (
            <Reveal key={g.product.id} index={i}>
              <ProductCard g={g} />
            </Reveal>
          ))}
        </div>
        {products.isFetchingNextPage && <ProductGridSkeleton count={2} />}
        {products.isFetchNextPageError && (
          <ErrorState
            scope="category:next-page"
            error={products.error}
            onRetry={() => void products.fetchNextPage()}
          />
        )}
        <div ref={sentinelRef} className="h-2" />

        {/* استكشاف تصنيفات أخرى */}
        <section className="space-y-2 border-t border-border pt-4 pb-2">
          <h2 className="text-xs font-bold text-muted-foreground">{t("category_other_heading")}</h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {otherMains.map((c) => {
              return (
                <Link
                  key={c.id}
                  to="/category/$catId"
                  params={{ catId: c.id }}
                  className="card-premium flex min-h-11 shrink-0 items-center gap-1.5 !rounded-full px-4 text-xs font-bold text-muted-foreground"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-accent-ink">
                    <CategoryIcon categoryId={c.id} className="size-4" />
                  </span>
                  {c.label}
                </Link>
              );
            })}
          </div>
        </section>

        {/* لوحة الفلاتر */}
        <SideSheet
          open={showFilters}
          onOpenChange={setShowFilters}
          title={t("category_filters_title")}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setInStock(false);
                  setShowFilters(false);
                }}
                className="btn-secondary flex-1 py-3"
              >
                {t("category_clear")}
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="btn-primary flex-1 py-3"
              >
                {t("category_apply")}
              </button>
            </div>
          }
        >
          <label className="flex min-h-12 items-center justify-between rounded-xl border border-border px-4 py-3 text-sm font-semibold">
            {t("category_in_stock_only")}
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="size-5 accent-primary"
            />
          </label>
        </SideSheet>
      </div>
    </>
  );
}
