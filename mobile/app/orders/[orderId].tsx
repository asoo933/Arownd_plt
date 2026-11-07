import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { CustomerHeading, CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
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
    <Pressable onPress={() => router.push("/login")} style={styles.secondary}><Text style={styles.secondaryText}>{translate("login")}</Text></Pressable>
  </CustomerScreen>;
  if (!query.data) return <CustomerScreen>
    <ErrorState title={translate("ordersLoadError")} retryLabel={translate("retry")} onRetry={() => void query.refetch()} />
  </CustomerScreen>;
  const order = query.data.order;
  if (!order) return <CustomerScreen>
    <CustomerHeading title={translate("orderDetailsTitle")} />
    <EmptyState title={translate("orderNotFound")} hint={translate("orderNotFoundHint")} />
    <Pressable onPress={() => router.replace("/orders")} style={styles.secondary}><Text style={styles.secondaryText}>{translate("ordersTitle")}</Text></Pressable>

  </CustomerScreen>;

  const merchantOrders = order.merchant_orders;
  const showParentTimeline = merchantOrders.length === 0;
  const parentCancelled = order.status === "cancelled" || order.status === "rejected";
  const activeStep = getOrderTrackingSteps(order.status);
  const orderCode = order.id.replace(/-/g, "").slice(0, 8).toUpperCase();

  return <CustomerScreen>
    <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ {translate("back")}</Text></Pressable>
    <CustomerHeading title={translate("orderDetailsTitle")} subtitle={translate("ordersCode") + ": " + orderCode} />

    <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <Text style={styles.sectionTitle}>{translate("orderSummary")}</Text>
      <View style={styles.totalRow}><Text style={styles.label}>{translate("orderTotal")}</Text><Text style={styles.total}>{formatDZD(order.total)}</Text></View>
      <Text style={styles.meta}>{dateLabel(order.created_at)}</Text>
    </View>

    {showParentTimeline ? <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <Text style={styles.sectionTitle}>{translate("orderProgress")}</Text>
      {parentCancelled ? <Text style={styles.cancelled}>{statusLabel(order.status)}</Text> : STEPS.map((step, index) => {
        const complete = index <= activeStep;
        return <View key={step.status} style={styles.step}>
          <View style={[styles.stepDot, complete && styles.stepDone]}><Text style={[styles.stepNumber, complete && styles.stepNumberDone]}>{complete ? "✓" : String(index + 1)}</Text></View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.foreground }]}>{translate(step.title)}</Text>
            <Text style={styles.meta}>{translate(step.hint)}</Text>
          </View>
        </View>;
      })}
    </View> : <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <Text style={styles.sectionTitle}>{translate("orderPerStoreProgress")}</Text>
      <Text style={styles.meta}>{translate("orderPerStoreHint")}</Text>
    </View>}

    {merchantOrders.length === 0 ? <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <Text style={styles.sectionTitle}>{translate("orderItemsTitle")}</Text>
      {order.items.map((item) => <View key={item.id} style={styles.itemRow}>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: theme.colors.foreground }]}>{item.product_name ?? translate("cartUnknownStore")}</Text>
          <Text style={styles.meta}>{translate("ordersQuantity")}: {item.quantity}</Text>
          {Object.entries(readCartOptions(item.options)).length > 0 ? <Text style={styles.meta}>{Object.entries(readCartOptions(item.options)).map(([key, value]) => (key === "size" ? translate("productSizeOption") : key === "color" ? translate("productColorOption") : key) + ": " + value).join(" · ")}</Text> : null}
        </View>
        <Text style={styles.itemPrice}>{formatDZD(item.unit_price * item.quantity)}</Text>
      </View>)}
      <View style={styles.totalRow}><Text style={styles.label}>{translate("orderSubtotal")}</Text><Text style={styles.label}>{formatDZD(order.subtotal)}</Text></View>
      <View style={styles.totalRow}><Text style={styles.label}>{translate("orderShipping")}</Text><Text style={styles.label}>{formatDZD(order.shipping_fee)}</Text></View>
    </View> : null}

    {merchantOrders.map((merchantOrder) => {
      const tone = getOrderStatusTone(merchantOrder.status);
      const cancelled = merchantOrder.status === "cancelled" || merchantOrder.status === "rejected";
      const subTotal = cancelled ? 0 : merchantOrder.subtotal + merchantOrder.shipping_fee;
      return <View key={merchantOrder.id} style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.merchantHeader}>
          <Text style={styles.sectionTitle}>{merchantOrder.store?.name ?? translate("ordersStore")}</Text>
          <View style={[styles.status, tone === "success" ? styles.statusSuccess : tone === "danger" ? styles.statusDanger : tone === "pending" ? styles.statusPending : styles.statusMuted]}>
            <Text style={styles.statusText}>{statusLabel(merchantOrder.status)}</Text>
          </View>
        </View>
        {merchantOrder.items.map((item) => <View key={item.id} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { color: theme.colors.foreground }]}>{item.product_name ?? translate("cartUnknownStore")}</Text>
            
          </View>
          <Text style={styles.itemPrice}>{formatDZD(item.unit_price * item.quantity)}</Text>
        </View>)}
        <View style={styles.totalRow}><Text style={styles.label}>{translate("orderStoreSubtotal")}</Text><Text style={styles.label}>{formatDZD(merchantOrder.subtotal)}</Text></View>
        {merchantOrder.status !== "pending" ? <View style={styles.totalRow}><Text style={styles.label}>{translate("orderShipping")}</Text><Text style={styles.label}>{formatDZD(merchantOrder.shipping_fee)}</Text></View> : null}
        {!cancelled ? <View style={styles.totalRow}><Text style={styles.sectionTitle}>{translate("orderStoreTotal")}</Text><Text style={styles.total}>{formatDZD(subTotal)}</Text></View> : null}
        {canCancelMerchantOrder(merchantOrder.status, merchantOrder.quoted_at) ? <Pressable
          disabled={cancelMutation.isPending}
          onPress={() => setCancelTarget({ type: "merchant", id: merchantOrder.id })}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>{translate("orderCancelStore")}</Text>
        </Pressable> : null}
        {merchantOrder.status === "quoted" ? <>
          <Text style={styles.notice}>{translate("orderQuoteAwaiting")}</Text>
          <View style={styles.quoteActions}>
            <Pressable
              disabled={quoteMutation.isPending}
              onPress={() => quoteMutation.mutate({ merchantOrderId: merchantOrder.id, accept: true })}
              style={styles.acceptButton}
            >
              {quoteMutation.isPending ? <ActivityIndicator color={theme.colors.foreground} /> : <Text style={styles.acceptButtonText}>{translate("orderQuoteAccept")}</Text>}
            </Pressable>
            <Pressable
              disabled={quoteMutation.isPending}
              onPress={() => setDeclineTarget(merchantOrder.id)}
              style={styles.declineButton}
            >
              <Text style={styles.declineButtonText}>{translate("orderQuoteDecline")}</Text>
            </Pressable>
          </View>
          {quoteMutation.isError ? <Text style={styles.errorText}>{translate("orderQuoteResponseError")}</Text> : null}
        </> : null}
        {(query.data.trackingEvents.find((entry) => entry.merchantOrderId === merchantOrder.id)?.events ?? []).map((event) => (
          <View key={event.id} style={styles.trackingEvent}>
            <Text style={styles.shipmentStatus}>{statusLabel(event.status)}</Text>
            <Text style={styles.meta}>{dateLabel(event.created_at)}</Text>
            {event.note ? <Text style={styles.meta}>{event.note}</Text> : null}
          </View>
        ))}
        {order.delivery_type === "desk" && merchantOrder.store?.address_line ? <Text style={styles.meta}>{translate("orderPickupAddress")}: {merchantOrder.store.address_line} · {merchantOrder.store.commune ?? ""}</Text> : null}
      </View>;
    })}

    <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <Text style={styles.sectionTitle}>{translate("orderRecipientTitle")}</Text>
      <Text style={[styles.recipient, { color: theme.colors.foreground }]}>{order.full_name ?? ""}</Text>
      <Text style={styles.meta}>{order.wilaya?.name_ar ?? ""} · {order.commune ?? ""}</Text>
      {order.delivery_type === "home" && order.address_line ? <Text style={styles.meta}>{order.address_line}</Text> : null}
      <Text style={styles.meta}>{order.phone ?? ""}</Text>
      <Text style={styles.meta}>{order.delivery_type === "desk" ? translate("checkoutStorePickup") : translate("checkoutHomeDelivery")}</Text>
      <Text style={styles.meta}>{translate("orderPayment")}: {order.payment_method === "cod" ? translate("checkoutCodNote") : order.payment_method ?? ""}</Text>
    </View>

    {query.data.shipments.length > 0 ? <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <Text style={styles.sectionTitle}>{translate("orderShipmentsTitle")}</Text>
      {query.data.shipments.map((shipment) => <View key={shipment.id} style={styles.shipment}>
        <Text style={styles.shipmentStatus}>{statusLabel(shipment.status)}</Text>
        {shipment.updated_at ? <Text style={styles.meta}>{translate("orderUpdatedAt")}: {dateLabel(shipment.updated_at)}</Text> : null}
        {shipment.notes ? <Text style={styles.meta}>{shipment.notes}</Text> : null}
      </View>)}
    </View> : null}
    {canCancelLegacyOrder(order.status, merchantOrders.length > 0, query.data.shipments.map((shipment) => shipment.status)) ? <Pressable
      disabled={cancelMutation.isPending}
      onPress={() => setCancelTarget({ type: "order", id: order.id })}
      style={styles.cancelButton}
    >
      <Text style={styles.cancelButtonText}>{translate("orderCancel")}</Text>
    </Pressable> : null}
    {cancelMutation.isError ? <Text style={styles.errorText}>{translate("orderCancelError")}</Text> : null}
    <Pressable onPress={() => router.replace("/orders")} style={styles.secondary}><Text style={styles.secondaryText}>{translate("ordersTitle")}</Text></Pressable>
    <Modal visible={cancelTarget !== null} transparent animationType="fade" onRequestClose={() => setCancelTarget(null)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalPanel, { backgroundColor: theme.colors.surface }]}>
          <Text style={styles.sectionTitle}>{translate("orderCancelConfirmTitle")}</Text>
          <Text style={styles.meta}>{translate("orderCancelConfirmHint")}</Text>
          {cancelMutation.isError ? <Text style={styles.errorText}>{translate("orderCancelError")}</Text> : null}
          <View style={styles.quoteActions}>
            <Pressable
              disabled={cancelMutation.isPending}
              onPress={() => { if (cancelTarget) cancelMutation.mutate(cancelTarget); }}
              style={styles.declineButton}
            >
              {cancelMutation.isPending ? <ActivityIndicator color={theme.colors.danger} /> : <Text style={styles.declineButtonText}>{translate("orderCancelConfirmAction")}</Text>}
            </Pressable>
            <Pressable disabled={cancelMutation.isPending} onPress={() => setCancelTarget(null)} style={styles.acceptButton}>
              <Text style={styles.acceptButtonText}>{translate("back")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
    <Modal visible={declineTarget !== null} transparent animationType="fade" onRequestClose={() => setDeclineTarget(null)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalPanel, { backgroundColor: theme.colors.surface }]}>
          <Text style={styles.sectionTitle}>{translate("orderQuoteDeclineConfirmTitle")}</Text>
          <Text style={styles.meta}>{translate("orderQuoteDeclineConfirmHint")}</Text>
          {quoteMutation.isError ? <Text style={styles.errorText}>{translate("orderQuoteResponseError")}</Text> : null}
          <View style={styles.quoteActions}>
            <Pressable
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
              {quoteMutation.isPending ? <ActivityIndicator color={theme.colors.danger} /> : <Text style={styles.declineButtonText}>{translate("orderQuoteDecline")}</Text>}
            </Pressable>
            <Pressable disabled={quoteMutation.isPending} onPress={() => setDeclineTarget(null)} style={styles.acceptButton}>
              <Text style={styles.acceptButtonText}>{translate("back")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </CustomerScreen>;
}

