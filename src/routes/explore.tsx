import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { MapPinned, Search, ShoppingBag } from "lucide-react";
import { CategoryIcon } from "@/components/sooqy/category-icons";
import { useGeo } from "@/lib/geo";
import { searchProducts, type SortBy } from "@/lib/sooqy";
import { ProductCard } from "@/components/sooqy/cards";
import { SearchField } from "@/components/sooqy/search-field";
import { ProductGridSkeleton } from "@/components/sooqy/skeleton";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { useBag } from "@/lib/bag";
import { useTranslation } from "@/lib/i18n";
import { MAIN_CATEGORIES } from "@/lib/taxonomy";
import { SeoHead } from "@/components/seo/SeoHead";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;
const SORTS: SortBy[] = ["newest", "cheapest", "rating"];

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
  }),
  head: () => ({}),
  component: ExplorePage,
});

function ExplorePage() {
  const { t } = useTranslation();
  const { pos } = useGeo();
  const bag = useBag();
  const navigate = useNavigate();
  const { q = "" } = Route.useSearch();
  const [query, setQuery] = useState(q);
  const [sort, setSort] = useState<SortBy>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => setQuery(q), [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = query.trim();
      if (next !== q) {
        void navigate({
          to: "/explore",
          search: (previous) => ({ ...previous, q: next || undefined }),
          replace: true,
        });
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [navigate, q, query]);

  const products = useInfiniteQuery({
    queryKey: ["explore-products", q, sort, inStockOnly, pos?.lat, pos?.lng],
    queryFn: ({ pageParam }) =>
      searchProducts({
        query: q,
        sortBy: sort,
        inStockOnly,
        pos,
        limit: PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = products;
  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const list = (products.data?.pages ?? []).flat();
  const countText = t("explore_products_count", { count: list.length });

  return (
    <>
      <SeoHead
        title={t("explore_title")}
        description={t("explore_description")}
      />
      <main className="space-y-5 px-4 pb-6 pt-4">
        <header className="space-y-0.5">
          <h1 className="text-h1 text-foreground">{t("explore_heading")}</h1>
          <p className="text-xs text-muted-foreground">
            {t("explore_description")}
          </p>
        </header>

        <Link
          to="/map"
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 text-sm font-extrabold text-foreground shadow-sm transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MapPinned className="size-5 text-accent-ink" aria-hidden="true" />
          {t("explore_open_map")}
        </Link>

        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t("explore_search_placeholder")}
          className="sticky top-2 z-20"
        />

        <nav
          aria-label={t("explore_categories")}
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        >
          {MAIN_CATEGORIES.map((category) => {
            return (
            <Link
              key={category.id}
              to="/category/$catId"
              params={{ catId: category.id }}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-ink" aria-hidden="true"><CategoryIcon categoryId={category.id} className="size-[18px]" /></span>
              {t(`category_${category.id}`)}
            </Link>
          );})}
        </nav>

        <section aria-label={t("explore_filters_title")} className="space-y-3">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {SORTS.map((item) => {
              const label =
                item === "newest"
                  ? t("explore_sort_newest")
                  : item === "cheapest"
                    ? t("explore_sort_cheapest")
                    : t("explore_sort_rating");
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={sort === item}
                  onClick={() => setSort(item)}
                  className={cn(
                    "min-h-10 shrink-0 rounded-full border px-4 text-xs font-semibold transition-colors",
                    sort === item
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={inStockOnly}
              onClick={() => setInStockOnly((current) => !current)}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 text-xs font-bold transition",
                inStockOnly
                  ? "border-accent-ink bg-primary-soft text-accent-ink-soft-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {t("explore_chip_in_stock")}
            </button>
          </div>
          {!products.isLoading && !products.isError && (
            <p className="text-xs font-medium text-muted-foreground">
              {countText}
            </p>
          )}
        </section>

        {products.isLoading && <ProductGridSkeleton count={6} />}
        {products.isError && (
          <ErrorState
            scope="explore:products"
            error={products.error}
            onRetry={() => void products.refetch()}
          />
        )}
        {!products.isLoading && !products.isError && list.length === 0 && (
          <EmptyState
            Icon={Search}
            title={q ? t("explore_no_results") : t("explore_empty_title")}
            hint={q ? t("explore_no_results_hint") : t("explore_empty_hint")}
          />
        )}
        {list.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {list.map((group) => (
              <ProductCard key={group.product.id} g={group} />
            ))}
          </div>
        )}
        {products.isFetchingNextPage && <ProductGridSkeleton count={4} />}
        {products.isFetchNextPageError && (
          <ErrorState
            scope="explore:next-page"
            error={products.error}
            onRetry={() => void products.fetchNextPage()}
          />
        )}
        {hasNextPage && !products.isFetchingNextPage && (
          <button
            type="button"
            onClick={() => void products.fetchNextPage()}
            className="btn-secondary min-h-11 w-full"
          >
            {t("explore_load_more")}
          </button>
        )}
        <div ref={sentinelRef} aria-hidden="true" className="h-1" />

        {bag.count > 0 && (
          <Link
            to="/bag"
            className="fixed bottom-[calc(var(--nav-height)+1rem)] end-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
            {t("explore_view_bag")} · {bag.count}
          </Link>
        )}
      </main>
    </>
  );
}
