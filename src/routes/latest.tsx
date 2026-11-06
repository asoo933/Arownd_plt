import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { translate, useTranslation } from "@/lib/i18n";
import {
  fetchMyAccountType,
  fetchMyRoles,
  fetchMyStore,
  getStoreOffers,
  primaryImage,
  stockLevel,
} from "@/lib/sooqy";
import { formatDA } from "@/lib/geo";
import { StockBadge } from "@/components/sooqy/badges";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { PageHeader } from "@/components/sooqy/page-header";
import { DashboardLoadingSkeleton } from "@/components/sooqy/skeleton";

export const Route = createFileRoute("/latest")({
  head: () => ({
    meta: [
      { title: `${translate("studio_latest_title")} — Arownd` },
      { name: "description", content: translate("studio_latest_description") },
    ],
  }),
  component: LatestStoreProductsPage,
});

function LatestStoreProductsPage() {
  const { t } = useTranslation();
  const { user, ready } = useAuth();
  const accountType = useQuery({
    queryKey: ["my-account-type", user?.id],
    queryFn: fetchMyAccountType,
    enabled: ready && !!user,
  });
  const roles = useQuery({
    queryKey: ["my-roles"],
    queryFn: fetchMyRoles,
    enabled: ready && !!user,
  });
  const store = useQuery({
    queryKey: ["my-store"],
    queryFn: fetchMyStore,
    enabled: ready && !!user && accountType.data === "merchant",
  });
  const offers = useQuery({
    queryKey: ["my-store-offers", store.data?.id],
    queryFn: () => getStoreOffers(store.data!.id),
    enabled:
      !!store.data?.id && accountType.data === "merchant" && !!roles.data?.includes("merchant"),
  });

  if (
    !ready ||
    accountType.isLoading ||
    roles.isLoading ||
    (accountType.data === "merchant" && store.isLoading)
  ) {
    return <DashboardLoadingSkeleton cards={2} />;
  }

  if (accountType.isError || roles.isError) {
    const error = accountType.error ?? roles.error;
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        <PageHeader title={t("studio_latest_title")} back="/" />
        <ErrorState
          scope="merchant:latest-access"
          error={error}
          onRetry={async () => {
            await Promise.all([accountType.refetch(), roles.refetch()]);
          }}
        />
      </div>
    );
  }

  if (!user || accountType.data !== "merchant" || !roles.data?.includes("merchant")) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        <PageHeader title={t("studio_latest_title")} back="/" />
        <EmptyState
          Icon={PackageSearch}
          title={t("studio_latest_empty")}
          hint={t("studio_latest_empty_hint")}
          action={
            <Link to="/explore" className="btn-primary inline-flex px-5">
              {t("explore_title")}
            </Link>
          }
        />
      </div>
    );
  }

  const error = accountType.error ?? roles.error ?? store.error ?? offers.error;
  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-6">
        <PageHeader title={t("studio_latest_title")} back="/" />
        <ErrorState
          scope="merchant:latest-products"
          error={error}
          onRetry={async () => {
            await Promise.all([
              accountType.refetch(),
              roles.refetch(),
              store.refetch(),
              offers.refetch(),
            ]);
          }}
        />
      </div>
    );
  }

  const products = offers.data ?? [];
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl space-y-5 px-4 pb-28 pt-5">
      <PageHeader title={t("studio_latest_title")} back="/" />
      <p className="text-sm text-muted-foreground">{t("studio_latest_description")}</p>
      {offers.isLoading ? (
        <div
          className="grid grid-cols-2 gap-3"
          role="status"
          aria-label={t("studio_dashboard_loading")}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : products.length ? (
        <div className="grid grid-cols-2 gap-3">
          {products.map((offer) => (
            <Link
              key={offer.id}
              to="/products/$productId"
              params={{ productId: offer.product_id }}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition "
            >
              <div className="relative aspect-square bg-muted">
                {primaryImage(offer.images) ? (
                  <img
                    src={primaryImage(offer.images)!}
                    alt={offer.product.name}
                    loading="lazy"
                    className="size-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <PackageSearch className="size-9 text-muted-foreground" />
                  </div>
                )}
                <StockBadge
                  level={stockLevel(offer)}
                  className="absolute start-2 top-2 bg-card/95"
                />
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-1 text-sm font-semibold text-foreground">
                  {offer.product.name}
                </p>
                <p className="text-sm font-bold text-accent-ink">{formatDA(offer.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          Icon={PackageSearch}
          title={t("studio_latest_empty")}
          hint={t("studio_latest_empty_hint")}
          action={
            <Link to="/studio" className="btn-primary inline-flex items-center gap-2 px-5">
              <Plus className="size-4" />
              {t("studio_add_product_fast")}
            </Link>
          }
        />
      )}
    </main>
  );
}
