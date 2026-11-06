import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Archive, ArrowLeft, PackageCheck, Package, Trash2, Truck, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { formatDA } from "@/lib/geo";
import { formatDate } from "@/lib/market";
import { getMerchantOrderDisplayTotal } from "@/lib/order-display";
import {
  archiveMyActivity,
  cancelMyOrder,
  cancelMyMerchantOrder,
  customerRespondToMerchantOrder,
  fetchMyOrders,
} from "@/lib/sooqy";
import { EmptyState } from "@/components/sooqy/empty-state";
import { OrderStatusBadge } from "@/components/sooqy/badges";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/sooqy/error-state";
import { useTranslation } from "@/lib/i18n";
import { showError, showSuccess } from "@/lib/feedback";
import { SeoHead } from "@/components/seo/SeoHead";
import { AppShell } from "@/components/sooqy/app-shell";
import { goBackOrTo } from "@/lib/nav";
import { ConfirmDialog } from "@/components/sooqy/confirm-dialog";
import { OrderListSkeleton } from "@/components/sooqy/skeleton";

export const Route = createFileRoute("/orders/")({
  head: () => ({}),
  component: OrdersPage,
});

type Tab = "all" | "active" | "delivered" | "cancelled";
type PendingConfirmation = { title: string; message: string; action: () => Promise<void> };
type OrderRecord = Awaited<ReturnType<typeof fetchMyOrders>>[number];
type OrderRow = OrderRecord & {
  displayId?: string;
  parentOrderId?: string;
  isMerchantSuborder?: boolean;
};

const TABS: { id: Tab; labelKey: string }[] = [
  { id: "all", labelKey: "orders_tab_all" },
  { id: "active", labelKey: "orders_tab_active" },
  { id: "delivered", labelKey: "orders_tab_delivered" },
  { id: "cancelled", labelKey: "orders_tab_cancelled" },
];

