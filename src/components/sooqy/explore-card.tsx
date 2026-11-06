import { useState } from "react";
import { ChevronLeft, ChevronRight, Heart, Star, ShoppingBag } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { useBag } from "@/lib/bag";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { formatDA } from "@/lib/geo";
import type { ProductGroup } from "@/lib/sooqy";
import { cn } from "@/lib/utils";

const PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iMTAwMCIgdmlld0JveD0iMCAwIDgwMCAxMDAwIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjEwMDAiIGZpbGw9IiNGN0Y4RjUiLz48ZGVmcz48Y2lyY2xlIGlkPSJhIiBjeD0iNDAwIiBjeT0iNTAwIiByPSIxNDAiLz48bWFzayBpZD0iYiI+PHVzZSBocmVmPSIjYSIgLz48L21hc2s+PC9kZWZzPjpnIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0M2RjM2QiIgc3Ryb2tlLW9wYWNpdHk9IjAuMyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBtYXNrPSJ1cmwoI2IpIj48Y2lyY2xlIGN4PSI0MDAiIGN5PSI0ODAiIHI9IjE0MCIvPjxwYXRoIGQ9Ik00MDAgMzYwYTE2MCAxNjAgMCAxMCAzMjAgMCIgZmlsbD0ibm9uZSIvPjwvZz48L3N2Zz4=";

type Props = {
  group: ProductGroup;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/**
 * بطاقة الاكتشاف الكبيرة — منتج واحد في كل مرة، مستوحاة من عرض المنشورات.
 * الصورة تملأ العرض، وأزرار السابق/التالي في منتصف الصورة عمودياً على جانبيها.
 */
export function DiscoveryCard({ group, canPrev, canNext, onPrev, onNext }: Props) {
  const { t } = useTranslation();
  const bag = useBag();
  const navigate = useNavigate();
  const { product, bestOffer, image, minPrice, available, totalStock, offers } = group;

  const [imageFailed, setImageFailed] = useState(false);
  const favs = useFavorites();
  const active = favs.products.includes(product.id);

  const level = available ? (totalStock <= 3 ? "low" : "in") : "out";
  const rating = offers.length ? Math.max(...offers.map((o) => Number(o.store.rating) || 0)) : 0;

  const src = image ?? PLACEHOLDER;

  const addToBag = () => {
    if (!bestOffer || level === "out") {
      toast.error(t("explore_product_unavailable"));
      return;
    }
    bag.add({
      offerId: bestOffer.id,
      quantity: 1,
      options: {},
      price: bestOffer.price,
      name: bestOffer.product.name,
      productId: product.id,
    });
    toast.success(t("product_added_to_bag"));
  };

  const buyNow = () => {
    if (!bestOffer || level === "out") {
      toast.error(t("explore_product_unavailable"));
      return;
    }
    const opts = (bestOffer.options ?? {}) as Record<string, unknown>;
    const hasMandatory =
      (Array.isArray(opts["sizes"]) && (opts["sizes"] as unknown[]).length > 0) ||
      (Array.isArray(opts["colors"]) && (opts["colors"] as unknown[]).length > 0);
    if (hasMandatory) {
      navigate({ to: "/products/$productId", params: { productId: product.id } });
      return;
    }
    bag.add({
      offerId: bestOffer.id,
      quantity: 1,
      options: {},
      price: bestOffer.price,
      name: bestOffer.product.name,
      productId: product.id,
    });
    toast.success(t("product_added_to_bag"));
    navigate({ to: "/checkout" });
  };

  const disabled = !bestOffer || level === "out";

  return (
    <article className="mx-auto flex max-h-[calc(100dvh-8rem)] w-full flex-col gap-3 overflow-hidden rounded-[1.75rem] border border-border/70 bg-card p-3 shadow-soft sm:p-4">
      {/* opening the product details page when tapping the image */}
      <a
        href={`/products/${product.id}`}
        className="block"
        onClick={(e) => {
          e.preventDefault();
          navigate({ to: "/products/$productId", params: { productId: product.id } });
        }}
      >
        <div className="group relative aspect-[4/5] max-h-[45vh] w-full overflow-hidden rounded-2xl bg-muted sm:aspect-[5/4] sm:max-h-[420px]">
          {image ? (
            <img
              src={imageFailed ? PLACEHOLDER : src}
              alt={t("product_image_alt", { name: product.name, n: 1 })}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="size-full object-cover object-center"
            />
          ) : (
            <div className="size-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
              <Star className="size-12 text-muted-foreground" />
            </div>
          )}

          {/* التنقل بين المنتجات — أعلى الصورة، منتظمان عمودياً (يسار = سابق، يمين = التالي) ولا يتبادلان الأدوار مع اتجاه اللغة */}
          {canPrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              aria-label={t("aria_prev")}
              className="absolute end-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          {canNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              aria-label={t("aria_next")}
              className="absolute start-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="size-5" />
            </button>
          )}

          <button
            type="button"
            aria-label={active ? t("aria_favorite_remove") : t("aria_favorite_add")}
            aria-pressed={active}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite("products", product.id);
            }}
            className={cn(
              "absolute end-3 top-3 z-20 flex size-11 items-center justify-center rounded-full border bg-card/95 text-muted-foreground shadow-md backdrop-blur-md transition-all duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              active
                ? "border-primary/40 text-primary"
                : "border-border/80 hover:border-primary/30",
            )}
          >
            <Heart
              className={cn(
                "size-[21px] transition-colors duration-200",
                active ? "fill-primary text-primary" : "fill-transparent text-current",
              )}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>
        </div>
      </a>

      <div className="min-w-0 space-y-2 px-1 pb-1">
        <h2 className="line-clamp-2 text-base font-extrabold leading-snug text-foreground sm:text-lg">
          {product.name}
        </h2>
        {product.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}
        {rating > 0 && (
          <div className="flex items-center gap-1.5">
            <Star className="size-3.5 fill-warning text-warning" />
            <span className="text-sm font-bold text-foreground">{rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">{t("product_store_rating")}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-2">
          <span className="text-xl font-black tracking-tight text-accent-ink">
            {formatDA(minPrice)}
          </span>
          {level === "out" && (
            <span className="rounded-lg bg-black/60 text-[10px] font-bold text-white px-2 py-0.5 backdrop-blur-sm">
              {t("stock_out")}
            </span>
          )}
        </div>
        <div className="mt-1 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addToBag();
            }}
            disabled={disabled}
            className={cn(
              "btn-primary w-full justify-center gap-2",
              disabled && "opacity-60 pointer-events-none",
            )}
          >
            <ShoppingBag className="size-5" />
            {disabled ? t("explore_product_unavailable") : t("product_add_to_bag")}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              buyNow();
            }}
            disabled={disabled}
            className={cn(
              "btn-secondary w-full justify-center gap-2",
              disabled && "opacity-60 pointer-events-none",
            )}
          >
            {t("product_buy_now")}
          </button>
        </div>
      </div>
    </article>
  );
}
