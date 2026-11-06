import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Clock,
  Eye,
  Facebook,
  Heart,
  Instagram,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  Search,
  Settings,
  Share2,
  Star,
  Store,
} from "lucide-react";
import { formatKm, isOpenNow, useGeo, type OpeningHours } from "@/lib/geo";
import { formatMoney, getMarketForLang } from "@/lib/market";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  categoryLabel,
  getStore,
  getStoreOffers,
  primaryImage,
  stockLevel,
  storeDistance,
  filterAndSortStoreOffers,
  type StoreOfferSort,
} from "@/lib/sooqy";
import { useFavorites, toggleFavorite } from "@/lib/favorites";
import { OpenBadge, StockBadge, VerifiedBadge } from "@/components/sooqy/badges";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { ReviewSection } from "@/components/sooqy/ReviewSection";
import { ReportContentButton } from "@/components/moderation/ReportContentButton";
import { DirectionsButton } from "@/components/sooqy/DirectionsButton";
import { StoreDetailSkeleton } from "@/components/sooqy/skeleton";
import { cn } from "@/lib/utils";
import { SeoHead } from "@/components/seo/SeoHead";
import { telUrl, whatsappUrl } from "@/lib/contact";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { shareTextContent } from "@/lib/native-sharing";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/stores/$storeId")({
  head: () => ({}),
  component: StorePage,
});

type Tab = "products" | "about" | "reviews";

