import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchMerchantOrderTracking,
  merchantUpdateOrderTracking,
  type MerchantTrackingStatus,
} from "@/lib/sooqy";
import { formatDate } from "@/lib/market";
import { showError, showSuccess } from "@/lib/feedback";
import { ErrorState } from "@/components/sooqy/error-state";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { fetchShipmentByMerchantOrderId } from "@/lib/delivery";
import { useTranslation } from "@/lib/i18n";
import { getMerchantOrderDisplayState } from "@/lib/order-display";
import { Link } from "@tanstack/react-router";

type DeliveryType = "home" | "desk";

type TranslationFunction = ReturnType<typeof useTranslation>["t"];

function getSteps(deliveryType: DeliveryType, t: TranslationFunction) {
  return [
    { status: "preparing" as const, label: t("merchant_tracking_preparing") },
    {
      status: "ready_for_dispatch" as const,
      label:
        deliveryType === "desk"
          ? t("merchant_tracking_pickup_ready")
          : t("merchant_tracking_ready"),
    },
    {
      status: "out_for_delivery" as const,
      label:
        deliveryType === "desk"
          ? t("merchant_tracking_pickup_waiting")
          : t("merchant_tracking_outbound"),
    },
    { status: "delivered" as const, label: t("merchant_tracking_delivered") },
  ] satisfies { status: MerchantTrackingStatus; label: string }[];
}

