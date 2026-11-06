import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, ArrowLeft, ShoppingBag, Store, Trash2 } from "lucide-react";
import { bagItemKey, useBag } from "@/lib/bag";
import { translate, useTranslation } from "@/lib/i18n";
import { evaluateBag } from "@/lib/bag-check";
import { formatDA } from "@/lib/geo";
import { getOffersByIds, primaryImage } from "@/lib/sooqy";
import { QtyStepper } from "@/components/sooqy/qty-stepper";
import { EmptyState } from "@/components/sooqy/empty-state";
import { ErrorState } from "@/components/sooqy/error-state";
import { AppShell } from "@/components/sooqy/app-shell";
import { SectionHeader } from "@/components/sooqy/section-header";
import { StickyActionBar } from "@/components/sooqy/sticky-action-bar";
import { ConfirmDialog } from "@/components/sooqy/confirm-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/bag")({
  head: () => ({
    meta: [
      { title: translate("bag_title") },
      { name: "description", content: translate("bag_description") },
    ],
  }),
  component: BagPage,
});

function BagPage() {
  const bag = useBag();
  const { t, lang } = useTranslation();
  const [confirmClear, setConfirmClear] = useState(false);
  const ids = bag.items.map((i) => i.offerId);
  const offers = useQuery({
    queryKey: ["bag-offers", ids],
    queryFn: () => getOffersByIds(ids),
    enabled: ids.length > 0,
  });

  // مصدر واحد للحقيقة: نفس التقييم المستخدَم في صفحة الدفع.
  const evaluation = evaluateBag(bag.items, offers.data, lang);
  const rows = evaluation.rows;

  // التجميع حسب المتجر
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.offer?.store.name ?? t("bag_other_store");
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  const subtotal = evaluation.subtotal;
  // رسوم التوصيل النهائية يحددها كل متجر بعد مراجعة الطلب؛ لا نعرض تقديراً مضللاً.
  const delivery = null;
  const blocked = evaluation.hasBlocking;

  return (
    <AppShell className="pb-[calc(13rem+env(safe-area-inset-bottom))]">
      <div className="space-y-4 pt-3 sm:space-y-5">
        {/* رأس الصفحة: العنوان + إفراغ السلة */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0"><h1 className="text-h1 text-foreground">{t("bag_heading")}</h1><p className="mt-1 text-xs text-muted-foreground">{t("bag_cta_items", { count: bag.count })}</p></div>
          {bag.items.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="btn-danger-small flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Trash2 className="size-3.5" /> {t("bag_clear")}
            </button>
          )}
        </div>

        {offers.isError && bag.items.length > 0 && (
          <ErrorState scope="bag:offers" error={offers.error} onRetry={() => offers.refetch()} />
        )}

        {bag.items.length === 0 && (
          <EmptyState
            Icon={ShoppingBag}
            title={t("bag_empty_title")}
            hint={t("bag_empty_hint")}
            action={
              <Link to="/explore" className="btn-primary">
                {t("bag_browse")}
              </Link>
            }
          />
        )}

        {/* تنبيه صريح: لماذا لا يمكن إتمام الطلب الآن */}
        {blocked && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-danger bg-danger-soft p-3.5"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
            <div className="min-w-0 text-sm">
              <p className="font-bold text-danger">{t("bag_issues_title")}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-danger/90">
                {evaluation.blockingCount === 1
                  ? t("bag_issue_one")
                  : t("bag_issue_many", { count: evaluation.blockingCount })}{" "}
                {t("bag_issue_hint")}
              </p>
            </div>
          </div>
        )}

        {/* المجموعات حسب المتجر */}
        {[...groups.entries()].map(([storeName, items]) => (
          <section key={storeName} className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-3 sm:p-4">
            <SectionHeader
              title={
                <span className="flex items-center gap-1.5">
                  <Store className="size-4 text-accent-ink" />
                  {storeName}
                </span>
              }
            />
            <div className="space-y-2">
              {items.map((r) => {
                const image = r.offer ? primaryImage(r.offer.images) : null;
                const name = r.offer?.product.name ?? r.item.name ?? t("bag_item_removed");
                const priceChanged = r.issues.find((i) => i.kind === "price_changed");
                const otherVariantQuantity = bag.items.reduce(
                  (sum, item) =>
                    item.offerId === r.item.offerId &&
                    bagItemKey(item) !== bagItemKey(r.item)
                      ? sum + item.quantity
                      : sum,
                  0,
                );
                const availableForLine = Math.max(
                  1,
                  (r.offer?.stock_quantity ?? 10) - otherVariantQuantity,
                );
                const lineMax = Math.max(r.item.quantity, Math.min(10, availableForLine));
                const quantityBlocked =
                  !!r.issue && r.issue.kind !== "over_stock";
                return (
                  <article
                    key={bagItemKey(r.item)}
                    className={
                      "grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-2xl border border-border/70 bg-background p-2.5 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-4 sm:p-3 " +
                      (r.issue ? "!border-danger/50" : "")
                    }
                  >
                    {r.offer ? (
                      <Link
                        to="/products/$productId"
                        params={{ productId: r.offer.product_id }}
                        aria-label={name}
                        className="aspect-square w-full self-start overflow-hidden rounded-xl bg-muted"
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={name}
                            loading="lazy"
                            decoding="async"
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="size-full animate-pulse bg-muted" />
                        )}
                      </Link>
                    ) : (
                      <div className="aspect-square w-full animate-pulse rounded-xl bg-muted" />
                    )}
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="flex min-w-0 items-start gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="line-clamp-2 break-words text-sm font-semibold leading-5 text-foreground">
                            {name}
                          </p>
                          {Object.values(r.item.options).length > 0 && (
                            <p className="line-clamp-2 break-words text-xs leading-5 text-muted-foreground">
                              {Object.values(r.item.options).join(" · ")}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label={t("bag_remove_aria")}
                          onClick={() => {
                            const removed = r.item;
                            bag.remove(bagItemKey(removed));
                            toast(t("bag_removed_toast", { name }), {
                              action: { label: t("bag_undo"), onClick: () => bag.add(removed) },
                            });
                          }}
                          className="flex size-10 shrink-0 items-center justify-center rounded-full text-danger transition hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[var(--scale-pressed)]"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>

                      <p
                        key={r.item.quantity}
                        className="animate-pop whitespace-nowrap text-base font-extrabold tabular-nums text-accent-ink"
                      >
                        {formatDA((r.offer?.price ?? 0) * r.item.quantity)}
                      </p>

                      {priceChanged && (
                        <p className="text-caption font-medium text-warning">
                          {priceChanged.message}
                        </p>
                      )}
                      {r.issue && (
                        <p className="text-caption font-semibold text-danger">{r.issue.message}</p>
                      )}

                      <div className="mt-auto flex items-center justify-start">
                        <QtyStepper
                          value={r.item.quantity}
                          onChange={(v) => bag.setQty(bagItemKey(r.item), v)}
                          max={lineMax}
                          disabled={quantityBlocked}
                          className="[&>button]:size-10"
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {bag.items.length > 0 && (
          <Link to="/explore" className="btn-ghost w-full py-1.5 text-sm">
            {t("bag_continue_shopping")}
          </Link>
        )}

        {/* ملخص الطلب */}
        {bag.items.length > 0 && (
          <div className="rounded-[var(--radius-card)] border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{t("bag_shipping")}</span>
              {delivery != null ? (
                <b className="whitespace-nowrap text-foreground">{formatDA(delivery)}</b>
              ) : (
                <span className="text-end text-xs leading-5 text-muted-foreground">{t("bag_shipping_pending")}</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="font-bold text-foreground">{t("bag_subtotal")}</span>
              <b className="whitespace-nowrap text-price tabular-nums text-accent-ink">{formatDA(subtotal)}</b>
            </div>
          </div>
        )}
      </div>

      {/* شريط متابعة الطلب — ثابت أسفل الشاشة */}
      {bag.items.length > 0 && (
        <StickyActionBar>
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-semibold text-muted-foreground">
              {t("bag_subtotal")}
            </span>
            <b className="text-section whitespace-nowrap tabular-nums text-accent-ink">{formatDA(subtotal)}</b>
          </div>
          {blocked ? (
            <p className="mt-2 rounded-[var(--radius-control)] bg-danger-soft px-3 py-2 text-center text-xs font-bold text-danger">
              {t("bag_checkout_blocked")}
            </p>
          ) : offers.isLoading || !evaluation.loaded ? (
            <button type="button" disabled className="btn-primary mt-3 w-full opacity-60">
              {t("state_loading")}
            </button>
          ) : offers.isError ? (
            <button type="button" disabled className="btn-primary mt-3 w-full opacity-60">
              {t("checkout_verify_failed_short")}
            </button>
          ) : (
            <Link to="/checkout" className="btn-primary mt-3 w-full">
              {t("bag_checkout_cta")} <ArrowLeft className="size-4" />
            </Link>
          )}
        </StickyActionBar>
      )}

      <ConfirmDialog
        open={confirmClear}
        title={t("bag_empty_confirm_title")}
        message={t("bag_empty_confirm_message")}
        confirmLabel={t("bag_empty_confirm_ok")}
        cancelLabel={t("bag_cancel")}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          bag.clear();
          setConfirmClear(false);
        }}
      />
    </AppShell>
  );
}
