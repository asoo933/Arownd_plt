import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n";
import { BadgeCheck, ChevronLeft, Heart, MapPin, Star } from "lucide-react";
import { formatDA, formatKm, getStoreStatus } from "@/lib/geo";
import type { OfferFull, ProductGroup, Store } from "@/lib/sooqy";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { OpenBadge } from "./badges";
import { DirectionsButton } from "./DirectionsButton";
import { RatingStars } from "./rating-stars";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/market";

/** صورة افتراضية فاخرة — ظل ناعم مع أيقونة منتَج */
const PRODUCT_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGN0Y4RjUiLz48ZGVmcz48Y2lyY2xlIGlkPSJhIiBjeD0iMTAwIiByPSIzMCIvPjxtYXNrIGlkPSJiIj48dXNlIGhcmWs9IiNhIi8+PC9tYXNrPjwvZGVmcz48ZyBmaWxsPSJub25lIiBzdHJva2U9IiNDNkYzNkIiBzdHJva2Utb3BhY2l0eT0iMC4zIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIG1hc2s9InVybCgjYikiPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjkgIiByPSIzMCIvPjxwYXRoIGQ9Ik0xMDAgODBhMTYgMTYgMCAxMCAwIDMyIiBmaWxsPSJub25lIi8+PC9nPjwvc3ZnPg==";

/** صورة افتراضية للمتاجر — أيقونة متجر بسيطة */
const STORE_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNlMmU4ZjAiLz48ZyBmaWxsPSJub25lIiBzdHJva2U9IiNDNkYzNkIiBzdHJva2Utb3BhY2l0eT0iMC4zIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjcwIiB5PSI3NSIgd2lkdGg9IjYwIiBoZWlnaHQ9IjUwIiByeD0iNCIvPjxwYXRoIGQ9Ik04MCA3NXYtMTBoMjB2MTAiLz48cmVjdCB4PSI4MCIgeT0iMTI1IiB3aWR0aD0iMTYiIGhlaWdodD0iMzAiIHJ4PSIyIi8+PHJlY3QgeD0iMTA0IiB5PSIxMjUiIHdpZHRoPSIxNiIgaGVpZ2h0PSIzMCIgcng9IjIiLz48L2c+PC9zdmc+";

/* ═══════════════ زر المفضلة ═══════════════ */
export function FavoriteButton({ kind, id, className }: { kind: "products" | "stores"; id: string; className?: string }) {
  const { t } = useTranslation();
  const favorites = useFavorites();
  const active = favorites[kind].includes(id);

  return (
    <button
      type="button"
      aria-label={active ? t("aria_favorite_remove") : t("aria_favorite_add")}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(kind, id);
      }}
      className={cn("absolute end-2 top-2 z-10 flex size-10 items-center justify-center rounded-full bg-card/90 text-foreground/80 shadow-sm backdrop-blur-sm transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
    >
      <Heart
        className={cn(
          "size-[18px] transition-colors duration-200",
          active ? "fill-current text-rose-600" : "fill-transparent text-muted-foreground",
        )}
        strokeWidth={2}
        aria-hidden="true"
      />
    </button>
  );
}

