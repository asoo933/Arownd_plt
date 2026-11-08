import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, View } from "react-native";

import { CustomerHeading, CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, Icon, IconButton, OrderStatusBadge as UiOrderStatusBadge, PriceDisplay, PressableSurface, Text as UiText, TrackingTimeline } from "@/components/ui";
import { formatDZD } from "@/lib/catalog";
import { cancelMyMerchantOrder, cancelMyOrder, fetchCustomerOrderDetails, getOrderStatusTone, getOrderTrackingSteps, respondToMerchantQuote } from "@/lib/orders";
import { canCancelLegacyOrder, canCancelMerchantOrder } from "@/lib/orders-state";
import { readCartOptions } from "@/lib/cart-state";
import { getSupabaseClient } from "@/lib/supabase";
import { translate } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";

const STEPS = [
  { status: "pending", title: "orderStepPending" as const, hint: "orderStepPendingHint" as const },
  { status: "confirmed", title: "orderStepConfirmed" as const, hint: "orderStepConfirmedHint" as const },
  { status: "shipped", title: "orderStepShipped" as const, hint: "orderStepShippedHint" as const },
  { status: "delivered", title: "orderStepDelivered" as const, hint: "orderStepDeliveredHint" as const }
];

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: translate("orderStatusPending"),
    quoted: translate("orderStatusQuoted"),
    confirmed: translate("orderStatusConfirmed"),
    shipped: translate("orderStatusShipped"),
    delivered: translate("orderStatusDelivered"),
    cancelled: translate("orderStatusCancelled"),
    rejected: translate("orderStatusRejected"),
    accepted: translate("shipmentStatusAccepted"),
    picked_up: translate("shipmentStatusPickedUp"),
    in_transit: translate("shipmentStatusTransit"),
    failed: translate("shipmentStatusFailed"),
    returned: translate("shipmentStatusReturned"),
    preparing: translate("orderTrackingPreparing"),
    ready_for_dispatch: translate("orderTrackingReady"),
    out_for_delivery: translate("orderTrackingOutForDelivery")
  };
  return labels[status] ?? translate("orderStatusUnknown");
}

function OrderStatusBadge({ status }: { status: string }) {
  const statusTone = getOrderStatusTone(status);
  const tone = statusTone === "success"
    ? "success"
    : statusTone === "danger"
      ? "danger"
      : statusTone === "pending"
        ? "warning"
        : "neutral";

  return <UiOrderStatusBadge label={statusLabel(status)} tone={tone} />;
}