export function MerchantOrderTracking({
  merchantOrderId,
  deliveryType,
  onCompleted,
}: {
  merchantOrderId: string;
  deliveryType: DeliveryType;
  onCompleted: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const query = useQuery({
    queryKey: ["merchant-order-tracking", merchantOrderId],
    queryFn: () => fetchMerchantOrderTracking(merchantOrderId),
  });
  useRealtimeSubscription({
    table: "merchant_order_tracking_events",
    filter: `merchant_order_id=eq.${merchantOrderId}`,
    queryKeys: [["merchant-order-tracking", merchantOrderId]],
  });
  const events = query.data ?? [];
  const steps = getSteps(deliveryType, t);
  const last = events.at(-1)?.status;
  const nextIndex = last ? steps.findIndex((step) => step.status === last) + 1 : 0;
  const next = steps[nextIndex];

  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-background p-4">
      <div>
        <h3 className="font-bold text-foreground">{t("merchant_tracking_heading")}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {deliveryType === "desk"
            ? t("merchant_tracking_hint_pickup")
            : t("merchant_tracking_hint_home")}
        </p>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : query.isError ? (
        <ErrorState
          scope="merchant-order-tracking"
          error={query.error}
          onRetry={() => query.refetch()}
        />
      ) : (
        <ol className="space-y-2">
          {steps.map((step) => {
            const event = events.find((item) => item.status === step.status);
            return (
              <li
                key={step.status}
                className={
                  event ? "text-sm font-semibold text-foreground" : "text-sm text-muted-foreground"
                }
              >
                {event ? "✓ " : "○ "}
                {step.label}
                {event && (
                  <p className="ms-5 text-xs font-normal text-muted-foreground">
                    {formatDate(event.created_at)}
                    {event.note ? " — " + event.note : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {next ? (
        <button
          type="button"
          disabled={saving || query.isLoading || query.isError}
          onClick={async () => {
            setSaving(true);
            try {
              await merchantUpdateOrderTracking(merchantOrderId, next.status);
              await query.refetch();
              await onCompleted();
              showSuccess(t("success"));
            } catch (error) {
              showError(error);
            } finally {
              setSaving(false);
            }
          }}
          className="min-h-[var(--control-height-compact)] w-full rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving
            ? t("merchant_tracking_saving")
            : t("merchant_tracking_update") + ": " + next.label}
        </button>
      ) : (
        <p className="rounded-xl bg-primary-soft p-3 text-sm font-semibold">
          {t("merchant_tracking_complete")}
        </p>
      )}
    </section>
  );
}

/** Buyer-facing timeline for merchant-managed delivery or store pickup. */
export function CustomerOrderTracking({
  merchantOrderId,
  deliveryType,
  orderStatus,
  storeName,
  storeAddress,
  storeCommune,
}: {
  merchantOrderId: string;
  deliveryType: DeliveryType;
  orderStatus: string;
  storeName?: string | null;
  storeAddress?: string | null;
  storeCommune?: string | null;
}) {
  const { t } = useTranslation();
  const displayState = getMerchantOrderDisplayState(orderStatus);
  const shouldTrackProgress = displayState === "tracking";
  const shipmentQuery = useQuery({
    queryKey: ["merchant-order-shipment", merchantOrderId],
    queryFn: () => fetchShipmentByMerchantOrderId(merchantOrderId),
    enabled: deliveryType === "home" && shouldTrackProgress,
  });
  useRealtimeSubscription({
    table: "shipments",
    filter: `merchant_order_id=eq.${merchantOrderId}`,
    queryKeys: [["merchant-order-shipment", merchantOrderId]],
    enabled: deliveryType === "home" && shouldTrackProgress,
  });
  const carrierManaged =
    deliveryType === "home" && !!shipmentQuery.data?.company_id;
  const query = useQuery({
    queryKey: ["merchant-order-tracking", merchantOrderId],
    queryFn: () => fetchMerchantOrderTracking(merchantOrderId),
    enabled: shouldTrackProgress,
  });
  useRealtimeSubscription({
    table: "merchant_order_tracking_events",
    filter: `merchant_order_id=eq.${merchantOrderId}`,
    queryKeys: [["merchant-order-tracking", merchantOrderId]],
    enabled: shouldTrackProgress,
  });
  const events = query.data ?? [];
  const steps = getSteps(deliveryType, t);

  if (deliveryType === "home" && shouldTrackProgress) {
    if (shipmentQuery.isLoading) {
      return (
        <section className="rounded-[var(--radius-card)] border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </section>
      );
    }
    if (shipmentQuery.isError) {
      return (
        <ErrorState
          scope="customer-order-shipment-check"
          error={shipmentQuery.error}
          onRetry={() => void shipmentQuery.refetch()}
        />
      );
    }
    if (carrierManaged) return null;
  }

  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-border bg-card p-4">
      <h2 className="font-bold text-foreground">{t("customer_tracking_heading")}</h2>
      {storeName && (
        <p className="text-xs font-semibold text-muted-foreground">{storeName}</p>
      )}
      {displayState !== "tracking" && (
        <div className="space-y-2 rounded-xl bg-background p-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {displayState === "awaiting_merchant"
              ? t("customer_order_waiting_merchant")
              : displayState === "awaiting_customer"
                ? t("customer_order_waiting_customer")
                : displayState === "cancelled"
                  ? t("customer_order_cancelled")
                  : t("customer_order_status_unknown")}
          </p>
          {displayState === "awaiting_customer" && (
            <Link
              to="/orders"
              className="inline-flex min-h-10 items-center font-semibold text-accent-ink underline underline-offset-4"
            >
              {t("customer_order_review_quote")}
            </Link>
          )}
        </div>
      )}
      {deliveryType === "desk" && storeName && (
        <div className="rounded-xl bg-primary-soft/70 p-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {t("customer_pickup_location")}
          </p>
          <p className="mt-1 font-bold text-foreground">{storeName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {[storeAddress, storeCommune].filter(Boolean).join(" · ") ||
              t("customer_pickup_address_missing")}
          </p>
        </div>
      )}
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : query.isError ? (
        <ErrorState
          scope="customer-order-tracking"
          error={query.error}
          onRetry={() => query.refetch()}
        />
      ) : orderStatus === "delivered" && events.length === 0 ? (
        <p className="rounded-xl bg-primary-soft p-3 text-sm font-semibold">
          {t("merchant_tracking_complete")}
        </p>
      ) : shouldTrackProgress ? (
        <ol className="space-y-3">
          {steps.map((step) => {
            const event = events.find((item) => item.status === step.status);
            return (
              <li key={step.status} className="flex gap-3">
                <span className={event ? "text-success" : "text-muted-foreground"}>
                  {event ? "✓" : "○"}
                </span>
                <div className="min-w-0">
                  <p
                    className={
                      event
                        ? "text-sm font-semibold text-foreground"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {step.label}
                  </p>
                  {event && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(event.created_at)}
                      {event.note ? " — " + event.note : ""}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
