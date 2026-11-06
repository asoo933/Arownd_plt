import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ImageOff,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  ShoppingBag,
  Star,
  Timer,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDA, formatKm, useGeo, isOpenNow } from "@/lib/geo";
import {
  getProduct,
  getProductComparisonOffers,
  incrementProductView,
  primaryImage,
  searchProducts,
  stockLevel,
  storeDistance,
  type OfferFull,
} from "@/lib/sooqy";
import { useAuth } from "@/lib/auth";
import { bagItemKey, useBag } from "@/lib/bag";
import { useTranslation } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { StockBadge, OpenBadge, VerifiedBadge } from "@/components/sooqy/badges";
import { QtyStepper } from "@/components/sooqy/qty-stepper";
import { FavoriteButton, ProductCard } from "@/components/sooqy/cards";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ReviewSection } from "@/components/sooqy/ReviewSection";
import { ReportContentButton } from "@/components/moderation/ReportContentButton";
import { DirectionsButton } from "@/components/sooqy/DirectionsButton";
import { cn } from "@/lib/utils";
import { categoryLabel } from "@/lib/taxonomy";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { SeoHead } from "@/components/seo/SeoHead";
import { ProductDetailSkeleton } from "@/components/sooqy/skeleton";
import { ErrorState } from "@/components/sooqy/error-state";
import { goBackOrTo } from "@/lib/nav";
import { telUrl, whatsappUrl } from "@/lib/contact";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { shareRemoteImage, shareTextContent } from "@/lib/native-sharing";

export const Route = createFileRoute("/products/$productId")({
  head: () => ({}),
  component: ProductPage,
});