function dateLabel(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function OrderDetailsScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ type: "order" | "merchant"; id: string } | null>(null);
  const quoteMutation = useMutation({
    mutationFn: (input: { merchantOrderId: string; accept: boolean }) =>
      respondToMerchantQuote(input.merchantOrderId, input.accept),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customer-order-details", orderId] });
      await queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
    }
  });
  const cancelMutation = useMutation({
    mutationFn: async (target: { type: "order" | "merchant"; id: string }) => {
      if (target.type === "merchant") await cancelMyMerchantOrder(target.id);
      else await cancelMyOrder(target.id);
    },
    onSuccess: async () => {
      setCancelTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["customer-order-details", orderId] });
      await queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
    }
  });
  const auth = useQuery({
    queryKey: ["customer-order-details-auth"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().auth.getUser();
      if (error) throw error;
      return data.user;
    }
  });
  const query = useQuery({
    queryKey: ["customer-order-details", orderId],
    queryFn: () => fetchCustomerOrderDetails(orderId),
    enabled: Boolean(orderId) && auth.isSuccess && auth.data !== null,
    refetchInterval: 45_000
  });

  useEffect(() => {
    if (!orderId || !auth.data) return;
    const client = getSupabaseClient();
    const channel = client.channel("native-customer-order-" + orderId)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: "id=eq." + orderId }, () => { void query.refetch(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "merchant_orders", filter: "order_id=eq." + orderId }, () => { void query.refetch(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "shipments", filter: "order_id=eq." + orderId }, () => { void query.refetch(); })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [orderId, auth.data?.id, query.refetch]);

  if (auth.isPending || (auth.data && query.isPending)) return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  if (auth.isError || query.isError) return <CustomerScreen>
    <CustomerHeading title={translate("orderDetailsTitle")} />
    <ErrorState title={translate("ordersLoadError")} retryLabel={translate("retry")} onRetry={() => void query.refetch()} />
  </CustomerScreen>;
  if (!auth.data) return <CustomerScreen>
    <CustomerHeading title={translate("orderDetailsTitle")} subtitle={translate("ordersLoginHint")} />
    <PressableSurface accessibilityRole="button" onPress={() => router.push("/login")} style={styles.secondary}><UiText style={styles.secondaryText}>{translate("login")}</UiText></PressableSurface>
  </CustomerScreen>;
  if (!query.data) return <CustomerScreen>
    <ErrorState title={translate("ordersLoadError")} retryLabel={translate("retry")} onRetry={() => void query.refetch()} />
  </CustomerScreen>;
  const order = query.data.order;
  if (!order) return <CustomerScreen>
    <CustomerHeading title={translate("orderDetailsTitle")} />
    <EmptyState title={translate("orderNotFound")} hint={translate("orderNotFoundHint")} />
    <PressableSurface accessibilityRole="button" onPress={() => router.replace("/orders")} style={styles.secondary}><UiText style={styles.secondaryText}>{translate("ordersTitle")}</UiText></PressableSurface>

  </CustomerScreen>;

  const merchantOrders = order.merchant_orders;
  const showParentTimeline = merchantOrders.length === 0;
  const parentCancelled = order.status === "cancelled" || order.status === "rejected";
  const activeStep = getOrderTrackingSteps(order.status);
  const orderCode = order.id.replace(/-/g, "").slice(0, 8).toUpperCase();

  return <CustomerScreen>
    <AppHeader title={translate("orderDetailsTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="arrow-right" size={22} color={theme.colors.foreground} />} />} />
    <UiText style={{ color: theme.colors.muted, fontSize: 12, textAlign: "right" }}>{translate("ordersCode") + ": " + orderCode}</UiText>

    <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <UiText style={styles.sectionTitle}>{translate("orderSummary")}</UiText>
      <View style={styles.totalRow}><UiText style={styles.label}>{translate("orderTotal")}</UiText><PriceDisplay value={formatDZD(order.total)} style={styles.priceDisplay} /></View>
      <UiText style={styles.meta}>{dateLabel(order.created_at)}</UiText>
    </View>

    {showParentTimeline ? <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <UiText style={styles.sectionTitle}>{translate("orderProgress")}</UiText>
      {parentCancelled ? <OrderStatusBadge status={order.status} /> : <TrackingTimeline steps={STEPS.map((step, index) => ({
        key: step.status,
        title: translate(step.title),
        description: translate(step.hint),
        status: index < activeStep ? "complete" as const : index === activeStep ? "current" as const : "upcoming" as const
      }))} />}
    </View> : <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <UiText style={styles.sectionTitle}>{translate("orderPerStoreProgress")}</UiText>
      <UiText style={styles.meta}>{translate("orderPerStoreHint")}</UiText>
    </View>}

    {merchantOrders.length === 0 ? <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <UiText style={styles.sectionTitle}>{translate("orderItemsTitle")}</UiText>
      {order.items.map((item) => <View key={item.id} style={styles.itemRow}>
        <View style={styles.itemInfo}>
          <UiText style={[styles.itemName, { color: theme.colors.foreground }]}>{item.product_name ?? translate("cartUnknownStore")}</UiText>
          <UiText style={styles.meta}>{translate("ordersQuantity")}: {item.quantity}</UiText>
          {Object.entries(readCartOptions(item.options)).length > 0 ? <UiText style={styles.meta}>{Object.entries(readCartOptions(item.options)).map(([key, value]) => (key === "size" ? translate("productSizeOption") : key === "color" ? translate("productColorOption") : key) + ": " + value).join(" · ")}</UiText> : null}
        </View>
        <PriceDisplay value={formatDZD(item.unit_price * item.quantity)} style={styles.itemPriceDisplay} />
      </View>)}
      <View style={styles.totalRow}><UiText style={styles.label}>{translate("orderSubtotal")}</UiText><UiText style={styles.label}>{formatDZD(order.subtotal)}</UiText></View>
      <View style={styles.totalRow}><UiText style={styles.label}>{translate("orderShipping")}</UiText><UiText style={styles.label}>{formatDZD(order.shipping_fee)}</UiText></View>
    </View> : null}

    {merchantOrders.map((merchantOrder) => {
      const tone = getOrderStatusTone(merchantOrder.status);
      const cancelled = merchantOrder.status === "cancelled" || merchantOrder.status === "rejected";
      const subTotal = cancelled ? 0 : merchantOrder.subtotal + merchantOrder.shipping_fee;
      return <View key={merchantOrder.id} style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.merchantHeader}>
          <UiText style={styles.sectionTitle}>{merchantOrder.store?.name ?? translate("ordersStore")}</UiText>
          <StatusBadge
            label={statusLabel(merchantOrder.status)}
            tone={tone === "success" ? "success" : tone === "danger" ? "danger" : tone === "pending" ? "warning" : "neutral"}
          />
        </View>
        {merchantOrder.items.map((item) => <View key={item.id} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <UiText style={[styles.itemName, { color: theme.colors.foreground }]}>{item.product_name ?? translate("cartUnknownStore")}</UiText>
            
          </View>
          <UiText style={styles.itemPrice}>{formatDZD(item.unit_price * item.quantity)}</UiText>
        </View>)}
        <View style={styles.totalRow}><UiText style={styles.label}>{translate("orderStoreSubtotal")}</UiText><UiText style={styles.label}>{formatDZD(merchantOrder.subtotal)}</UiText></View>
        {merchantOrder.status !== "pending" ? <View style={styles.totalRow}><UiText style={styles.label}>{translate("orderShipping")}</UiText><UiText style={styles.label}>{formatDZD(merchantOrder.shipping_fee)}</UiText></View> : null}
        {!cancelled ? <View style={styles.totalRow}><UiText style={styles.sectionTitle}>{translate("orderStoreTotal")}</UiText><UiText style={styles.total}>{formatDZD(subTotal)}</UiText></View> : null}
        {canCancelMerchantOrder(merchantOrder.status, merchantOrder.quoted_at) ? <PressableSurface
          disabled={cancelMutation.isPending}
          onPress={() => setCancelTarget({ type: "merchant", id: merchantOrder.id })}
          style={styles.cancelButton}
        >
          <UiText style={styles.cancelButtonText}>{translate("orderCancelStore")}</UiText>
        </PressableSurface> : null}
        {merchantOrder.status === "quoted" ? <>
          <UiText style={styles.notice}>{translate("orderQuoteAwaiting")}</UiText>
          <View style={styles.quoteActions}>
            <PressableSurface
              disabled={quoteMutation.isPending}
              onPress={() => quoteMutation.mutate({ merchantOrderId: merchantOrder.id, accept: true })}
              style={styles.acceptButton}
            >
              {quoteMutation.isPending ? <ActivityIndicator color={theme.colors.foreground} /> : <UiText style={styles.acceptButtonText}>{translate("orderQuoteAccept")}</UiText>}
            </PressableSurface>
            <PressableSurface
              disabled={quoteMutation.isPending}
              onPress={() => setDeclineTarget(merchantOrder.id)}
              style={styles.declineButton}
            >
              <UiText style={styles.declineButtonText}>{translate("orderQuoteDecline")}</UiText>
            </PressableSurface>
          </View>
          {quoteMutation.isError ? <UiText style={styles.errorText}>{translate("orderQuoteResponseError")}</UiText> : null}
        </> : null}
        {(query.data.trackingEvents.find((entry) => entry.merchantOrderId === merchantOrder.id)?.events ?? []).map((event) => (
          <View key={event.id} style={styles.trackingEvent}>
            <OrderStatusBadge status={event.status} />
            <UiText style={styles.meta}>{dateLabel(event.created_at)}</UiText>
            {event.note ? <UiText style={styles.meta}>{event.note}</UiText> : null}
          </View>
        ))}
        {order.delivery_type === "desk" && merchantOrder.store?.address_line ? <UiText style={styles.meta}>{translate("orderPickupAddress")}: {merchantOrder.store.address_line} · {merchantOrder.store.commune ?? ""}</UiText> : null}
      </View>;
    })}

    <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <UiText style={styles.sectionTitle}>{translate("orderRecipientTitle")}</UiText>
      <UiText style={[styles.recipient, { color: theme.colors.foreground }]}>{order.full_name ?? ""}</UiText>
      <UiText style={styles.meta}>{order.wilaya?.name_ar ?? ""} · {order.commune ?? ""}</UiText>
      {order.delivery_type === "home" && order.address_line ? <UiText style={styles.meta}>{order.address_line}</UiText> : null}
      <UiText style={styles.meta}>{order.phone ?? ""}</UiText>
      <UiText style={styles.meta}>{order.delivery_type === "desk" ? translate("checkoutStorePickup") : translate("checkoutHomeDelivery")}</UiText>
      <UiText style={styles.meta}>{translate("orderPayment")}: {order.payment_method === "cod" ? translate("checkoutCodNote") : order.payment_method ?? ""}</UiText>
    </View>

    {query.data.shipments.length > 0 ? <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <UiText style={styles.sectionTitle}>{translate("orderShipmentsTitle")}</UiText>
      {query.data.shipments.map((shipment) => <View key={shipment.id} style={styles.shipment}>
        <OrderStatusBadge status={shipment.status} />
        {shipment.updated_at ? <UiText style={styles.meta}>{translate("orderUpdatedAt")}: {dateLabel(shipment.updated_at)}</UiText> : null}
        {shipment.notes ? <UiText style={styles.meta}>{shipment.notes}</UiText> : null}
      </View>)}
    </View> : null}
    {canCancelLegacyOrder(order.status, merchantOrders.length > 0, query.data.shipments.map((shipment) => shipment.status)) ? <PressableSurface
      disabled={cancelMutation.isPending}
      onPress={() => setCancelTarget({ type: "order", id: order.id })}
      style={styles.cancelButton}
    >
      <UiText style={styles.cancelButtonText}>{translate("orderCancel")}</UiText>
    </PressableSurface> : null}
    {cancelMutation.isError ? <UiText style={styles.errorText}>{translate("orderCancelError")}</UiText> : null}
    <PressableSurface accessibilityRole="button" onPress={() => router.replace("/orders")} style={styles.secondary}><UiText style={styles.secondaryText}>{translate("ordersTitle")}</UiText></PressableSurface>
    <Modal visible={cancelTarget !== null} transparent animationType="fade" onRequestClose={() => setCancelTarget(null)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalPanel, { backgroundColor: theme.colors.surface }]}>
          <UiText style={styles.sectionTitle}>{translate("orderCancelConfirmTitle")}</UiText>
          <UiText style={styles.meta}>{translate("orderCancelConfirmHint")}</UiText>
          {cancelMutation.isError ? <UiText style={styles.errorText}>{translate("orderCancelError")}</UiText> : null}
          <View style={styles.quoteActions}>
            <PressableSurface
              disabled={cancelMutation.isPending}
              onPress={() => { if (cancelTarget) cancelMutation.mutate(cancelTarget); }}
              style={styles.declineButton}
            >
              {cancelMutation.isPending ? <ActivityIndicator color={theme.colors.danger} /> : <UiText style={styles.declineButtonText}>{translate("orderCancelConfirmAction")}</UiText>}
            </PressableSurface>
            <PressableSurface accessibilityRole="button" disabled={cancelMutation.isPending} onPress={() => setCancelTarget(null)} style={styles.acceptButton}>
              <UiText style={styles.acceptButtonText}>{translate("back")}</UiText>
            </PressableSurface>
          </View>
        </View>
      </View>
    </Modal>
    <Modal visible={declineTarget !== null} transparent animationType="fade" onRequestClose={() => setDeclineTarget(null)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalPanel, { backgroundColor: theme.colors.surface }]}>
          <UiText style={styles.sectionTitle}>{translate("orderQuoteDeclineConfirmTitle")}</UiText>
          <UiText style={styles.meta}>{translate("orderQuoteDeclineConfirmHint")}</UiText>
          {quoteMutation.isError ? <UiText style={styles.errorText}>{translate("orderQuoteResponseError")}</UiText> : null}
          <View style={styles.quoteActions}>
            <PressableSurface
              disabled={quoteMutation.isPending}
              onPress={() => {
                if (declineTarget) {
                  quoteMutation.mutate({ merchantOrderId: declineTarget, accept: false }, {
                    onSuccess: () => setDeclineTarget(null)
                  });
                }
              }}
              style={styles.declineButton}
            >
              {quoteMutation.isPending ? <ActivityIndicator color={theme.colors.danger} /> : <UiText style={styles.declineButtonText}>{translate("orderQuoteDecline")}</UiText>}
            </PressableSurface>
            <PressableSurface accessibilityRole="button" disabled={quoteMutation.isPending} onPress={() => setDeclineTarget(null)} style={styles.acceptButton}>
              <UiText style={styles.acceptButtonText}>{translate("back")}</UiText>
            </PressableSurface>
          </View>
        </View>
      </View>
    </Modal>
  </CustomerScreen>;
}

