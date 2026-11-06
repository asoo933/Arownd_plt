import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Check, Truck, X, Clock, PackageCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { useRealtimeSubscription } from "@/hooks/use-realtime";
import { supabase } from "@/integrations/supabase/client";
import { fetchShipmentsByStore, type Shipment } from "@/lib/delivery";
import { fetchMyStore } from "@/lib/sooqy";
import { ErrorState } from "@/components/sooqy/error-state";
import { formatDate } from "@/lib/market";
import { PageHeader } from "@/components/sooqy/page-header";
import { EmptyState } from "@/components/sooqy/empty-state";
import { DashboardLoadingSkeleton } from "@/components/sooqy/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/shipments")({
  component: StudioShipmentsPage,
});

function StudioShipmentsPage() {
  const { t } = useTranslation();
  const { user, ready } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // رقم المتجر من سجل المتجر الفعلي (user_metadata.store_id لا يُضبط في أي مكان)
  const myStore = useQuery({
    queryKey: ["my-store"],
    queryFn: fetchMyStore,
    enabled: ready && !!user,
  });
  const storeId = myStore.data?.id;

  // نجلب كل الشحنات مرة واحدة ونفلتر محليًا: تبقى عدّادات الحالات صحيحة أثناء الفلترة
  const {
    data: shipments = [],
    isLoading: shipmentsLoading,
    error: shipmentsError,
    refetch,
  } = useQuery({
    queryKey: ["store-shipments", storeId],
    queryFn: () => fetchShipmentsByStore(storeId as string),
    enabled: ready && !!user && !!storeId,
  });
  const isLoading = myStore.isLoading || shipmentsLoading;
  const error = myStore.error ?? shipmentsError;

  // تحديثات حية: شحنات المتجر (Supabase Realtime)
  useRealtimeSubscription({
    table: "shipments",
    queryKeys: [["store-shipments"]],
    enabled: ready && !!user && !!storeId,
  });

  if (!ready) return null;
  if (!user) {
    return (
      <div className="p-6 text-center">
        <PageHeader title={t("studio_shipments")} back="/studio" />
        <div className="text-danger-foreground">{t("studio_login_shipments")}</div>
        <Link to="/auth" className="btn-primary mt-4 inline-block">
          {t("studio_auth_login")}
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <PageHeader title={t("studio_shipments")} back="/studio" />
        <ErrorState scope="studio:shipments" error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  if (isLoading) {
    return <DashboardLoadingSkeleton cards={2} />;
  }

  if (!storeId) {
    return (
      <div className="p-6 text-center">
        <PageHeader title={t("studio_shipments")} back="/studio" />
        <div className="text-danger-foreground">{t("studio_no_store_linked")}</div>
      </div>
    );
  }

  const statusCounts = {
    pending: (shipments ?? []).filter((s) => s.status === "pending").length,
    accepted: (shipments ?? []).filter((s) => s.status === "accepted").length,
    picked_up: (shipments ?? []).filter((s) => s.status === "picked_up").length,
    in_transit: (shipments ?? []).filter((s) => s.status === "in_transit").length,
    delivered: (shipments ?? []).filter((s) => s.status === "delivered").length,
    failed: (shipments ?? []).filter((s) => s.status === "failed").length,
    returned: (shipments ?? []).filter((s) => s.status === "returned").length,
  };

  const filteredShipments =
    (statusFilter ? (shipments ?? []).filter((s) => s.status === statusFilter) : shipments) ?? [];

  return (
    <div className="min-h-dvh bg-background pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader title={t("studio_shipments")} back="/studio" />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-3 sm:space-y-5 sm:px-6 sm:py-5">
        {/* ملخص الحالات */}
        <section className="rounded-[var(--radius-card)] border border-border bg-card p-3.5 text-foreground sm:p-5">
          <p className="text-caption font-extrabold tracking-[0.2em] text-accent-ink">
            AROWND · DELIVERY
          </p>
          <h2 className="mt-1 text-xl font-black">{t("studio_shipments_heading")}</h2>
          <p className="mt-1 text-xs text-foreground/60">{t("studio_shipments_intro")}</p>
        </section>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible">
          {[
            {
              key: null,
              label: t("shipment_status_all"),
              count: (shipments ?? []).length,
              color: "border-accent-ink bg-primary-soft text-accent-ink",
            },
            {
              key: "pending",
              label: t("shipment_status_pending"),
              count: statusCounts.pending,
              color: "bg-warning-soft text-warning",
            },
            {
              key: "accepted",
              label: t("shipment_status_accepted"),
              count: statusCounts.accepted,
              color: "bg-primary-soft text-accent-ink",
            },
            {
              key: "picked_up",
              label: t("shipment_status_picked_up"),
              count: statusCounts.picked_up,
              color: "bg-primary-soft text-accent-ink",
            },
            {
              key: "in_transit",
              label: t("shipment_status_in_transit"),
              count: statusCounts.in_transit,
              color: "bg-primary-soft text-accent-ink",
            },
            {
              key: "delivered",
              label: t("shipment_status_delivered"),
              count: statusCounts.delivered,
              color: "bg-success-soft text-success",
            },
            {
              key: "failed",
              label: t("shipment_status_failed"),
              count: statusCounts.failed,
              color: "bg-danger-soft text-danger",
            },
            {
              key: "returned",
              label: t("shipment_status_returned"),
              count: statusCounts.returned,
              color: "bg-danger-soft text-danger",
            },
          ].map((item) => (
            <button
              key={item.key ?? "all"}
              onClick={() => setStatusFilter(item.key ?? null)}
              className={cn(
                "min-h-11 min-w-max shrink-0 rounded-2xl border px-3 py-2 text-xs font-extrabold transition-colors",
                item.color,
                statusFilter === item.key ? "ring-2 ring-primary" : "",
              )}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>

        {/* قائمة الشحنات */}
        <div className="space-y-3">
          {(filteredShipments ?? []).length === 0 ? (
            <EmptyState
              Icon={Truck}
              title={t("studio_no_shipments")}
              hint={t("shipment_empty_hint")}
            />
          ) : (
            (filteredShipments ?? []).map((shipment) => (
              <ShipmentRow key={shipment.id} shipment={shipment} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function BadgeStatus({ status }: { status: string }) {
  const { t } = useTranslation();
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
      {t(`shipment_status_${status}`)}
    </span>
  );
}

function ShipmentRow({
  shipment,
}: {
  shipment: Shipment & { order?: { id: string; full_name: string; phone: string; total: number } };
}) {
  const { t } = useTranslation();
  const order = shipment.order;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-card p-3.5 transition-colors hover:border-primary/40 sm:p-5">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-semibold text-foreground">
            {order?.full_name ?? t("shipment_customer")}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("studio_order_hash", { id: order?.id?.slice(-6) ?? shipment.id.slice(-6) })}
          </div>
        </div>
        <BadgeStatus status={shipment.status} />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl bg-muted/40 p-3 text-xs sm:grid-cols-4 sm:text-sm">
        <div className="text-muted-foreground">{t("studio_phone")}</div>
        <div className="font-semibold text-foreground">{order?.phone ?? "—"}</div>
        <div className="text-muted-foreground">{t("studio_amount")}</div>
        <div className="font-semibold text-foreground">{order?.total ?? 0} {t("currency_dzd")}</div>
        <div className="text-muted-foreground">{t("studio_company")}</div>
        <div className="font-semibold text-foreground">{shipment.company_id?.slice(-4) ?? "—"}</div>
        <div className="text-muted-foreground">{t("studio_created_at")}</div>
        <div className="font-semibold text-foreground">{formatDate(shipment.created_at)}</div>
      </div>

      <div className="flex gap-2">
        {order?.id && (
          <Link
            to="/studio/orders/$orderId"
            params={{ orderId: order.id }}
            className="flex min-h-[var(--control-height-compact)] flex-1 items-center justify-center rounded-[var(--radius-control)] bg-primary px-3 py-2 text-sm font-extrabold text-primary-foreground transition active:scale-[.98]"
          >
            {t("shipment_view_order")}
          </Link>
        )}
      </div>
    </div>
  );
}