function trackCode(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function OrdersPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, ready } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [respondingQuoteId, setRespondingQuoteId] = useState<string | null>(null);
  const [cancellingMerchantOrderId, setCancellingMerchantOrderId] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [confirmationBusy, setConfirmationBusy] = useState(false);
  const orders = useQuery({
    queryKey: ["my-orders"],
    queryFn: fetchMyOrders,
    enabled: !!user,
  });

  // تحديثات حالة الطلب لحظيًا عبر Supabase Realtime.
  useRealtimeSubscription({
    table: "orders",
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    queryKeys: [["my-orders"]],
    enabled: !!user,
  });

  useRealtimeSubscription({
    table: "merchant_orders",
    filter: user?.id ? `customer_id=eq.${user.id}` : undefined,
    queryKeys: [["my-orders"]],
    enabled: !!user,
  });

  const runPendingConfirmation = async () => {
    if (!pendingConfirmation || confirmationBusy) return;
    setConfirmationBusy(true);
    try {
      await pendingConfirmation.action();
      setPendingConfirmation(null);
    } catch (error) {
      showError(error);
    } finally {
      setConfirmationBusy(false);
    }
  };

  if (!ready) return null;
  if (!user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-3xl bg-primary-soft">
          <PackageCheck className="size-9 text-accent-ink" strokeWidth={1.6} />
        </span>
        <h1 className="text-h1 text-foreground">{t("orders_login_title")}</h1>
        <p className="max-w-xs text-body text-muted-foreground">{t("orders_login_hint")}</p>
        <Link to="/auth" search={{ redirect: "/orders" }} className="btn-primary mt-2">
          {t("checkout_login_cta")}
        </Link>
      </div>
    );
  }

  const list = orders.data ?? [];

  // Show each merchant suborder as its own card while retaining the parent
  // order ID for tracking and parent-level history operations.
  const orderRows: OrderRow[] = list.flatMap<OrderRow>((order) => {
    const suborders = order.merchant_orders ?? [];
    if (suborders.length === 0) return [order];
    return suborders.map((suborder) => ({
      ...order,
      id: order.id,
      displayId: `${order.id}-${suborder.id}`,
      parentOrderId: order.id,
      isMerchantSuborder: true,
      status: suborder.status,
      total: getMerchantOrderDisplayTotal(suborder.status, suborder.subtotal, suborder.shipping_fee),
      items: suborder.items ?? [],
      merchant_orders: [suborder],
    }));
  });
  const filtered =
    tab === "all"
      ? orderRows
      : tab === "active"
        ? orderRows.filter((o) => ["pending", "quoted", "confirmed", "shipped"].includes(o.status))
        : tab === "delivered"
          ? orderRows.filter((o) => o.status === "delivered")
          : orderRows.filter((o) => o.status === "cancelled");

  return (
    <>
      <SeoHead
        title={t("orders_seo_title")}
        description={t("orders_seo_description")}
        keywords={t("orders_seo_keywords")}
        ogType="website"
      />
      <AppShell className="space-y-5 pb-8 pt-3">
        <header className="flex items-center gap-2 py-1">
          <button
            type="button"
            onClick={() => goBackOrTo(router, "/profile")}
            aria-label={t("common_back")}
            className="icon-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-5 rtl:rotate-180" />
          </button>
          <h1 className="text-h1 text-foreground">{t("orders_heading")}</h1>
        </header>

        {/* التبويبات */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              aria-pressed={tab === tb.id}
              onClick={() => setTab(tb.id)}
              className={cn(
                "min-h-11 shrink-0 rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors",
                tab === tb.id
                  ? "border-accent-ink bg-primary text-accent-ink-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {t(tb.labelKey)}
            </button>
          ))}
        </div>

        {orders.isLoading && (
          <OrderListSkeleton />
        )}

        {orders.isError && (
          <ErrorState
            title={t("orders_load_failed")}
            error={orders.error}
            onRetry={() => orders.refetch()}
          />
        )}

        {!orders.isLoading && !orders.isError && filtered.length === 0 && (
          <EmptyState
            Icon={tab === "cancelled" ? Trash2 : Package}
            title={tab === "all" ? t("orders_empty_all") : t("orders_empty_tab")}
            hint={t("orders_empty_hint")}
            action={
              <Link to="/explore" className="btn-primary">
                {t("orders_browse")}
              </Link>
            }
          />
        )}

        <div className="space-y-3">
          {filtered.map((o) => {
            const date = formatDate(o.created_at, undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            return (
              <article
                key={o.displayId ?? o.id}
                className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border bg-background/60 p-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-foreground">
                      {t("orders_code", { code: trackCode(o.parentOrderId ?? o.id) })}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {date}
                      {o.wilaya?.name_ar ? ` · ${o.wilaya.name_ar}` : ""}
                    </p>
                  </div>
                  <OrderStatusBadge status={o.status} />
                </div>

                <div className="mx-3.5 mt-3 space-y-2 rounded-2xl border border-border/70 bg-background p-3">
                  {(o.items ?? []).slice(0, 3).map((it) => (
                    <div key={it.id} className="flex items-center justify-between gap-3 text-xs">
                      <span className="line-clamp-1 font-semibold text-foreground">
                        {it.product_name}{" "}
                        <span className="text-muted-foreground">× {it.quantity}</span>
                      </span>
                      <span className="shrink-0 font-bold text-ink">
                        {formatDA(it.unit_price * it.quantity)}
                      </span>
                    </div>
                  ))}
                  {(o.items ?? []).length > 3 && (
                    <p className="text-caption text-muted-foreground">
                      {t("orders_more_items", { count: (o.items ?? []).length - 3 })}
                    </p>
                  )}
                </div>

                {(o.merchant_orders ?? []).map((suborder) => (
                  <div
                    key={suborder.id}
                    className="mx-3.5 mt-3 space-y-2 rounded-2xl border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">
                        {suborder.store?.name ?? t("orders_store_quote_heading")}
                      </p>
                      <OrderStatusBadge status={suborder.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("orders_items_subtotal")}</span>
                      <b>{formatDA(suborder.subtotal)}</b>
                    </div>
                    {suborder.status !== "pending" && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t("orders_shipping_fee")}</span>
                        <b>{formatDA(suborder.shipping_fee)}</b>
                      </div>
                    )}
                    {suborder.status !== "cancelled" && (
                      <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                        <span className="font-semibold">{t("orders_store_total")}</span>
                        <b className="text-accent-ink">
                          {formatDA(suborder.subtotal + suborder.shipping_fee)}
                        </b>
                      </div>
                    )}
                    {suborder.status === "quoted" && (
                      <>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {t("orders_quote_waiting")}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={respondingQuoteId === suborder.id}
                            onClick={async () => {
                              setRespondingQuoteId(suborder.id);
                              try {
                                await customerRespondToMerchantOrder(suborder.id, true);
                                await queryClient.invalidateQueries({ queryKey: ["my-orders"] });
                                showSuccess(t("orders_quote_accepted"));
                              } catch (error) {
                                showError(error);
                              } finally {
                                setRespondingQuoteId(null);
                              }
                            }}
                            className="min-h-[var(--control-height)] rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition active:scale-[var(--scale-pressed)] disabled:opacity-50 focus-visible:outline"
                          >
                            {t("orders_quote_accept")}
                          </button>
                          <button
                            type="button"
                            disabled={respondingQuoteId === suborder.id}
                            onClick={() =>
                              setPendingConfirmation({
                                title: t("orders_quote_decline"),
                                message: t("orders_quote_decline") + "?",
                                action: async () => {
                                  setRespondingQuoteId(suborder.id);
                                  try {
                                    await customerRespondToMerchantOrder(suborder.id, false);
                                    await queryClient.invalidateQueries({
                                      queryKey: ["my-orders"],
                                    });
                                    showSuccess(t("orders_quote_declined"));
                                  } finally {
                                    setRespondingQuoteId(null);
                                  }
                                },
                              })
                            }
                            className="min-h-[var(--control-height)] rounded-full border border-danger/30 bg-danger-soft px-4 py-2 text-sm font-semibold text-danger transition active:scale-[var(--scale-pressed)] disabled:opacity-50 focus-visible:outline"
                          >
                            {t("orders_quote_decline")}
                          </button>
                        </div>
                      </>
                    )}
                    {suborder.status === "pending" && (
                      <button
                        type="button"
                        disabled={cancellingMerchantOrderId === suborder.id}
                        onClick={() =>
                          setPendingConfirmation({
                            title: t("orders_cancel_store_title"),
                            message: t("orders_cancel_store_message"),
                            action: async () => {
                              setCancellingMerchantOrderId(suborder.id);
                              try {
                                await cancelMyMerchantOrder(suborder.id);
                                await queryClient.invalidateQueries({ queryKey: ["my-orders"] });
                                showSuccess(t("orders_cancel_store_success"));
                              } finally {
                                setCancellingMerchantOrderId(null);
                              }
                            },
                          })
                        }
                        className="inline-flex min-h-[var(--control-height)] w-full items-center justify-center gap-2 rounded-full border border-danger/30 bg-danger-soft px-3 text-sm font-bold text-danger transition hover:bg-danger/15 disabled:opacity-50"
                      >
                        <XCircle className="size-4" />
                        {cancellingMerchantOrderId === suborder.id ? t("orders_cancelling") : t("orders_cancel_store_title")}
                      </button>
                    )}
                  </div>
                ))}

                <div className="mx-3.5 mt-3 flex items-center justify-between gap-3 rounded-2xl bg-primary-soft/50 px-3 py-3">
                  <span className="flex items-center gap-1 text-caption text-muted-foreground">
                    <Truck className="size-3.5" />
                    {o.delivery_type === "home"
                      ? t("orders_delivery_home")
                      : t("orders_delivery_desk")}
                  </span>
                  <b className="text-price text-accent-ink">{formatDA(o.total)}</b>
                </div>

                <Link
                  to="/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="btn-secondary mx-3.5 mb-3.5 mt-3 min-h-[var(--control-height)] w-[calc(100%-1.75rem)] rounded-2xl text-sm font-semibold"
                >
                  {t("orders_track")}
                </Link>
                {!o.isMerchantSuborder &&
                  o.status === "pending" &&
                  !(o.merchant_orders ?? []).some((suborder) => suborder.status !== "pending") && (
                    <button
                      type="button"
                      disabled={cancellingOrderId === o.id}
                      onClick={() =>
                        setPendingConfirmation({
                          title: t("orders_cancel_title"),
                          message: t("orders_cancel_message"),
                          action: async () => {
                            setCancellingOrderId(o.id);
                            try {
                              await cancelMyOrder(o.id);
                              await queryClient.invalidateQueries({ queryKey: ["my-orders"] });
                              showSuccess(t("orders_cancel_success"));
                            } finally {
                              setCancellingOrderId(null);
                            }
                          },
                        })
                      }
                      className="mx-4 mb-4 inline-flex min-h-[var(--control-height)] w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full border border-danger/30 bg-danger-soft px-3 text-sm font-bold text-danger transition hover:bg-danger/15 disabled:opacity-50"
                    >
                      <XCircle className="size-4" />
                      {cancellingOrderId === o.id ? t("orders_cancelling") : t("orders_cancel_title")}
                    </button>
                  )}
                {!o.isMerchantSuborder &&
                  (o.status === "delivered" || o.status === "cancelled") && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingConfirmation({
                          title: t("orders_archive_title"),
                          message:
                            t("orders_archive_message"),
                          action: async () => {
                            await archiveMyActivity("order", o.id);
                            await queryClient.invalidateQueries({ queryKey: ["my-orders"] });
                            showSuccess(t("orders_archive_success"));
                          },
                        })
                      }
                      className="mx-4 mb-4 mt-2 inline-flex min-h-[var(--control-height)] w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full border border-border text-sm font-semibold text-muted-foreground transition hover:bg-muted"
                    >
                      <Archive className="size-4" /> {t("orders_archive_action")}
                    </button>
                  )}
              </article>
            );
          })}
        </div>
      </AppShell>
      <ConfirmDialog
        open={pendingConfirmation !== null}
        title={pendingConfirmation?.title ?? ""}
        message={pendingConfirmation?.message ?? ""}
        confirmLabel={t("common_confirm")}
        cancelLabel={t("cancel")}
        busy={confirmationBusy}
        onConfirm={runPendingConfirmation}
        onCancel={() => setPendingConfirmation(null)}
      />
    </>
  );
}
