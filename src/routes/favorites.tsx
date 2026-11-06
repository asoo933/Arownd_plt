import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Heart } from "lucide-react";
import { useGeo } from "@/lib/geo";
import {
  getProductComparisonOffers,
  getStore,
  pickBestOffer,
  primaryImage,
  storeDistance,
  type ProductGroup,
  type Store,
} from "@/lib/sooqy";
import { useFavorites } from "@/lib/favorites";
import { ProductCard, StoreCard } from "@/components/sooqy/cards";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { ProductGridSkeleton, ListSkeleton } from "@/components/sooqy/skeleton";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { SeoHead } from "@/components/seo/SeoHead";
import { goBackOrTo } from "@/lib/nav";

export const Route = createFileRoute("/favorites")({
  head: () => ({}),
  component: FavoritesPage,
});

function FavoritesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const favs = useFavorites();
  const { pos } = useGeo();
  const [tab, setTab] = useState<"products" | "stores">("products");

  const products = useQuery({
    queryKey: ["fav-products", favs.products],
    queryFn: async (): Promise<ProductGroup[]> => {
      return Promise.all(
        favs.products.map(async (id): Promise<ProductGroup> => {
          const offers = await getProductComparisonOffers(id);
          const product = offers[0]?.product;
          if (!product) throw new Error("no offers");
          // نفس قاعدة الحقيقة: أرخص عرض **متاح**، لا أرخص عرض نافد.
          const bestOffer = pickBestOffer(offers);
          return {
            product,
            offers,
            bestOffer,
            minPrice: bestOffer ? bestOffer.price : 0,
            image: primaryImage(offers.flatMap((o) => o.images)),
            available: offers.some((o) => o.stock_quantity > 0),
            totalStock: offers.reduce((s, o) => s + o.stock_quantity, 0),
            nearestKm: null,
          };
        }),
      );
    },
    enabled: favs.products.length > 0,
  });

  const stores = useQuery({
    queryKey: ["fav-stores", favs.stores],
    queryFn: async (): Promise<Store[]> => {
      const results = await Promise.all(favs.stores.map((id) => getStore(id)));
      return results.filter((s): s is Store => !!s);
    },
    enabled: favs.stores.length > 0,
  });

  return (
    <>
      <SeoHead
        title={t("fav_title")}
        description={t("fav_description")}
        keywords={t("fav_keywords")}
        ogType="website"
      />
      <div className="space-y-4 px-4 pb-6 pt-4">
        <header className="flex items-center gap-2 py-1">
          <button
            onClick={() => goBackOrTo(router, "/profile")}
            aria-label={t("common_back")}
            className="icon-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-5 rtl:rotate-180" />
          </button>
          <h1 className="text-h1 text-foreground">{t("fav_heading")}</h1>
        </header>

        {/* التبويبات */}
        <div role="tablist" className="flex rounded-[var(--radius-control)] bg-card p-1">
          {(
            [
              { id: "products", label: t("fav_tab_products", { count: favs.products.length }) },
              { id: "stores", label: t("fav_tab_stores", { count: favs.stores.length }) },
            ] as const
          ).map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={tab === tb.id}
              onClick={() => setTab(tb.id)}
              className={cn(
                "min-h-[var(--control-height-compact)] flex-1 rounded-[var(--radius-medium)] py-2 text-sm font-bold transition",
                tab === tb.id ? "bg-primary text-accent-ink-foreground" : "text-muted-foreground",
              )}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {tab === "products" &&
          (favs.products.length === 0 ? (
            <EmptyState
              Icon={Heart}
              title={t("fav_empty_products")}
              hint={t("fav_empty_products_hint")}
              action={
                <Link to="/explore" className="btn-primary">
                  {t("fav_discover_products")}
                </Link>
              }
            />
          ) : (
            <>
              {products.isLoading && <ProductGridSkeleton count={4} />}
              {products.isError && (
                <ErrorState
                  scope="favorite-products"
                  error={products.error}
                  onRetry={() => products.refetch()}
                />
              )}
              {!products.isLoading && !products.isError && products.data?.length === 0 && (
                <EmptyState
                  Icon={Heart}
                  title={t("fav_empty_products")}
                  hint={t("fav_empty_products_hint")}
                  action={
                    <Link to="/explore" className="btn-primary">
                      {t("fav_discover_products")}
                    </Link>
                  }
                />
              )}
              {!products.isError && products.data && products.data.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {(products.data ?? []).map((g) => (
                    <ProductCard key={g.product.id} g={g} />
                  ))}
                </div>
              )}
            </>
          ))}

        {tab === "stores" &&
          (favs.stores.length === 0 ? (
            <EmptyState
              Icon={Heart}
              title={t("fav_empty_stores")}
              hint={t("fav_empty_stores_hint")}
              action={
                <Link to="/map" className="btn-primary">
                  {t("fav_explore_map")}
                </Link>
              }
            />
          ) : (
            <>
              {stores.isLoading && <ListSkeleton count={3} />}
              {stores.isError && (
                <ErrorState
                  scope="favorite-stores"
                  error={stores.error}
                  onRetry={() => stores.refetch()}
                />
              )}
              {!stores.isLoading && !stores.isError && stores.data?.length === 0 && (
                <EmptyState
                  Icon={Heart}
                  title={t("fav_empty_stores")}
                  hint={t("fav_empty_stores_hint")}
                  action={
                    <Link to="/map" className="btn-primary">
                      {t("fav_explore_map")}
                    </Link>
                  }
                />
              )}
              {!stores.isError && stores.data && stores.data.length > 0 && (
                <div className="space-y-3">
                  {(stores.data ?? []).map((s) => (
                    <StoreCard key={s.id} s={s} distance={storeDistance(s, pos)} />
                  ))}
                </div>
              )}
            </>
          ))}
      </div>
    </>
  );
}
