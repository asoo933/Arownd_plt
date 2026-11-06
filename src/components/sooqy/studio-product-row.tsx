import { Image as ImageIcon, Package, Pencil, Trash2 } from "lucide-react";
import { StockBadge } from "@/components/sooqy/badges";
import { QtyStepper } from "@/components/sooqy/qty-stepper";
import { formatDA } from "@/lib/geo";
import { useTranslation } from "@/lib/i18n";
import { primaryImage, inventoryLevel, type OfferFull } from "@/lib/sooqy";
import { cn } from "@/lib/utils";

/**
 * صف منتج في استوديو التاجر — تصميم "إدارة سريعة":
 * صورة + اسم + سعر + حالة المخزون، تعديل سريع للكمية، مفتاح ظهور للعملاء،
 * وإجراءات نصية واضحة بأهداف لمس 44px. لا منطق بيانات هنا (الأب ينفّذ العمليات).
 */
export function StudioProductRow({
  offer,
  busy = false,
  onStockChange,
  onToggle,
  onEdit,
  onImages,
  onDelete,
}: {
  offer: OfferFull;
  busy?: boolean;
  onStockChange: (next: number) => void;
  onToggle: () => void;
  onEdit: () => void;
  onImages: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const img = primaryImage(offer.images);
  const level = inventoryLevel(offer);

  return (
    <article className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-3" aria-busy={busy}>
      <div className="flex items-start gap-3">
        {img ? (
          <img
            src={img}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-[4.5rem] shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <span className="flex size-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Package className="size-6" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-bold text-foreground">{offer.product.name}</h3>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{formatDA(offer.price)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StockBadge level={level} />
            <span className="text-caption text-muted-foreground">
              {t("studio_in_stock_units", { count: offer.stock_quantity })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            {t("studio_stock_label")}
          </span>
          <QtyStepper
            value={offer.stock_quantity}
            min={0}
            max={9999}
            disabled={busy}
            onChange={onStockChange}
          />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!offer.is_merchant_hidden}
          aria-label={t("studio_availability_label")}
          disabled={busy}
          onClick={onToggle}
          className="flex min-h-11 items-center gap-2 text-xs font-semibold text-foreground disabled:opacity-50"
        >
          <span
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors",
              !offer.is_merchant_hidden ? "bg-success" : "bg-neutral-300",
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-5 rounded-full bg-card  transition-all",
                !offer.is_merchant_hidden ? "end-1" : "start-1",
              )}
            />
          </span>
          <span className="hidden min-[380px]:inline">{t("studio_availability_label")}</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onEdit}
          aria-label={t("studio_action_edit_aria")}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-background text-xs font-bold text-foreground transition hover:bg-muted"
        >
          <Pencil className="size-4" aria-hidden="true" /> {t("studio_action_edit")}
        </button>
        <button
          type="button"
          onClick={onImages}
          aria-label={t("studio_action_images_aria")}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-bold text-foreground transition hover:bg-muted"
        >
          <ImageIcon className="size-4" aria-hidden="true" /> {t("studio_action_images")}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t("studio_action_delete_aria")}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-danger-soft text-xs font-bold text-danger transition hover:bg-danger hover:text-white"
        >
          <Trash2 className="size-4" aria-hidden="true" /> {t("studio_action_delete")}
        </button>
      </div>
    </article>
  );
}