function ProductPage() {
  const { productId } = Route.useParams();
  const { pos } = useGeo();
  const { user } = useAuth();
  const bag = useBag();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();

  const product = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId),
  });
  const offers = useQuery({
    queryKey: ["offers", productId],
    queryFn: () => getProductComparisonOffers(productId),
  });

  const sorted = useMemo(
    () =>
      (offers.data ?? [])
        .map((o) => ({ ...o, distance: storeDistance(o.store, pos) }))
        .sort(
          (a, b) =>
            Number(stockLevel(b) !== "out") - Number(stockLevel(a) !== "out") || a.price - b.price,
        ),
    [offers.data, pos],
  );

  useRealtimeSubscription({ table: "store_offers", filter: "product_id=eq." + productId, queryKeys: [["offers", productId], ["product", productId]] });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // لا نعرض عروض المتجر المملوك للمستخدم ضمن خيارات الشراء أو الحجز.
  const ownOffers = user ? sorted.filter((o) => o.store.owner_id === user.id) : [];
  const purchasableOffers = sorted.filter((o) => !user || o.store.owner_id !== user.id);
  const isOwnProduct = ownOffers.length > 0 && purchasableOffers.length === 0;
  const selected =
    purchasableOffers.find((o) => o.id === selectedId) ??
    purchasableOffers[0] ??
    (isOwnProduct ? ownOffers[0] : undefined);
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [bagPulse, setBagPulse] = useState(0);

  const opts = (selected?.options ?? {}) as { sizes?: string[]; colors?: string[] };

  useEffect(() => {
    track("view_product", { productId });
    incrementProductView(productId).catch(() => {});
  }, [productId]);
  useEffect(() => {
    setSize(opts.sizes?.[0] ?? "");
    setColor(opts.colors?.[0] ?? "");
    setImgIdx(0);
    setQty(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const images = useMemo(() => {
    const all = sorted.flatMap((o) => o.images.map((i) => i.image_url));
    const first = primaryImage(selected?.images);
    return [...new Set([first, ...all].filter(Boolean) as string[])];
  }, [sorted, selected]);

  // safe index
  const safeIdx = images.length ? Math.min(imgIdx, images.length - 1) : 0;
  useEffect(() => {
    if (imgIdx > Math.max(0, images.length - 1)) setImgIdx(0);
  }, [images.length, imgIdx]);

  const touchStartX = useRef<number | null>(null);

  if (product.isLoading || offers.isLoading) return <ProductDetailSkeleton />;
  if (product.isError)
    return (
      <div className="p-8 text-center">
        <ErrorState
          scope="product:details"
          error={product.error}
          onRetry={() => product.refetch()}
        />
      </div>
    );
  if (!product.data)
    return (
      <div className="p-8 text-center">
        <ErrorState
          title={t("product_not_found")}
          hint={t("product_not_found_hint")}
          onRetry={() => navigate({ to: "/explore" })}
        />
      </div>
    );

  const p = product.data;
  const chosen: Record<string, string> = {};
  if (size) chosen[t("product_size_option")] = size;
  if (color) chosen[t("product_color_option")] = color;
  // For the merchant's own listing, availability can be disabled to hide it from buyers.
  // The detail page must still reflect the real inventory quantity, not that visibility flag.
  const level = selected
    ? isOwnProduct
      ? selected.stock_quantity <= 0
        ? "out"
        : selected.stock_quantity <= 3
          ? "low"
          : "in"
      : stockLevel(selected)
    : "out";

  const availableOffers = purchasableOffers.filter((o) => stockLevel(o) !== "out");
  const pricePool = availableOffers.length ? availableOffers : purchasableOffers;
  const firstPrice = purchasableOffers[0]?.price ?? 0;
  const lowPrice = pricePool.length ? Math.min(...pricePool.map((o) => o.price)) : 0;
  const highPrice = pricePool.length ? Math.max(...pricePool.map((o) => o.price)) : 0;

  // الاكتشاف الذكي: وسوم تُشتق من البيانات المتاحة فقط (لا بيانات مختلقة)
  const bestPriceId =
    availableOffers.length > 1 && lowPrice < highPrice
      ? (availableOffers.find((o) => o.price === lowPrice)?.id ?? null)
      : null;
  const offersWithDistance = availableOffers.filter(
    (o): o is typeof o & { distance: number } => o.distance != null,
  );
  const nearestId =
    offersWithDistance.length > 1
      ? offersWithDistance.reduce((a, b) => (a.distance <= b.distance ? a : b)).id
      : null;

  const discount =
    selected?.old_price && selected.old_price > selected.price
      ? Math.round(((selected.old_price - selected.price) / selected.old_price) * 100)
      : 0;

  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || undefined,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    offers: purchasableOffers.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "DZD",
          lowPrice,
          highPrice,
          offerCount: purchasableOffers.length,
        }
      : undefined,
    image: images.slice(0, 5),
  };

  const share = async () => {
    const url = window.location.href;
    const text = t("product_share_text", { name: p.name, price: formatDA(firstPrice) });
    try {
      const shared = await shareTextContent({ title: p.name, text, url });
      if (!shared) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        toast.success(t("product_link_copied"));
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error(t("product_link_copy_failed"));
      }
    }
  };

  const shareImage = async () => {
    if (!zoomSrc) return;
    try {
      const shared = await shareRemoteImage(zoomSrc, p.name);
      if (!shared) {
        await navigator.clipboard.writeText(zoomSrc);
        toast.success(t("product_link_copied"));
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error(t("product_share_image_error"));
      }
    }
  };

  const addToBag = () => {
    if (!selected) return;
    bag.add({
      offerId: selected.id,
      quantity: qty,
      options: chosen,
      price: selected.price,
      name: selected.product.name,
      productId: selected.product_id,
    });
    setBagPulse((n) => n + 1);
    track("add_to_bag", { offerId: selected.id, quantity: qty, price: selected.price });
    toast.success(t("product_added_to_bag"));
  };

  const buyNow = () => {
    if (!selected) return;
    // "اشترِ الآن" يعني الكمية المختارة فقط — لا نجمعها فوق ما في السلة سابقًا.
    bag.remove(bagItemKey({ offerId: selected.id, options: chosen }));
    bag.add({
      offerId: selected.id,
      quantity: qty,
      options: chosen,
      price: selected.price,
      name: selected.product.name,
      productId: selected.product_id,
    });
    track("buy_now", { offerId: selected.id, quantity: qty, price: selected.price });
    navigate({ to: "/checkout" });
  };

  const waText = (o: OfferFull) =>
    t("product_whatsapp_text", {
      name: p.name,
      price: formatDA(o.price),
      size: size ? t("product_whatsapp_size", { size }) : "",
      color: color ? t("product_whatsapp_color", { color }) : "",
    });

  // الرجوع: إن فُتحت الصفحة برابط مباشر (لا سجل سابق) نعود للرئيسية بدل زر لا يفعل شيئًا.
  const goBack = () => goBackOrTo(router, "/");

  const goPrev = () => setImgIdx((i) => (i > 0 ? i - 1 : images.length - 1));
  const goNext = () => setImgIdx((i) => (i < images.length - 1 ? i + 1 : 0));

  const mainImage = images.length ? images[safeIdx] : null;

  return (
    <>
      <SeoHead
        title={p.name}
        description={
          p.description?.slice(0, 150) || t("product_meta_description", { name: p.name })
        }
        ogImage={primaryImage(selected?.images) ?? images[0] ?? undefined}
        ogType="product"
        keywords={t("product_keywords", { name: p.name, brand: p.brand || "" })}
        jsonLd={productJsonLd}
      />
      <div className="pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+3rem)]">
        {/* Hero image */}
        <section className="relative bg-muted">
          <div
            className="relative aspect-square w-full overflow-hidden sm:aspect-square"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current == null) return;
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(dx) > 40) {
                if (dx > 0) goPrev();
                else goNext();
              }
              touchStartX.current = null;
            }}
          >
            {mainImage ? (
              <button
                onClick={() => setZoomSrc(mainImage)}
                aria-label={t("product_zoom_image", { n: safeIdx + 1 })}
                className="block size-full"
              >
                <img
                  src={mainImage}
                  alt={t("product_image_alt", { name: p.name, n: safeIdx + 1 })}
                  loading="eager"
                  decoding="async"
                  className="size-full object-cover transition-opacity"
                />
              </button>
            ) : (
              <div className="flex size-full items-center justify-center">
                <ImageOff className="size-10 text-muted-foreground" />
              </div>
            )}

            {/* top overlays */}
            <button
              onClick={goBack}
              aria-label={t("aria_back")}
              className="absolute top-4 start-4 z-10 flex size-11 items-center justify-center rounded-full bg-card/90 backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95"
            >
              <ArrowRight className="size-5" />
            </button>
            <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
              <button
                onClick={share}
                aria-label={t("aria_share")}
                className="flex size-11 items-center justify-center rounded-full bg-card/90 text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95"
              >
                <Share2 className="size-5" />
              </button>
              <FavoriteButton kind="products" id={p.id} className="static size-11 shrink-0" />
            </div>

            {images.length > 1 && (
              <>
                <button
                  onClick={goPrev}
                  aria-label={t("aria_prev")}
                  className="absolute top-1/2 start-3 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95"
                >
                  <ChevronRight className="size-5" />
                </button>
                <button
                  onClick={goNext}
                  aria-label={t("aria_next")}
                  className="absolute top-1/2 end-3 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center">
                  <span className="rounded-full bg-card/90 px-3 py-1 text-caption font-semibold text-foreground backdrop-blur">
                    {safeIdx + 1} / {images.length}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* thumbnails */}
          {images.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto bg-background px-4 py-3">
              {images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setImgIdx(i)}
                  aria-label={t("product_zoom_image", { n: i + 1 })}
                  className={cn(
                    "shrink-0 size-16 overflow-hidden rounded-xl border-2 transition active:scale-95",
                    i === safeIdx
                      ? "border-primary"
                      : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <img
                    src={src}
                    alt={t("product_image_alt", { name: p.name, n: i + 1 })}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Product info */}
        <div className="space-y-5 px-4 pt-4">
          <section className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-extrabold leading-tight tracking-tight text-foreground">
                  {p.name}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <StockBadge level={level} />
                <ReportContentButton targetType="product" targetId={p.id} label={t("product_report_action")} />
              </div>
            </div>
            {selected && (
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("product_price_label")}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-3xl font-black tracking-tight text-foreground">
                      {formatDA(selected.price)}
                    </span>
                    {selected.old_price && selected.old_price > selected.price && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatDA(selected.old_price)}
                      </span>
                    )}
                    {discount > 0 && (
                      <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
                        -{discount}%
                      </span>
                    )}
                  </div>
                </div>
                {purchasableOffers.length > 1 && (
                  <span className="rounded-xl bg-muted px-3 py-2 text-caption font-semibold text-muted-foreground">
                    {t("product_available_in", {
                      count: purchasableOffers.length,
                      min: formatDA(purchasableOffers[0]!.price),
                      max: formatDA(purchasableOffers[purchasableOffers.length - 1]!.price),
                    })}
                  </span>
                )}
              </div>
            )}
            {selected && (
              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-muted/60 px-3 py-2.5">
                <Timer className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <p className="text-caption leading-relaxed text-muted-foreground">
                  {t("product_stock_confirmed")}{" "}
                  {selected.last_confirmed_at
                    ? formatDistanceToNow(new Date(selected.last_confirmed_at), {
                        addSuffix: true,
                        locale: ar,
                      })
                    : t("product_stock_not_confirmed")}{" "}
                  · {selected.store.name}
                </p>
              </div>
            )}
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-sm font-semibold text-foreground">{t("product_delivery_title")}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("product_delivery_desc")}</p>
            </div>
            {p.description && (
              <p className="mt-3 border-t border-border pt-3 text-sm leading-7 text-muted-foreground">
                {p.description}
              </p>
            )}
          </section>
          {/* Card 2: product options and attributes */}
          {!isOwnProduct && <section className="space-y-4 rounded-[var(--radius-card)] border border-border bg-card p-4">
            <div className="grid grid-cols-2 gap-3">
              {p.brand && <SpecRow label={t("product_brand_label")} value={p.brand} />}
              {p.category && <SpecRow label={t("product_category_label")} value={categoryLabel(p.category)} />}
            </div>
            {opts.colors?.length ? (
              <OptionRow
                label={t("product_color_option")}
                values={opts.colors}
                value={color}
                onChange={setColor}
              />
            ) : null}
            {opts.sizes?.length ? (
              <OptionRow
                label={t("product_size_option")}
                values={opts.sizes}
                value={size}
                onChange={setSize}
              />
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">{t("product_quantity")}</span>
              <QtyStepper
                value={qty}
                onChange={setQty}
                max={Math.min(selected?.stock_quantity ?? 10, 10)}
              />
            </div>
          </section>}

          {/* Specs / delivery info */}




          {!isOwnProduct && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">{t("product_where_to_find")}</h2>
            {user && sorted.some((o) => o.store.owner_id === user.id) && purchasableOffers.length === 0 && (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground">
                {t("product_own_store_notice")}
                <Link to="/studio" className="ms-1 text-accent-ink underline underline-offset-2">
                  {t("product_manage_action")}
                </Link>
              </div>
            )}
            {offers.isError && (
              <ErrorState
                scope="product:offers"
                error={offers.error}
                onRetry={() => offers.refetch()}
              />
            )}
            {purchasableOffers.map((o) => {
              const lv = stockLevel(o);
              return (
                <div
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className={cn(
                    "cursor-pointer space-y-3 rounded-3xl border-2 bg-card p-4  transition-all duration-200 active:scale-[var(--scale-pressed)]",
                    selected?.id === o.id ? "border-primary" : "border-transparent",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <Link
                        to="/stores/$storeId"
                        params={{ storeId: o.store_id }}
                        onClick={(e) => e.stopPropagation()}
                        className="font-bold text-foreground"
                      >
                        {o.store.name}
                      </Link>
                      {(o.id === bestPriceId || o.id === nearestId) && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {o.id === bestPriceId && (
                            <span className="tag-smart">{t("product_tag_best_price")}</span>
                          )}
                          {o.id === nearestId && (
                            <span className="tag-smart">{t("product_tag_nearest")}</span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <OpenBadge open={isOpenNow(o.store.opening_hours)} />
                        {o.store.is_verified && <VerifiedBadge />}
                        {o.distance != null && (
                          <span className="font-semibold text-foreground">
                            {formatKm(o.distance)}
                          </span>
                        )}
                        {o.store.commune && <span>{o.store.commune}</span>}
                      </div>
                    </div>
                    <div className="text-end">
                      <p className="text-lg font-bold text-foreground">{formatDA(o.price)}</p>
                      {o.id === bestPriceId && highPrice > lowPrice && (
                        <p className="mb-1 text-caption font-semibold text-success">
                          {t("product_saves", { amount: formatDA(highPrice - lowPrice) })}
                        </p>
                      )}
                      <StockBadge level={lv} />
                    </div>
                  </div>
                  {(() => {
                    // أزرار الاتصال تظهر فقط عند توفر الوسيلة (لا أزرار ميتة لمتجر بلا رقم)
                    const tel = telUrl(o.store.phone);
                    const wa = whatsappUrl(o.store.whatsapp, waText(o));
                    const hasMap = o.store.latitude != null && o.store.longitude != null;
                    const count = (tel ? 1 : 0) + (wa ? 1 : 0) + (hasMap ? 1 : 0);
                    if (count === 0) return null;
                    return (
                      <div
                        className="grid gap-2"
                        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tel && (
                          <a
                            href={tel}
                            className="flex min-h-[var(--control-height)] items-center justify-center gap-1 rounded-full bg-muted text-xs font-semibold text-foreground transition active:scale-95"
                          >
                            <Phone className="size-3.5" /> {t("product_call")}
                          </a>
                        )}
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-h-[var(--control-height)] items-center justify-center gap-1 rounded-full bg-success-soft text-xs font-semibold text-success transition active:scale-95"
                          >
                            <MessageCircle className="size-3.5" /> {t("product_whatsapp")}
                          </a>
                        )}
                        {hasMap && (
                          <DirectionsButton
                            lat={o.store.latitude}
                            lng={o.store.longitude}
                            label={o.store.name}
                            className="flex min-h-[var(--control-height)] items-center justify-center gap-1 rounded-full bg-secondary text-xs font-semibold text-secondary-foreground transition active:scale-95"
                          >
                            <Navigation className="size-3.5" /> {t("product_directions")}
                          </DirectionsButton>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
            <div className="mt-4 border-t border-border pt-4">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-caption text-muted-foreground">{t("product_price_label")}</p>
                          <p className="text-xl font-extrabold text-foreground">
                            {selected ? formatDA(selected.price * qty) : "—"}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!selected || level === "out"}
                          onClick={addToBag}
                          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition disabled:opacity-45 active:scale-[var(--scale-pressed)]"
                          aria-label={t("product_add_to_bag")}
                        >
                          <ShoppingBag key={bagPulse} className="size-4 animate-pop" />
                        </button>
                        <button
                          type="button"
                          disabled={!selected || level === "out"}
                          onClick={buyNow}
                          className="flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition disabled:opacity-45 active:scale-[var(--scale-pressed)]"
                        >
                          {t("product_buy_now")}
                        </button>
                      </div>
              
            </div>
          </section>
          )}
                    {isOwnProduct && (
            <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground">
              {t("product_own_store_notice")}
              <Link to="/studio" className="ms-1 text-accent-ink underline underline-offset-2">
                  {t("product_manage_action")}
              </Link>
            </div>
          )}
          {!isOwnProduct && <ReviewSection targetType="product" targetId={p.id} title={t("product_reviews_title")} />}
        </div>
      </div>



      <Dialog open={!!zoomSrc} onOpenChange={(o) => !o && setZoomSrc(null)}>
        <DialogContent
          hideCloseButton
          className="max-w-full border-0 bg-background/95 p-0 sm:max-w-lg"
        >
          {zoomSrc && (
            <img
              src={zoomSrc}
              alt={p.name}
              loading="lazy"
              decoding="async"
              className="max-h-[85vh] w-full object-contain"
            />
          )}
          {zoomSrc && (
            <button
              onClick={() => void shareImage()}
              className="absolute top-3 start-3 flex size-10 items-center justify-center rounded-full bg-card/90 text-foreground backdrop-blur"
              aria-label={t("aria_share")}
            >
              <Share2 className="size-4" />
            </button>
          )}
          <button
            onClick={() => setZoomSrc(null)}
            className="absolute top-3 end-3 flex size-9 items-center justify-center rounded-full bg-card/90 text-foreground backdrop-blur"
            aria-label={t("aria_close")}
          >
            <X className="size-4" />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OptionRow({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={cn(
              "min-h-[var(--touch-target-size)] min-w-[var(--touch-target-size)] rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-[var(--scale-pressed)]",
              v === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground text-end">{value}</span>
    </div>
  );
}