export function ProductCard({ g }: { g: ProductGroup }) {
  const { t } = useTranslation();
  const level = g.available ? (g.totalStock <= 3 ? "low" : "in") : "out";
  const rating = Number(g.product.rating) || 0;
  const best = g.bestOffer;
  const storeLocation = best?.store.commune ?? best?.store.address_line;
  const discountPct = Math.max(
    0,
    ...g.offers.map((offer) =>
      offer.old_price && offer.old_price > offer.price
        ? Math.round(((offer.old_price - offer.price) / offer.old_price) * 100)
        : 0,
    ),
  );

  return (
    <Link
      to="/products/$productId"
      params={{ productId: g.product.id }}
      preload="intent"
      className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-card transition-[border-color,box-shadow] duration-200 hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <img
          src={g.image ?? PRODUCT_PLACEHOLDER}
          alt={g.image ? g.product.name : t("product_placeholder")}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.src = PRODUCT_PLACEHOLDER;
          }}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
        />
        <FavoriteButton kind="products" id={g.product.id} />
        {discountPct > 0 && (
          <span className="absolute start-2 top-2 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
            -{discountPct}%
          </span>
        )}
        {level === "out" && (
          <span className="absolute inset-x-2 bottom-2 rounded-lg bg-background/90 px-2 py-1.5 text-center text-[11px] font-semibold text-muted-foreground backdrop-blur">
            {t("badge_stock_out")}
          </span>
        )}
      </div>

      <div className="flex min-h-[9rem] flex-1 flex-col gap-1.5 p-2.5 sm:p-3">
        <p className="line-clamp-2 min-h-10 text-[13px] font-semibold leading-5 text-foreground">
          {g.product.name}
        </p>
        {best?.store.name ? (
          <p className="truncate text-[11px] leading-4 text-muted-foreground">
            {best.store.name}
          </p>
        ) : (
          <span className="min-h-4" aria-hidden="true" />
        )}
        {storeLocation ? (
          <p className="flex min-w-0 items-center gap-1 truncate text-[10px] leading-4 text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{storeLocation}</span>
          </p>
        ) : (
          <span className="min-h-4" aria-hidden="true" />
        )}
        <div className="mt-auto flex min-h-8 items-center justify-between gap-2 border-t border-border/70 pt-1.5">
          {best ? (
            <p className="whitespace-nowrap text-sm font-extrabold tracking-tight text-accent-ink">
              {formatDA(best.price)}
            </p>
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("badge_stock_out")}
            </span>
          )}
          {rating > 0 ? (
            <span
              className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-muted-foreground"
              aria-label={t("explore_rating", { rating: rating.toFixed(1) })}
            >
              <Star className="size-3 fill-warning text-warning" aria-hidden="true" />
              <span>{rating.toFixed(1)}</span>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/** بطاقة متجر قابلة للضغط: شعار، اسم + توثيق، موقع، حالة الفتح، تقييم، ومسافة. */
export function StoreCard({ s, distance }: { s: Store; distance?: number | null }) {
  const { t } = useTranslation();
  const logoUrl = s.logo_url ?? s.cover_url ?? STORE_PLACEHOLDER;
  const status = getStoreStatus(s.opening_hours);

  return (
    <Link
      to="/stores/$storeId"
      params={{ storeId: s.id }}
      className="card-premium flex items-center gap-3 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <img
        src={logoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="size-14 shrink-0 rounded-2xl bg-muted object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-sm font-bold text-foreground">{s.name}</h3>
          {s.is_verified && (
            <BadgeCheck
              className="size-4 shrink-0 text-accent-ink"
              aria-label={t("badge_verified")}
            />
          )}
        </div>
        {(s.commune || s.address_line) && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{s.commune ?? s.address_line}</span>
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <OpenBadge detailed status={status} />
          {s.rating > 0 && <RatingStars rating={s.rating} showValue />}
          {distance != null && (
            <span className="text-caption font-semibold text-muted-foreground">
              {formatKm(distance)}
            </span>
          )}
        </div>
      </div>
      <ChevronLeft
        className="size-4 shrink-0 text-muted-foreground ltr:rotate-180"
        aria-hidden="true"
      />
    </Link>
  );
}

/** بطاقة متجر عمودية لشريط أفقي (الصفحة الرئيسية): غلاف + شعار متداخل. */
export function StoreRailCard({ s, distance }: { s: Store; distance?: number | null }) {
  const { t } = useTranslation();
  const cover = s.cover_url ?? s.logo_url ?? STORE_PLACEHOLDER;
  const logo = s.logo_url ?? STORE_PLACEHOLDER;
  const status = getStoreStatus(s.opening_hours);

  return (
    <Link
      to="/stores/$storeId"
      params={{ storeId: s.id }}
      className="card-premium group block w-56 shrink-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="relative h-24 bg-muted">
        <img
          src={cover}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <img
          src={logo}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute -bottom-5 start-3 size-11 rounded-xl border-2 border-card bg-card object-cover "
        />
      </div>
      <div className="space-y-1.5 px-3 pb-3 pt-7">
        <div className="flex items-center gap-1.5">
          <h3 className="truncate text-sm font-bold text-foreground">{s.name}</h3>
          {s.is_verified && (
            <BadgeCheck
              className="size-4 shrink-0 text-accent-ink"
              aria-label={t("badge_verified")}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <OpenBadge open={status.isOpen} />
          {distance != null && (
            <span className="text-caption font-semibold text-muted-foreground">
              {formatKm(distance)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function StoreMiniCard({ s, distance }: { s: Store; distance?: number | null }) {
  const { t } = useTranslation();
  const logoUrl = s.logo_url ?? s.cover_url ?? STORE_PLACEHOLDER;

  return (
    <div className="card-premium flex items-center p-2">
      <img src={logoUrl} alt={s.name} loading="lazy" className="size-5 rounded-md object-cover" />
      <span className="me-2 truncate text-xs text-text">{s.name}</span>
      {distance != null && (
        <span className="me-auto text-caption text-muted-foreground">
          {t("unit_km", { distance })}
        </span>
      )}
    </div>
  );
}

export function OfferCard({ offer }: { offer: OfferFull }) {
  const productImage = offer.images?.[0]?.image_url ?? PRODUCT_PLACEHOLDER;

  return (
    <div className="card-premium flex items-center p-3">
      <img
        src={productImage}
        alt={offer.product.name}
        loading="lazy"
        className="size-6 rounded-md object-cover"
      />
      <div className="me-3 min-w-0 flex-1">
        <p className="line-clamp-1 truncate text-sm text-text">{offer.product.name}</p>
        <p className="text-caption font-bold text-accent">
          {offer.price !== undefined ? formatMoney(offer.price) : formatMoney(0)}
        </p>
      </div>
    </div>
  );
}
