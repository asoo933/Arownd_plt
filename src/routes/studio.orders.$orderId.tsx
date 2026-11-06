import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { formatDA } from "@/lib/geo";
import { formatDate } from "@/lib/market";
import {
  fetchOrder,
  merchantSubmitOrderQuote,
  merchantRejectOrder,
  collectMerchantOrderCod,
  merchantUpdateOrderNote,
  fetchMyStore,
} from "@/lib/sooqy";
import { Link, useNavigate } from "@tanstack/react-router";
import { showError, showSuccess } from "@/lib/feedback";
import { PageHeader } from "@/components/sooqy/page-header";
import { AppShell } from "@/components/sooqy/app-shell";
import { ErrorState } from "@/components/sooqy/error-state";
import { OrderStatusBadge } from "@/components/sooqy/badges";
import { useState } from "react";
import { MerchantOrderDetailSkeleton } from "@/components/sooqy/skeleton";
import { MerchantOrderTracking } from "@/components/sooqy/merchant-order-tracking";
import { fetchShipmentByMerchantOrderId } from "@/lib/delivery";
import { isMerchantManagedDelivery } from "@/lib/shipping";

export const Route = createFileRoute("/studio/orders/$orderId")({
  component: StudioOrderDetailPage,
});

function StudioOrderDetailPage() {
  const { t } = useTranslation();
  const { orderId } = Route.useParams();
  const { user, ready } = useAuth();
  const [note, setNote] = useState("");
  const [shippingFee, setShippingFee] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);
  const [savingDecision, setSavingDecision] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const store = useQuery({ queryKey: ["my-store"], queryFn: fetchMyStore, enabled: !!user });
  const orderQuery = useQuery({
    queryKey: ["store-order", orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: !!orderId && !!user,
  });
  const merchantOrderForShipment = orderQuery.data?.merchant_orders?.find(
    (item) => item.store_id === store.data?.id,
  );
  const merchantOrderShipment = useQuery({
    queryKey: ["merchant-order-shipment", merchantOrderForShipment?.id],
    queryFn: () => fetchShipmentByMerchantOrderId(merchantOrderForShipment!.id),
    enabled:
      !!merchantOrderForShipment?.id &&
      orderQuery.data?.delivery_type === "home" &&
      (merchantOrderForShipment.status === "confirmed" ||
        merchantOrderForShipment.status === "delivered"),
  });

  useRealtimeSubscription({
    table: "orders",
    queryKeys: [["store-order", orderId], ["store-orders"]],
    enabled: !!user && !!orderId,
  });

  useRealtimeSubscription({
    table: "shipments",
    filter: merchantOrderForShipment?.id
      ? `merchant_order_id=eq.${merchantOrderForShipment.id}`
      : undefined,
    queryKeys: [["merchant-order-shipment", merchantOrderForShipment?.id ?? "none"]],
    enabled:
      !!user &&
      !!merchantOrderForShipment?.id &&
      orderQuery.data?.delivery_type === "home",
  });

  if (!ready) return null;
  if (!user) {
    return (
      <div className="space-y-4 px-4 pt-16 text-center">
        <PageHeader title={t("studio_order_details")} back="/studio" />
        <p className="text-sm text-muted-foreground">{t("studio_login_order_detail")}</p>
        <Link
          to="/auth"
          search={{ redirect: `/studio/orders/${orderId}` }}
          className="btn-primary inline-block"
        >
          {t("studio_auth_login")}
        </Link>
      </div>
    );
  }

  if (store.isLoading || orderQuery.isLoading) {
    return <MerchantOrderDetailSkeleton />;
  }

  if (store.isError) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        <PageHeader title={t("studio_order_details")} back="/studio" />
        <ErrorState
          scope="studio:order:store"
          error={store.error}
          onRetry={() => store.refetch()}
        />
      </div>
    );
  }

  if (orderQuery.isError) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        <PageHeader title={t("studio_order_details")} back="/studio" />
        <ErrorState
          scope="studio:order:details"
          error={orderQuery.error}
          onRetry={() => orderQuery.refetch()}
        />
      </div>
    );
  }

  const order = orderQuery.data;
  const storeData = store.data;
  if (!order) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground">{t("studio_order_unavailable")}</p>
        <button onClick={() => navigate({ to: "/studio" })}>{t("studio_back")}</button>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        <PageHeader title={t("studio_order_details")} back="/studio" />
        <p className="rounded-[var(--radius-card)] border border-border bg-card p-4 text-sm text-muted-foreground">
          {t("studio_order_unavailable")}
        </p>
      </div>
    );
  }

  const merchantOrder = order.merchant_orders?.find((item) => item.store_id === storeData.id);

  if (!merchantOrder) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 pt-6">
        <PageHeader title={t("studio_order_details")} back="/studio" />
        <p className="rounded-[var(--radius-card)] border border-border bg-card p-4 text-sm text-muted-foreground">
          {t("studio_order_unavailable")}
        </p>
      </div>
    );
  }

  const storeOrderItems = (order.items ?? []).filter((item) => item.store_id === storeData.id);
  const merchantOrderStatus = merchantOrder.status;
  const merchantCanCollectCod =
    !merchantOrderShipment.isLoading &&
    !merchantOrderShipment.isError &&
    isMerchantManagedDelivery(order.delivery_type, !!merchantOrderShipment.data?.company_id);

  const refreshOrder = async () => {
    await qc.invalidateQueries({ queryKey: ["store-order", orderId] });
    await qc.invalidateQueries({ queryKey: ["store-orders"] });
  };

  const handleReject = async () => {
    setSavingDecision(true);
    try {
      await merchantRejectOrder(merchantOrder.id);
      showSuccess(t("studio_order_rejected"));
      await refreshOrder();
    } catch (error) {
      showError(error);
    } finally {
      setSavingDecision(false);
    }
  };

  const handleCollectCod = async () => {
    setSavingDecision(true);
    try {
      await collectMerchantOrderCod(merchantOrder.id);
      showSuccess(t("studio_cod_collected"));
      await refreshOrder();
    } catch (error) {
      showError(error);
    } finally {
      setSavingDecision(false);
    }
  };

  return (
    <>
      <AppShell className="mx-auto max-w-4xl space-y-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-3 lg:space-y-6 lg:pt-8">
        <PageHeader title={t("studio_order_details")} back="/studio" />
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-card ">
          <div className="rounded-t-[var(--radius-card)] bg-muted p-4 text-foreground sm:p-6">
            <p className="text-caption font-extrabold tracking-[0.2em] text-accent-ink">
              AROWND · ORDER
            </p>
            <p className="mt-2 text-xl font-black">
              {t("studio_order_number")} #{order.id.slice(-6)}
            </p>
            <p className="mt-1 text-xs text-foreground/65">
              {formatDate(order.created_at, undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="space-y-4 p-3.5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 font-semibold text-foreground">
                {t("studio_total")}
              </span>
              <b className="text-price text-accent-ink">
                {formatDA(
                  (merchantOrder?.subtotal ?? order.total) + (merchantOrder?.shipping_fee ?? 0),
                )}
              </b>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="flex items-center gap-1 font-semibold text-foreground">
                {t("studio_status")}
              </span>
              <OrderStatusBadge status={merchantOrderStatus} className="mt-1" />
            </div>
            <div className="mt-3 space-y-2">
              {storeOrderItems.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-border/70 bg-background/60 p-3"
                >
                  <div>
                    <p className="font-semibold">{it.product_name}</p>
                    <p className="text-xs text-muted-foreground">× {it.quantity}</p>
                  </div>
                  <b className="text-price">{formatDA(it.unit_price * it.quantity)}</b>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("studio_order_note_ph")}
                  className="h-[var(--control-height)] min-w-0 flex-1 rounded-[var(--radius-control)] border border-input bg-background px-4 text-sm outline-none transition focus:border-accent-ink focus:ring-2 focus:ring-primary/25"
                />
                <button
                  onClick={async () => {
                    if (!note.trim()) return;
                    try {
                      await merchantUpdateOrderNote(order.id, note.trim());
                      showSuccess(t("studio_note_saved"));
                      await qc.invalidateQueries({ queryKey: ["store-order", orderId] });
                    } catch (error) {
                      showError(error);
                    }
                  }}
                  className="min-h-[var(--control-height)] rounded-[var(--radius-control)] bg-primary px-5 py-2 text-sm font-extrabold text-primary-foreground transition active:scale-[.98]"
                >
                  {t("studio_save_changes")}
                </button>
              </div>
              {merchantOrderStatus === "pending" && (
                <div className="space-y-2 rounded-[var(--radius-card)] border border-border bg-background p-3">
                  <label className="block text-sm font-bold" htmlFor="merchant-shipping-fee">
                    {t("studio_quote_shipping_fee")}
                  </label>
                  <input
                    id="merchant-shipping-fee"
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    inputMode="numeric"
                    value={order.delivery_type === "desk" ? "0" : shippingFee}
                    disabled={order.delivery_type === "desk"}
                    onChange={(event) => setShippingFee(event.target.value)}
                    placeholder="0"
                    className="h-[var(--control-height)] w-full rounded-[var(--radius-control)] border border-input bg-card px-3 outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("studio_quote_shipping_fee_hint")}
                  </p>
                  <button
                    type="button"
                    disabled={
                      savingQuote ||
                      (order.delivery_type === "home" &&
                        (shippingFee.trim() === "" ||
                          !Number.isFinite(Number(shippingFee)) ||
                          Number(shippingFee) < 0 ||
                          Number(shippingFee) > 1000000))
                    }
                    onClick={async () => {
                      const fee = order.delivery_type === "desk" ? 0 : Number(shippingFee);
                      if (!Number.isFinite(fee) || fee < 0 || fee > 1000000) {
                        showError(new Error(t("studio_quote_invalid_fee")));
                        return;
                      }
                      setSavingQuote(true);
                      try {
                        await merchantSubmitOrderQuote(order.id, fee);
                        showSuccess(t("studio_quote_sent"));
                        await qc.invalidateQueries({ queryKey: ["store-order", orderId] });
                        await qc.invalidateQueries({ queryKey: ["store-orders"] });
                      } catch (error) {
                        showError(error);
                      } finally {
                        setSavingQuote(false);
                      }
                    }}
                    className="min-h-[var(--control-height-compact)] w-full rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {savingQuote ? t("studio_saving") : t("studio_send_quote")}
                  </button>
                </div>
              )}
              {merchantOrderStatus === "pending" && !merchantOrder.quoted_at && (
                <button
                  type="button"
                  disabled={savingDecision}
                  onClick={handleReject}
                  className="min-h-[var(--control-height-compact)] w-full rounded-[var(--radius-control)] border border-destructive/40 px-4 py-2 text-sm font-bold text-destructive disabled:opacity-50"
                >
                  {savingDecision ? t("studio_saving") : t("studio_reject_unavailable")}
                </button>
              )}
              {merchantOrderStatus === "quoted" && (
                <p className="rounded-[var(--radius-control)] bg-warning-soft p-3 text-xs leading-relaxed text-warning">
                  {t("studio_quote_pending_customer")}
                </p>
              )}
              {merchantOrderStatus === "delivered" &&
                merchantOrder.payment_status !== "paid" &&
                merchantCanCollectCod && (
                  <div className="space-y-2 rounded-[var(--radius-control)] border border-border bg-background p-3">
                    <p className="text-sm font-semibold">{t("studio_cod_due")}</p>
                    <p className="text-price font-black">
                      {formatDA((merchantOrder.subtotal ?? 0) + (merchantOrder.shipping_fee ?? 0))}
                    </p>
                    <button
                      type="button"
                      disabled={savingDecision}
                      onClick={handleCollectCod}
                      className="min-h-[var(--control-height-compact)] w-full rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {savingDecision ? t("studio_saving") : t("studio_cod_collect")}
                    </button>
                  </div>
                )}
              {order.delivery_type === "home" &&
                (merchantOrderStatus === "confirmed" || merchantOrderStatus === "delivered") &&
                merchantOrderShipment.isError && (
                  <ErrorState
                    scope="studio:order:shipment-check"
                    error={merchantOrderShipment.error}
                    onRetry={() => void merchantOrderShipment.refetch()}
                  />
                )}
              {merchantOrder.payment_status === "paid" && (
                <p className="rounded-[var(--radius-control)] bg-primary-soft p-3 text-sm font-semibold text-foreground">
                  {t("studio_cod_paid", { amount: formatDA(merchantOrder.paid_amount ?? 0) })}
                </p>
              )}
              {merchantOrderStatus === "confirmed" && merchantCanCollectCod && (
                <MerchantOrderTracking
                  merchantOrderId={merchantOrder.id}
                  deliveryType={order.delivery_type === "desk" ? "desk" : "home"}
                  onCompleted={refreshOrder}
                />
              )}
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
