import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  MapPin,
  Package,
  Truck,
  XCircle,
  Truck as TruckIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { formatDA } from "@/lib/geo";
import { formatDate } from "@/lib/market";
import { fetchMyOrders } from "@/lib/sooqy";
import { fetchOrderWithShipment, SHIPMENT_STATUS_LABELS } from "@/lib/delivery";
import { translate, useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/sooqy/error-state";
import { goBackOrTo } from "@/lib/nav";
import { OrderTrackingSkeleton } from "@/components/sooqy/skeleton";
import { CustomerOrderTracking } from "@/components/sooqy/merchant-order-tracking";
import { shouldShowParentOrderTimeline } from "@/lib/order-display";

export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [{ title: translate("track_title") }],
  }),
  component: TrackPage,
});

const STEPS = [
  { id: "pending", labelKey: "track_step_pending", descKey: "track_step_pending_desc" },
  { id: "confirmed", labelKey: "track_step_confirmed", descKey: "track_step_confirmed_desc" },
  { id: "shipped", labelKey: "track_step_shipped", descKey: "track_step_shipped_desc" },
  { id: "delivered", labelKey: "track_step_delivered", descKey: "track_step_delivered_desc" },
] as const;

function trackCode(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function TrackPage() {
  const { t } = useTranslation();
  const { orderId } = Route.useParams();
  const { user, ready } = useAuth();
  const router = useRouter();
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: fetchMyOrders, enabled: !!user });

  const shipment = useQuery({
    queryKey: ["order-shipment", orderId],
    queryFn: () => fetchOrderWithShipment(orderId),
    enabled: !!user && !!orderId,
  });

  // تحديثات حية: تغيّر حالة الشحنة/الطلب (Supabase Realtime)
  useRealtimeSubscription({
    table: "shipments",
    queryKeys: [["order-shipment", orderId], ["my-orders"]],
    enabled: !!user && !!orderId,
  });

  useRealtimeSubscription({
    table: "merchant_orders",
    filter: user?.id ? `customer_id=eq.${user.id}` : undefined,
    queryKeys: [["my-orders"]],
    enabled: !!user,
  });

  if (!ready) return null;
  const order = orders.data?.find((o) => o.id === orderId);
  const orderShipments = shipment.data?.shipments ?? [];

  if (!user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-h1 text-foreground">{t("track_login")}</h1>
        <Link to="/auth" search={{ redirect: `/orders/${orderId}` }} className="btn-primary">
          {t("checkout_login_cta")}
        </Link>
      </div>
    );
  }

  if (orders.isError) {
    return (
      <div className="p-8">
        <ErrorState scope="order:details" error={orders.error} onRetry={() => orders.refetch()} />
      </div>
    );
  }
  if (orders.isLoading && !order) {
    return <OrderTrackingSkeleton />;
  }
  if (!order) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-body text-muted-foreground">{t("track_not_found")}</p>
        <Link to="/orders" className="btn-secondary mt-4">
          {t("track_my_orders")}
        </Link>
      </div>
    );
  }

  const cancelled = order.status === "cancelled" || order.status === "rejected";
  const showParentTimeline = shouldShowParentOrderTimeline(order.merchant_orders?.length ?? 0);
  const statusIdx = STEPS.findIndex((s) => s.id === order.status);
  const date = formatDate(order.created_at, undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4 px-4 pb-8 pt-3">
      <header className="flex items-center gap-2 py-1">
        <button
          onClick={() => goBackOrTo(router, "/orders")}
          aria-label={t("common_back")}
          className="icon-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowRight className="size-5 ltr:rotate-180" />
        </button>
        <h1 className="text-h1 text-foreground">{t("orders_track")}</h1>
      </header>

      {/* رمز التتبع */}
      <div className="rounded-[var(--radius-card)] border border-border bg-card p-3.5 sm:p-4">
        <p className="text-xs text-muted-foreground">
          {t("orders_code", { code: trackCode(order.id) })}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-background p-3">
          <span className="text-sm font-semibold text-muted-foreground">{t("track_total")}</span>
          <b className="text-price text-accent-ink">{formatDA(order.total)}</b>
        </div>
      </div>

      {/* حالة الطلب العام للطلبات أحادية المتجر فقط؛ الطلبات متعددة المتاجر تتبع كل متجر منفصلًا. */}
      {showParentTimeline ? (
        cancelled ? (
          <div className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger-soft p-4">
            <XCircle className="size-6 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-bold text-danger">
                {order.status === "rejected" ? t("track_rejected") : t("track_cancelled")}
              </p>
              <p className="text-xs text-muted-foreground">{t("track_cancelled_hint")}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
            <ol className="space-y-0">
              {STEPS.map((step, i) => {
                const done = i <= statusIdx;
                const current = i === statusIdx;
                return (
                  <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < STEPS.length - 1 && (
                      <span
                        className={cn(
                          "absolute top-7 start-4 h-[calc(100%-var(--space-8)+var(--space-1))] w-0.5 rounded-full",
                          i < statusIdx ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition",
                        done
                          ? "border-accent-ink bg-primary text-accent-ink-foreground"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="size-4" /> : <Package className="size-4" />}
                    </span>
                    <div className="min-w-0 pt-1">
                      <p
                        className={cn(
                          "text-sm font-bold",
                          current
                            ? "text-accent-ink"
                            : done
                              ? "text-foreground"
                              : "text-muted-foreground",
                        )}
                      >
                        {t(step.labelKey)}
                        {current && (
                          <span className="ms-2 text-caption font-semibold text-accent-ink">
                            {t("track_current")}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{t(step.descKey)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )
      ) : (
        <div className="rounded-[var(--radius-card)] border border-border bg-primary-soft/50 p-4">
          <p className="text-sm font-semibold text-foreground">{t("track_per_store_progress")}</p>
        </div>
      )}

      {/* التفاصيل */}
      <div className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-3.5 sm:p-4">
        <h2 className="text-section text-foreground">{t("track_details")}</h2>
        <div className="space-y-1.5">
          {(order.items ?? []).map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="line-clamp-1 font-semibold text-foreground">
                {it.product_name} <span className="text-muted-foreground">× {it.quantity}</span>
              </span>
              <span className="shrink-0 font-bold text-ink">
                {formatDA(it.unit_price * it.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("track_subtotal")}</span>
            <span>{formatDA(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("track_shipping")}</span>
            <span>{formatDA(order.shipping_fee)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("track_payment")}</span>
            <span>
              {order.payment_method === "cod" ? t("checkout_payment_cod_label") : "BaridiMob"}
            </span>
          </div>
        </div>
      </div>

      {/* العنوان */}
      <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-card p-3.5 sm:p-4">
        <MapPin className="mt-0.5 size-5 shrink-0 text-accent-ink" />
        <div className="text-sm">
          <p className="text-xs font-semibold text-muted-foreground">
            {t(order.delivery_type === "desk" ? "track_buyer_info_heading" : "track_delivery_address_heading")}
          </p>
          <p className="mt-1 font-bold text-foreground">{order.full_name}</p>
          <p className="mt-0.5 text-muted-foreground">
            {order.wilaya?.name_ar ?? t("track_wilaya_fallback", { id: order.wilaya_id })} ·{" "}
            {order.commune}
            {order.address_line ? ` · ${order.address_line}` : ""}
          </p>
          <p className="mt-0.5 text-muted-foreground">{order.phone}</p>
        </div>
      </div>

      {(order.merchant_orders ?? []).map((merchantOrder) => (
        <CustomerOrderTracking
          key={merchantOrder.id}
          merchantOrderId={merchantOrder.id}
          deliveryType={order.delivery_type === "desk" ? "desk" : "home"}
          orderStatus={merchantOrder.status}
          storeName={merchantOrder.store?.name}
          storeAddress={merchantOrder.store?.address_line}
          storeCommune={merchantOrder.store?.commune}
        />
      ))}

      {shipment.isError && (
        <ErrorState
          scope="order:shipment"
          error={shipment.error}
          onRetry={() => shipment.refetch()}
        />
      )}
      {orderShipments.length > 0 && (
        <div className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4">
          <h2 className="text-section text-foreground flex items-center gap-2">
            <TruckIcon className="size-5" /> {t("track_shipment_heading")}
          </h2>
          {orderShipments.map((orderShipment) => (
            <div
              key={orderShipment.id}
              className="space-y-2 rounded-xl border border-border/70 p-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t(`ship_status_${orderShipment.status}`)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("track_shipment_updated", { date: formatDate(orderShipment.updated_at) })}
                  </p>
                </div>
                <BadgeStatus status={orderShipment.status} />
              </div>
              {orderShipment.notes && (
                <p className="text-sm text-muted-foreground italic">{orderShipment.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Link to="/explore" className="btn-secondary w-full">
        <Truck className="size-4" /> {t("track_continue")}
      </Link>
    </div>
  );
}

function BadgeStatus({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-warning-soft text-warning",
    accepted: "bg-primary-soft text-accent-ink",
    picked_up: "bg-primary-soft text-accent-ink",
    in_transit: "bg-primary-soft text-accent-ink",
    delivered: "bg-success-soft text-success",
    failed: "bg-danger-soft text-danger",
    returned: "bg-danger-soft text-danger",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-bold",
        variants[status],
      )}
    >
      {SHIPMENT_STATUS_LABELS[status as keyof typeof SHIPMENT_STATUS_LABELS] ?? status}
    </span>
  );
}