function createStyles(theme: AppTheme) { return StyleSheet.create({
  back: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  backText: { color: theme.colors.accentMuted, fontSize: 13, fontWeight: "900" },
  panel: { borderRadius: 18, padding: 14, gap: 12 },
  sectionTitle: { color: theme.colors.accentMuted, fontSize: 14, fontWeight: "900", textAlign: "right" },
  totalRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 9 },
  label: { color: theme.colors.muted, fontSize: 12, fontWeight: "700" },
  total: { color: theme.colors.accentMuted, fontSize: 18, fontWeight: "900" },
  priceDisplay: { justifyContent: "flex-start" },
  itemPriceDisplay: { justifyContent: "flex-start" },
  meta: { color: theme.colors.muted, fontSize: 11, lineHeight: 18, textAlign: "right" },
  step: { flexDirection: "row-reverse", gap: 11, alignItems: "flex-start" },
  stepDot: { width: 29, height: 29, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
  stepDone: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  stepNumber: { color: theme.colors.muted, fontSize: 11, fontWeight: "900" },
  stepNumberDone: { color: theme.colors.foreground },
  stepContent: { flex: 1, gap: 3, alignItems: "flex-end" },
  stepTitle: { fontSize: 12, fontWeight: "900", textAlign: "right" },
  itemRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  itemInfo: { flex: 1, alignItems: "flex-end", gap: 3 },
  itemName: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  itemPrice: { color: theme.colors.accentMuted, fontSize: 12, fontWeight: "900" },
  merchantHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 8 },
  notice: { color: theme.colors.warning, fontSize: 11, textAlign: "right", lineHeight: 18 },
  recipient: { fontSize: 13, fontWeight: "900", textAlign: "right" },
  shipment: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 9, gap: 5 },
  trackingEvent: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 9, gap: 4 },
  secondary: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, justifyContent: "center", alignItems: "center" },
  secondaryText: { color: theme.colors.accentMuted, fontSize: 13, fontWeight: "900" },
  quoteActions: { flexDirection: "row-reverse", gap: 8 },
  acceptButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center" },
  acceptButtonText: { color: theme.colors.foreground, fontSize: 12, fontWeight: "900" },
  declineButton: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.danger, alignItems: "center", justifyContent: "center" },
  declineButtonText: { color: theme.colors.danger, fontSize: 12, fontWeight: "900" },
  cancelButton: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.danger, justifyContent: "center", alignItems: "center" },
  cancelButtonText: { color: theme.colors.danger, fontSize: 12, fontWeight: "900" },
  errorText: { color: theme.colors.danger, fontSize: 11, textAlign: "right" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalPanel: { borderRadius: 18, padding: 18, gap: 13 }
}); }