/** يكمل الرابط إن أُدخل بدون بروتوكول (instagram.com/... أو @handle). */
function socialHref(url: string) {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

function StorePage() {
  const { storeId } = Route.useParams();
  const { pos } = useGeo();
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const days = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : "en-DZ", {
      weekday: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2024, 0, 7 + index))),
  );
  const [tab, setTab] = useState<Tab>("products");
  const [productSearch, setProductSearch] = useState("");
  const [productSort, setProductSort] = useState<StoreOfferSort>("newest");
  const [open, setOpen] = useState(false);
  const favs = useFavorites();
  const store = useQuery({ queryKey: ["store", storeId], queryFn: () => getStore(storeId) });
  useRealtimeSubscription({ table: "store_offers", filter: "store_id=eq." + storeId, queryKeys: [["store", storeId], ["store-offers", storeId]] });
  const offers = useQuery({
    queryKey: ["store-offers", storeId],
    queryFn: () => getStoreOffers(storeId),
  });

  // Keep the first render deterministic: opening status is evaluated after hydration.
  useEffect(() => {
    if (store.data) setOpen(isOpenNow(store.data.opening_hours));
  }, [store.data?.opening_hours]);

  const market = getMarketForLang(lang);

  if (store.isLoading) return <StoreDetailSkeleton />;

  const s = store.data;
  // فشل الشبكة ≠ متجر غير موجود: الأول يُعاد جلبه، والثاني يعرض بدائل
  if (store.isError)
    return (
      <div className="p-8 text-center">
        <ErrorState scope="store:page" error={store.error} onRetry={() => store.refetch()} />
      </div>
    );
  if (!s)
    return (
      <div className="space-y-4 p-8 text-center">
        <EmptyState
          Icon={Store}
          title={t("store_not_found_title")}
          hint={t("store_not_found_hint")}
        />
        <Link to="/stores" className="btn-primary inline-flex px-6">
          {t("store_browse_stores")}
        </Link>
      </div>
    );
  const oh = (s.opening_hours ?? {}) as OpeningHours;
  const distance = storeDistance(s, pos);
  const followed = favs.stores.includes(s.id);
  // مالِك المتجر يرى صفحته كما يراها الزائر + شريط اختصارات إدارية
  const isOwner = !!user && s.owner_id === user.id;

  const visibleOffers = filterAndSortStoreOffers(offers.data ?? [], productSearch, productSort);
  const byCat = new Map<string, typeof visibleOffers>();
  for (const o of visibleOffers) {
    const k = o.product.category;
    byCat.set(k, [...(byCat.get(k) ?? []), o]);
  }

  const share = async () => {
    const url = window.location.href;
    try {
      const shared = await shareTextContent({ title: s.name, text: s.name, url });
      if (!shared) {
        await navigator.clipboard.writeText(url);
        toast.success(t("store_link_copied"));
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error(t("store_share_failed"));
      }
    }
  };

  return (
    <>
      <SeoHead
        title={s.name}
        description={
          s.description?.slice(0, 150) ||
          t("store_meta_description", { name: s.name })
        }
        ogImage={s.cover_url ?? s.logo_url ?? undefined}
        ogType="website"
        keywords={t("store_keywords", { name: s.name })}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: s.name,
          description: s.description || undefined,
          image: s.cover_url || s.logo_url,
          telephone: s.phone ?? undefined,
          address: {
            "@type": "PostalAddress",
            addressLocality: s.commune || undefined,
            addressRegion: s.wilaya_id ? String(s.wilaya_id) : undefined,
            addressCountry: "DZ",
          },
          openingHoursSpecification: Object.entries(s.opening_hours ?? {}).map(([day, h]) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: `https://schema.org/${day}`,
            opens: h.open,
            closes: h.close,
          })),
          aggregateRating: s.rating
            ? {
                "@type": "AggregateRating",
                ratingValue: s.rating,
                reviewCount: 0,
              }
            : undefined,
        }}
      />
      <div className="pb-6">
        {/* شريط المالك — يظهر لك وحدك، وال visiting visitors لا يرونه */}
        {isOwner && (
          <div className="flex flex-wrap items-center gap-2 bg-primary-soft px-4 py-2.5 text-accent-ink-soft-foreground">
            <Eye className="size-4 shrink-0" />
            <p className="min-w-0 flex-1 text-xs font-bold">{t("store_owner_preview")}</p>
            <Link
              to="/studio/settings"
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground transition active:scale-95"
            >
              <Settings className="size-3.5" /> {t("store_customize")}
            </Link>
            <Link
              to="/studio"
              className="flex items-center gap-1 rounded-full border border-accent-ink/40 px-3 py-1 text-xs font-bold transition active:scale-95"
            >
              <Store className="size-3.5" /> {t("store_dashboard")}
            </Link>
          </div>
        )}

        {/* الغلاف */}
        <div className="relative h-40 overflow-hidden bg-muted sm:h-52">
          {s.cover_url && (
            <img
              src={s.cover_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
          <button
            onClick={share}
            aria-label={t("store_share_aria")}
            className="absolute top-4 end-4 z-10 flex size-10 items-center justify-center rounded-full bg-card/95  backdrop-blur transition active:scale-95"
          >
            <Share2 className="size-5" />
          </button>
          <div className="absolute -bottom-9 start-4 size-18 overflow-hidden rounded-[var(--radius-card)] border-4 border-background bg-card ">
            {s.logo_url ? (
              <img
                src={s.logo_url}
                alt={s.name}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-2xl font-bold text-accent-ink">
                {s.name[0]}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 px-4 pt-12">
          {/* الاسم والحالة */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="min-w-0 flex-1 text-h1 font-extrabold tracking-tight text-foreground">{s.name}</h1>
            {!isOwner && (
              <ReportContentButton targetType="store" targetId={s.id} label={t("store_report")} />
            )}
          </div>
          <div className="space-y-2">
            {s.description && <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{s.description}</p>}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <OpenBadge open={open} />
              {s.is_verified && <VerifiedBadge />}
              {Number(s.rating) > 0 && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Star className="size-3 text-warning" /> {Number(s.rating).toFixed(1)}
                </span>
              )}
              {distance != null && (
                <span className="flex items-center gap-0.5 font-bold text-foreground">
                  <MapPin className="size-3 text-muted-foreground" /> {formatKm(distance)}
                </span>
              )}
            </div>
          </div>

          {/* الأزرار */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                const nowFollowing = toggleFavorite("stores", s.id);
                toast.success(nowFollowing ? t("store_follow_added") : t("store_follow_removed"));
              }}
              className={cn(
                "flex min-h-11 items-center justify-center gap-1 rounded-[var(--radius-control)] border px-2 text-xs font-semibold transition active:scale-95",
                followed
                  ? "border-accent-ink bg-primary-soft text-accent-ink-soft-foreground"
                  : "border-border bg-card text-foreground",
              )}
            >
              <Heart className={cn("size-3.5 shrink-0", followed && "fill-accent-ink text-accent-ink")} />
              {followed ? t("store_unfollow") : t("store_follow")}
            </button>
            <DirectionsButton
              lat={s.latitude}
              lng={s.longitude}
              label={s.name}
              className="flex min-h-11 items-center justify-center gap-1 rounded-[var(--radius-control)] border border-border bg-card px-2 text-xs font-semibold text-foreground transition active:scale-95"
            >
              <Navigation className="size-3.5 shrink-0" />
              {t("store_directions")}
            </DirectionsButton>
            {whatsappUrl(s.whatsapp) ? (
              <a
                href={whatsappUrl(s.whatsapp)!}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center justify-center gap-1 rounded-[var(--radius-control)] bg-success-soft px-2 text-xs font-semibold text-success transition active:scale-95"
              >
                <MessageCircle className="size-3.5 shrink-0" />
                {t("store_whatsapp")}
              </a>
            ) : telUrl(s.phone) ? (
              <a
                href={telUrl(s.phone)!}
                className="flex min-h-11 items-center justify-center gap-1 rounded-[var(--radius-control)] bg-success-soft px-2 text-xs font-semibold text-success transition active:scale-95"
              >
                <Phone className="size-3.5 shrink-0" />
                {t("store_call")}
              </a>
            ) : (
              <span
                aria-disabled="true"
                className="flex min-h-11 items-center justify-center gap-1 rounded-[var(--radius-control)] border border-border bg-muted px-2 text-xs font-semibold text-muted-foreground"
              >
                <MessageCircle className="size-4" />
                {t("store_no_phone")}
              </span>
            )}
          </div>

          {/* التبويبات */}
          <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur">
            <div className="flex gap-1">
              {(
                [
                  { id: "products", label: t("store_tab_products") },
                  { id: "about", label: t("store_tab_about") },
                  { id: "reviews", label: t("store_tab_reviews") },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative flex-1 py-3 text-sm font-bold transition",
                    tab === t.id ? "text-accent-ink" : "text-muted-foreground",
                  )}
                >
                  {t.label}
                  {tab === t.id && (
                    <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* المنتجات */}
          {tab === "products" && (
            <div className="space-y-4">
              {!offers.isLoading && !offers.isError && !!offers.data?.length && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder={t("store_product_search_placeholder")}
                      aria-label={t("store_product_search_aria")}
                      className="h-11 w-full rounded-[var(--radius-control)] border border-border bg-card ps-10 pe-3 text-sm outline-none transition focus:border-accent-ink focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("store_product_count", { count: visibleOffers.length })}
                    </p>
                    <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <span>{t("store_sort_label")}</span>
                      <select
                        value={productSort}
                        onChange={(event) => setProductSort(event.target.value as StoreOfferSort)}
                        aria-label={t("store_sort_label")}
                        className="min-h-9 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-foreground"
                      >
                        <option value="newest">{t("store_sort_newest")}</option>
                        <option value="price-asc">{t("store_sort_price_asc")}</option>
                        <option value="price-desc">{t("store_sort_price_desc")}</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}
              {offers.isError && (
                <ErrorState
                  scope="store:offers"
                  error={offers.error}
                  onRetry={() => offers.refetch()}
                />
              )}
              {offers.isLoading && (
                <div className="grid grid-cols-2 gap-3" aria-label={t("store_loading_products")}>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-56 animate-pulse rounded-[var(--radius-card)] bg-muted"
                    />
                  ))}
                </div>
              )}
              {[...byCat.entries()].map(([cat, list]) => (
                <section key={cat} className="space-y-2">
                  <h2 className="text-section text-foreground">{categoryLabel(cat)}</h2>
                  <div className="grid grid-cols-2 gap-2.5">
                    {list.map((o) => (
                      <Link
                        key={o.id}
                        to="/products/$productId"
                        params={{ productId: o.product_id }}
                        className="card-premium group overflow-hidden"
                      >
                        <div className="relative aspect-square bg-muted">
                          {primaryImage(o.images) && (
                            <img
                              src={primaryImage(o.images)!}
                              alt={o.product.name}
                              loading="lazy"
                              className="size-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          )}
                          <StockBadge
                            level={stockLevel(o)}
                            className="absolute top-2 start-2 bg-card/95"
                          />
                          {isOwner && (
                            <span className="absolute top-2 end-2 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-bold text-accent-ink shadow-sm">
                              {t("store_owner_product_badge")}
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="line-clamp-1 text-sm font-semibold">{o.product.name}</p>
                          <p className="text-price text-accent-ink">{formatMoney(o.price, market)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
              {!offers.isLoading && !offers.isError && !!offers.data?.length && visibleOffers.length === 0 && (
                <EmptyState Icon={Store} title={t("store_product_search_empty_title")} hint={t("store_product_search_empty_hint")} />
              )}
              {!offers.isLoading && !offers.isError && !offers.data?.length && (
                <EmptyState
                  Icon={Store}
                  title={isOwner ? t("store_owner_empty_title") : t("store_empty_title")}
                  hint={
                    isOwner
                      ? t("store_owner_empty_hint")
                      : t("store_empty_hint")
                  }
                  action={
                    isOwner ? (
                      <Link to="/studio" className="btn-primary inline-flex items-center gap-1.5">
                        <Plus className="size-4" /> {t("store_add_product")}
                      </Link>
                    ) : undefined
                  }
                />
              )}
            </div>
          )}

          {/* حول المتجر */}
          {tab === "about" && (
            <div className="space-y-4">
              {s.description && (
                <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
                  <p className="text-body text-foreground">{s.description}</p>
                </div>
              )}
              <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
                <h3 className="text-section text-foreground">{t("store_location")}</h3>
                <p className="mt-2 flex items-start gap-2 text-body text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent-ink" />
                  {[s.address_line, s.commune].filter(Boolean).join("، ")}
                </p>
              </div>
              <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-section text-foreground">
                    <Clock className="size-4 text-accent-ink" /> {t("store_hours")}
                  </h3>
                  <OpenBadge open={open} />
                </div>
                <div className="mt-3 space-y-1.5">
                  {days.map((d, i) => {
                    const closed = oh.closed_days?.includes(i);
                    return (
                      <div key={d} className="flex items-center justify-between text-sm">
                        <span className={closed ? "text-muted-foreground/60" : ""}>{d}</span>
                        <span
                          className={
                            closed
                              ? "font-semibold text-danger"
                              : i === new Date().getDay()
                                ? "font-bold text-accent-ink"
                                : "font-semibold text-foreground"
                          }
                        >
                          {closed ? t("store_closed") : `${oh.open} - ${oh.close}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
                <h3 className="text-section text-foreground">{t("store_contact")}</h3>
                {s.phone && (
                  <a
                    href={telUrl(s.phone) ?? undefined}
                    className="mt-2 flex items-center gap-2 text-body text-muted-foreground"
                  >
                    <Phone className="size-4 text-accent-ink" /> {s.phone}
                  </a>
                )}
                {whatsappUrl(s.whatsapp) && (
                  <a
                    href={whatsappUrl(s.whatsapp)!}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center gap-2 text-body text-muted-foreground"
                  >
                    <MessageCircle className="size-4 text-success" /> {t("store_whatsapp")}
                  </a>
                )}
                {(s.instagram_url || s.facebook_url) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {s.instagram_url && (
                      <a
                        href={socialHref(s.instagram_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-primary hover:text-primary-foreground"
                      >
                        <Instagram className="size-3.5" /> {t("store_instagram")}
                      </a>
                    )}
                    {s.facebook_url && (
                      <a
                        href={socialHref(s.facebook_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-primary hover:text-primary-foreground"
                      >
                        <Facebook className="size-3.5" /> {t("store_facebook")}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* التقييمات */}
          {tab === "reviews" && (
            <ReviewSection targetType="store" targetId={s.id} title={t("store_reviews_title")} />
          )}
        </div>
      </div>
    </>
  );
}
