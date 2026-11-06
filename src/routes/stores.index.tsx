import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Store as StoreIcon, Search, SlidersHorizontal, X, Star, Shield } from "lucide-react";
import { useGeo } from "@/lib/geo";
import { fetchNearStores, searchStores, type Store } from "@/lib/sooqy";
import { StoreCard } from "@/components/sooqy/cards";
import { WilayaSelect } from "@/components/sooqy/WilayaSelect";
import { CommuneSelect } from "@/components/sooqy/CommuneSelect";
import { PageHeader } from "@/components/sooqy/page-header";
import { ListSkeleton } from "@/components/sooqy/skeleton";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { Reveal } from "@/components/sooqy/reveal";
import { SeoHead } from "@/components/seo/SeoHead";
import { translate, useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { SideSheet } from "@/components/sooqy/side-sheet";

export const Route = createFileRoute("/stores/")({
  head: () => ({
    meta: [
      { title: translate("stores_seo_title") },
      { name: "description", content: translate("stores_seo_description") },
    ],
  }),
  component: StoresPage,
});

const PAGE_SIZE = 20;

function StoresPage() {
  const { pos } = useGeo();
  const [q, setQ] = useState("");
  const [wilaya, setWilaya] = useState<number | null>(null);
  const [commune, setCommune] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const browsing = !q.trim() && !wilaya && !commune && !openOnly && !verifiedOnly && !minRating;

  // وضع التصفح: أقرب المتاجر (حسب الموقع أو الولاية)
  const nearStores = useQuery({
    queryKey: ["near-stores", wilaya, pos?.lat, pos?.lng],
    queryFn: () => fetchNearStores(wilaya, pos?.lat, pos?.lng),
    enabled: browsing,
  });

  // وضع البحث/الفلاتر: بحث حقيقي عبر searchStores
  const results = useInfiniteQuery<Store[]>({
    queryKey: [
      "search-stores",
      q,
      wilaya,
      commune,
      openOnly,
      verifiedOnly,
      minRating,
      pos?.lat,
      pos?.lng,
    ],
    queryFn: ({ pageParam }) =>
      searchStores({
        query: q.trim() || undefined,
        wilaya: wilaya ?? undefined,
        commune: commune ?? undefined,
        openOnly,
        verifiedOnly,
        minRating: minRating ?? undefined,
        sortBy: "nearest",
        limit: PAGE_SIZE,
        offset: pageParam as number,
        lat: pos?.lat ?? undefined,
        lng: pos?.lng ?? undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    enabled: !browsing,
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || browsing || !results.hasNextPage || results.isFetchingNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) results.fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    browsing,
    results.hasNextPage,
    results.isFetchingNextPage,
    q,
    wilaya,
    commune,
    openOnly,
    verifiedOnly,
    minRating,
  ]);

  const list = browsing ? (nearStores.data ?? []) : (results.data?.pages ?? []).flat();
  const loading = browsing ? nearStores.isLoading : results.isLoading;
  const error = browsing ? nearStores.error : results.error;
  const retry = browsing ? () => nearStores.refetch() : () => results.refetch();

  const hasActiveFilters = !!(wilaya || commune || openOnly || verifiedOnly || minRating);

  const { t } = useTranslation();
  return (
    <div className="space-y-4 px-4 pt-5">
      <SeoHead
        title={t("stores_title")}
        description={t("stores_description")}
        alternates={{ ar: "/stores", en: "/stores" }}
      />
      <PageHeader title={t("stores_page_title")} subtitle={t("stores_page_subtitle")} />

      {/* البحث */}
      <div className="relative">
        <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border bg-card px-4 transition focus-within:border-accent-ink focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("stores_search_placeholder")}
            aria-label={t("stores_search_aria")}
            className="h-[var(--control-height)] min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
          />
          {q && (
            <button
              aria-label={t("stores_search_clear")}
              type="button"
              onClick={() => setQ("")}
              className="text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* الفلاتر السريعة */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button
          type="button"
          aria-pressed={openOnly}
          onClick={() => setOpenOnly((v) => !v)}
          className={cn(
            "flex min-h-[var(--control-height-compact)] shrink-0 items-center gap-1 rounded-full border px-3.5 py-2 text-xs font-bold transition",
            openOnly
              ? "border-accent-ink bg-primary-soft text-accent-ink-soft-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          <StoreIcon className="size-3.5" /> {t("stores_filter_open")}
        </button>
        <button
          type="button"
          aria-pressed={verifiedOnly}
          onClick={() => setVerifiedOnly((v) => !v)}
          className={cn(
            "flex min-h-[var(--control-height-compact)] shrink-0 items-center gap-1 rounded-full border px-3.5 py-2 text-xs font-bold transition",
            verifiedOnly
              ? "border-accent-ink bg-primary-soft text-accent-ink-soft-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          <Shield className="size-3.5" /> {t("stores_filter_verified")}
        </button>
        <button
          onClick={() => setShowFilters(true)}
          className={cn(
            "flex min-h-[var(--control-height-compact)] shrink-0 items-center gap-1 rounded-full border px-3.5 py-2 text-xs font-bold transition",
            hasActiveFilters
              ? "border-accent-ink bg-primary-soft text-accent-ink-soft-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          <SlidersHorizontal className="size-3.5" /> {t("stores_filter_location")}
        </button>
      </div>

      <p className="text-xs font-medium text-muted-foreground">
        {loading ? t("stores_loading") : t("stores_count", { count: list.length })}
      </p>

      {loading && <ListSkeleton count={4} />}
      {!loading && error && <ErrorState scope="stores:list" error={error} onRetry={retry} />}
      {!loading && !error && list.length === 0 && (
        <EmptyState Icon={StoreIcon} title={t("stores_empty")} hint={t("stores_empty_hint")} />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map((s: Store, i) => (
          <Reveal key={s.id} index={i}>
            <StoreCard s={s} distance={s.distance ?? undefined} />
          </Reveal>
        ))}
      </div>
      {!browsing && results.isFetchingNextPage && <ListSkeleton count={2} />}
      {!browsing && results.isFetchNextPageError && (
        <ErrorState
          scope="stores:next-page"
          error={results.error}
          onRetry={() => void results.fetchNextPage()}
        />
      )}
      <div ref={sentinelRef} className="h-2" />

      {/* لوحة الفلاتر */}
      <SideSheet
        open={showFilters}
        onOpenChange={setShowFilters}
        title={t("stores_sheet_title")}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setWilaya(null);
                setCommune(null);
                setMinRating(null);
                setVerifiedOnly(false);
                setOpenOnly(false);
              }}
              className="btn-secondary flex-1 py-3"
            >
              {t("stores_clear_filters")}
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="btn-primary flex-1 py-3"
            >
              {t("stores_apply")}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <WilayaSelect value={wilaya} onChange={setWilaya} className="h-12 w-full" />
          <CommuneSelect
            value={commune}
            onChange={setCommune}
            wilayaId={wilaya}
            className="h-12 w-full"
          />
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            aria-pressed={minRating === 4}
            onClick={() => setMinRating(minRating === 4 ? null : 4)}
            className={cn(
              "flex min-h-[var(--control-height-compact)] w-full items-center justify-between rounded-[var(--radius-control)] border px-4 py-3 text-sm font-semibold transition",
              minRating === 4
                ? "border-accent-ink bg-primary-soft text-accent-ink-soft-foreground"
                : "border-border bg-card",
            )}
          >
            <span className="flex items-center gap-2">
              <Star className="size-4 text-accent-ink" /> {t("stores_rating_4")}
            </span>
            {minRating === 4 && <X className="size-4" />}
          </button>
          <button
            type="button"
            aria-pressed={verifiedOnly}
            onClick={() => setVerifiedOnly((v) => !v)}
            className={cn(
              "flex min-h-[var(--control-height-compact)] w-full items-center justify-between rounded-[var(--radius-control)] border px-4 py-3 text-sm font-semibold transition",
              verifiedOnly
                ? "border-accent-ink bg-primary-soft text-accent-ink-soft-foreground"
                : "border-border bg-card",
            )}
          >
            <span className="flex items-center gap-2">
              <Shield className="size-4 text-accent-ink" /> {t("stores_verified_only")}
            </span>
            {verifiedOnly && <X className="size-4" />}
          </button>
        </div>
      </SideSheet>
    </div>
  );
}
