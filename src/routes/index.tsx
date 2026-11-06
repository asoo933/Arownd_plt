import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { CategoryIcon } from "@/components/sooqy/category-icons";
import { useAuth } from "@/lib/auth";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { useGeo } from "@/lib/geo";
import { fetchUnreadNotificationCount, searchProducts, searchStores } from "@/lib/sooqy";
import { ProductCard, StoreCard } from "@/components/sooqy/cards";
import { SectionHeader, SeeAllLink } from "@/components/sooqy/section-header";
import { ProductGridSkeleton, StoreRailSkeleton } from "@/components/sooqy/skeleton";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { ArowndBrand } from "@/components/sooqy/logo";
import { SeoHead } from "@/components/seo/SeoHead";
import { WilayaButton } from "@/components/sooqy/WilayaSelect";
import { translate, useTranslation } from "@/lib/i18n";
import { MAIN_CATEGORIES } from "@/lib/taxonomy";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: translate("home_seo_title") },
      { name: "description", content: translate("home_seo_description") },
      { property: "og:title", content: translate("home_seo_title") },
      { property: "og:description", content: translate("home_seo_short") },
    ],
  }),
  component: Home,
});

function Home() {
  const { t, lang } = useTranslation();
  const { user } = useAuth();
  const { pos } = useGeo();
  const navigate = useNavigate();
  const [wilaya, setWilaya] = useState<number | null>(null);

  const unreadNotifications = useQuery({
    queryKey: ["unread-notification-count"],
    queryFn: fetchUnreadNotificationCount,
    enabled: !!user,
    staleTime: 30_000,
  });

  useRealtimeSubscription({
    table: "notifications",
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    queryKeys: [["unread-notification-count"]],
    enabled: !!user,
  });

  const changeWilaya = (value: number | null) => {
    setWilaya(value);
    try {
      if (value == null) localStorage.removeItem("sooqy:wilaya");
      else localStorage.setItem("sooqy:wilaya", String(value));
    } catch {
      /* التخزين غير متاح */
    }
  };

  useEffect(() => {
    try {
      const value = Number(localStorage.getItem("sooqy:wilaya"));
      if (Number.isInteger(value) && value >= 1 && value <= 58) setWilaya(value);
    } catch {
      /* التخزين غير متاح */
    }
  }, []);

  const productsQuery = useInfiniteQuery({
    queryKey: ["home-products", wilaya, pos?.lat, pos?.lng],
    queryFn: ({ pageParam = 0 }) =>
      searchProducts({ wilaya, pos, sortBy: "newest", limit: 20, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length * 20 : undefined,
  });

  const storesQuery = useQuery({
    queryKey: ["home-nearby-stores", wilaya, pos?.lat, pos?.lng],
    queryFn: () =>
      searchStores({
        wilaya,
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null,
        sortBy: pos ? "nearest" : "rating",
        limit: 6,
      }),
  });

  const products = (productsQuery.data?.pages ?? []).flat();
  const stores = storesQuery.data ?? [];



  return (
    <>
      <SeoHead
        title={t("home_seo_title")}
        description={t("home_seo_description")}
        keywords={t("home_seo_keywords")}
        ogType="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Arownd",
          url: "https://arownd.app",
          description: t("home_seo_short"),
          inLanguage: lang === "ar" ? "ar-DZ" : "en",
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://arownd.app/explore?q={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <main className="space-y-6 px-4 pb-8 pt-2">
        <header className="flex min-h-10 items-center justify-between gap-2">
          <ArowndBrand />
          <div className="flex items-center gap-2">
            <WilayaButton
              value={wilaya}
              onChange={changeWilaya}
              allLabel={t("home_all_wilayas")}
            />
            <Link
              to="/notifications"
              aria-label={
                unreadNotifications.data
                  ? `${t("home_notifications")} (${unreadNotifications.data})`
                  : t("home_notifications")
              }
              className="icon-btn relative size-10 min-h-10 min-w-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Bell className="size-[19px]" aria-hidden="true" />
              {!!unreadNotifications.data && unreadNotifications.data > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -end-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-caption font-extrabold leading-none text-primary-foreground"
                >
                  {unreadNotifications.data > 9 ? "9+" : unreadNotifications.data}
                </span>
              )}
            </Link>
          </div>
        </header>

        <nav
          aria-label={t("explore_categories")}
          className="no-scrollbar -mx-4 flex snap-x snap-proximity gap-2 overflow-x-auto px-4 pb-1"
        >
          {MAIN_CATEGORIES.slice(0, 6).map((category) => {
            
            return (
              <Link
                key={category.id}
                to="/category/$catId"
                params={{ catId: category.id }}
                className="flex h-[3.65rem] min-w-[8.5rem] shrink-0 snap-start items-center gap-2.5 rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent-ink">
                  <CategoryIcon categoryId={category.id} className="size-[19px]" />
                </span>
                <span className="whitespace-nowrap">{t(`category_${category.id}`)}</span>
              </Link>
            );
          })}
        </nav>

        <section className="space-y-3.5">
          <SectionHeader
            title={t("home_new_arrivals")}
            action={<SeeAllLink to="/explore" />}
          />
          {productsQuery.isLoading && <ProductGridSkeleton count={6} horizontal />}
          {productsQuery.isError && (
            <ErrorState
              scope="home:products"
              error={productsQuery.error}
              onRetry={() => void productsQuery.refetch()}
            />
          )}
          {!productsQuery.isLoading && !productsQuery.isError && products.length === 0 && (
            <EmptyState
              title={t("home_no_products")}
              hint={t("home_no_products_hint")}
            />
          )}
          {products.length > 0 && (
            <div
              role="region"
              aria-label={t("home_new_arrivals")}
              tabIndex={0}
              className="no-scrollbar -mx-4 flex snap-x snap-proximity gap-2.5 overflow-x-auto px-4 pb-1 sm:gap-3"
            >
              {products.slice(0, 12).map((group) => (
                <div
                  key={group.product.id}
                  className="w-[calc((100%-0.625rem)/2)] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/3)] lg:w-[calc((100%-2.25rem)/4)]"
                >
                  <ProductCard g={group} />
                </div>
              ))}
            </div>
          )}
          {productsQuery.hasNextPage && (
            <button
              type="button"
              onClick={() => void productsQuery.fetchNextPage()}
              disabled={productsQuery.isFetchingNextPage}
              className="btn-secondary min-h-11 w-full"
            >
              {productsQuery.isFetchingNextPage
                ? t("state_loading")
                : t("explore_load_more")}
            </button>
          )}
        </section>

        {(storesQuery.isLoading || storesQuery.isError || stores.length > 0) && (
          <section className="space-y-3">
            <SectionHeader
              title={t("home_nearby_stores")}
              subtitle={
                pos
                  ? t("home_nearby_by_location")
                  : wilaya
                    ? t("home_nearby_by_wilaya")
                    : undefined
              }
              action={<SeeAllLink to="/stores">{t("home_explore_stores")}</SeeAllLink>}
            />
            {storesQuery.isLoading && <StoreRailSkeleton count={3} />}
            {storesQuery.isError && (
              <ErrorState
                scope="home:nearby-stores"
                error={storesQuery.error}
                onRetry={() => void storesQuery.refetch()}
              />
            )}
            <div className="grid gap-2.5">
              {stores.map((store) => (
                <StoreCard
                  key={store.id}
                  s={store}
                  distance={store.distance ?? undefined}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