function createStyles(theme: AppTheme) { return StyleSheet.create({
  back: { alignSelf: "flex-start", minHeight: 38, justifyContent: "center" },
  backText: { color: theme.colors.accentMuted, fontSize: 13, fontWeight: "900" },
  panel: { borderRadius: 18, padding: 14, gap: 12 },
  sectionTitle: { color: theme.colors.accentMuted, fontSize: 14, fontWeight: "900", textAlign: "right" },
  totalRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 9 },
  label: { color: theme.colors.muted, fontSize: 12, fontWeight: "700" },
  total: { color: theme.colors.accentMuted, fontSize: 18, fontWeight: "900" },
  meta: { color: theme.colors.muted, fontSize: 11, lineHeight: 18, textAlign: "right" },
  step: { flexDirection: "row-reverse", gap: 11, alignItems: "flex-start" },
  stepDot: { width: 29, height: 29, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" },
  stepDone: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  stepNumber: { color: theme.colors.muted, fontSize: 11, fontWeight: "900" },
  stepNumberDone: { color: theme.colors.foreground },
  stepContent: { flex: 1, gap: 3, alignItems: "flex-end" },
  stepTitle: { fontSize: 12, fontWeight: "900", textAlign: "right" },
  cancelled: { color: theme.colors.danger, fontSize: 13, fontWeight: "900", textAlign: "right" },
  itemRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  itemInfo: { flex: 1, alignItems: "flex-end", gap: 3 },
  itemName: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  itemPrice: { color: theme.colors.accentMuted, fontSize: 12, fontWeight: "900" },
  merchantHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 8 },
  status: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  statusSuccess: { backgroundColor: theme.colors.successSurface },
  statusDanger: { backgroundColor: theme.colors.dangerSurface },
  statusPending: { backgroundColor: theme.colors.warningSurface },
  statusMuted: { backgroundColor: theme.colors.border },
  statusText: { color: theme.colors.foreground, fontSize: 10, fontWeight: "800" },
  notice: { color: theme.colors.warning, fontSize: 11, textAlign: "right", lineHeight: 18 },
  recipient: { fontSize: 13, fontWeight: "900", textAlign: "right" },
  shipment: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 9, gap: 5 },
  trackingEvent: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 9, gap: 4 },
  shipmentStatus: { color: theme.colors.accentMuted, fontSize: 12, fontWeight: "900", textAlign: "right" },
  secondary: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, justifyContent: "center", alignItems: "center" },
  secondaryText: { color: theme.colors.accentMuted, fontSize: 13, fontWeight: "900" },
  quoteActions: { flexDirection: "row-reverse", gap: 8 },
  acceptButton: { flex: 1, minHeight: 45, borderRadius: 12, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center" },
  acceptButtonText: { color: theme.colors.foreground, fontSize: 12, fontWeight: "900" },
  declineButton: { flex: 1, minHeight: 45, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.danger, alignItems: "center", justifyContent: "center" },
  declineButtonText: { color: theme.colors.danger, fontSize: 12, fontWeight: "900" },
  cancelButton: { minHeight: 45, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.danger, justifyContent: "center", alignItems: "center" },
  cancelButtonText: { color: theme.colors.danger, fontSize: 12, fontWeight: "900" },
  errorText: { color: theme.colors.danger, fontSize: 11, textAlign: "right" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalPanel: { borderRadius: 18, padding: 18, gap: 13 }
}); }

