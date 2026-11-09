import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerHeading, CustomerScreen, EmptyState, ErrorState } from "@/components/customer-ui";
import { AppHeader, ConfirmDialog, Icon, IconButton, OrderStatusBadge as UiOrderStatusBadge, PriceDisplay, PressableSurface, Spinner, OrderCardSkeleton, Text as UiText, TrackingTimeline } from "@/components/ui";
import { formatDZD, formatNumber } from "@/lib/catalog";
import { cancelMyMerchantOrder, cancelMyOrder, fetchCustomerOrderDetails, getOrderStatusTone, getOrderTrackingSteps, respondToMerchantQuote } from "@/lib/orders";
import { canCancelLegacyOrder, canCancelMerchantOrder, formatOrderCode } from "@/lib/orders-state";
import { readCartOptions } from "@/lib/cart-state";
import { getSupabaseClient } from "@/lib/supabase";
import { translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { getLocalizedWilayaLabel } from "@/lib/locale-data";

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

function itemOptionsLabel(options: unknown): string | null {
  const entries = Object.entries(readCartOptions(options));
  if (entries.length === 0) return null;
  return entries.map(([key, value]) => (key === "size" ? translate("productSizeOption") : key === "color" ? translate("productColorOption") : key) + ": " + value).join(" · ");
}

function dateLabel(value: string | null | undefined, language: "ar" | "en"): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "en-DZ", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function OrderDetailsScreen() {
  const { language } = useLanguage();
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

  const userId = auth.data?.id;
  const refetchOrder = query.refetch;

  useEffect(() => {
    if (!orderId || !userId) return;
    const client = getSupabaseClient();
    const channel = client.channel("native-customer-order-" + orderId)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: "id=eq." + orderId }, () => { void refetchOrder(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "merchant_orders", filter: "order_id=eq." + orderId }, () => { void refetchOrder(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "shipments", filter: "order_id=eq." + orderId }, () => { void refetchOrder(); })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [orderId, userId, refetchOrder]);

  if (auth.isPending || (auth.data && query.isPending)) return <CustomerScreen>
    <CustomerHeading title={translate("orderDetailsTitle")} />
    {[0, 1, 2].map((item) => <OrderCardSkeleton key={item} />)}
  </CustomerScreen>;
  if (auth.isError || query.isError) return <CustomerScreen>
    <CustomerHeading title={translate("orderDetailsTitle")} />
    <ErrorState title={translate("ordersLoadError")} retryLabel={translate("retry")} busy={auth.isFetching || query.isFetching} onRetry={() => void query.refetch()} />
  </CustomerScreen>;
  if (!auth.data) return <CustomerScreen>
    <CustomerHeading title={translate("orderDetailsTitle")} subtitle={translate("ordersLoginHint")} />
    <PressableSurface accessibilityRole="button" accessibilityLabel={translate("login")} onPress={() => router.push("/login")} style={styles.secondary}><UiText style={styles.secondaryText}>{translate("login")}</UiText></PressableSurface>
  </CustomerScreen>;
  if (!query.data) return <CustomerScreen>
    <ErrorState title={translate("ordersLoadError")} retryLabel={translate("retry")} busy={query.isFetching} onRetry={() => void query.refetch()} />
  </CustomerScreen>;
  const order = query.data.order;
  if (!order) return <CustomerScreen>
    <CustomerHeading title={translate("orderDetailsTitle")} />
    <EmptyState icon="package" title={translate("orderNotFound")} hint={translate("orderNotFoundHint")} />
    <PressableSurface accessibilityRole="button" accessibilityLabel={translate("ordersTitle")} onPress={() => router.replace("/orders")} style={styles.secondary}><UiText style={styles.secondaryText}>{translate("ordersTitle")}</UiText></PressableSurface>

  </CustomerScreen>;

  const merchantOrders = order.merchant_orders;
  const showParentTimeline = merchantOrders.length === 0;
  const parentCancelled = order.status === "cancelled" || order.status === "rejected";
  const activeStep = getOrderTrackingSteps(order.status);
  const orderCode = formatOrderCode(order.id);

  return <CustomerScreen>
    <AppHeader title={translate("orderDetailsTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" size={22} color={theme.colors.foreground} />} />} />
    <UiText style={{ color: theme.colors.muted, fontSize: designTokens.typography.caption + 1, textAlign: "auto" }}>{translate("ordersCode") + ": " + orderCode}</UiText>

    <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <UiText style={styles.sectionTitle}>{translate("orderSummary")}</UiText>
      <View style={styles.totalRow}><UiText style={styles.label}>{translate("orderTotal")}</UiText><PriceDisplay value={formatDZD(order.total)} style={styles.priceDisplay} /></View>
      <UiText style={styles.meta}>{dateLabel(order.created_at, language)}</UiText>
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
          <UiText style={styles.meta}>{translate("ordersQuantity")}: {formatNumber(item.quantity)}</UiText>
          {Object.entries(readCartOptions(item.options)).length > 0 ? <UiText style={styles.meta}>{Object.entries(readCartOptions(item.options)).map(([key, value]) => (key === "size" ? translate("productSizeOption") : key === "color" ? translate("productColorOption") : key) + ": " + value).join(" · ")}</UiText> : null}
        </View>
        <PriceDisplay value={formatDZD(item.unit_price * item.quantity)} style={styles.itemPriceDisplay} />
      </View>)}
      <View style={styles.totalRow}><UiText style={styles.label}>{translate("orderSubtotal")}</UiText><UiText style={styles.label}>{formatDZD(order.subtotal)}</UiText></View>
      <View style={styles.totalRow}><UiText style={styles.label}>{translate("orderShipping")}</UiText><UiText style={styles.label}>{formatDZD(order.shipping_fee)}</UiText></View>
    </View> : null}

    {merchantOrders.map((merchantOrder) => {
      const cancelled = merchantOrder.status === "cancelled" || merchantOrder.status === "rejected";
      const subTotal = cancelled ? 0 : merchantOrder.subtotal + merchantOrder.shipping_fee;
      return <View key={merchantOrder.id} style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.merchantHeader}>
          <UiText style={styles.sectionTitle}>{merchantOrder.store?.name ?? translate("ordersStore")}</UiText>
          <OrderStatusBadge status={merchantOrder.status} />
        </View>
        {cancelled ? <UiText style={styles.cancelledNotice}>{translate("orderStoreCancelledNotice")}</UiText> : null}
        {merchantOrder.items.map((item) => {
          const optionsLabel = itemOptionsLabel(item.options);
          return <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <UiText style={[styles.itemName, { color: theme.colors.foreground }]}>{item.product_name ?? translate("cartUnknownStore")}</UiText>
              <UiText style={styles.meta}>{translate("ordersQuantity")}: {formatNumber(item.quantity)}</UiText>
              {optionsLabel ? <UiText style={styles.meta}>{optionsLabel}</UiText> : null}
            </View>
            {!cancelled ? <PriceDisplay value={formatDZD(item.unit_price * item.quantity)} style={styles.itemPriceDisplay} /> : null}
          </View>;
        })}
        {!cancelled ? <>
          <View style={styles.totalRow}><UiText style={styles.label}>{translate("orderStoreSubtotal")}</UiText><UiText style={styles.label}>{formatDZD(merchantOrder.subtotal)}</UiText></View>
          {merchantOrder.status !== "pending" ? <View style={styles.totalRow}><UiText style={styles.label}>{translate("orderShipping")}</UiText><UiText style={styles.label}>{formatDZD(merchantOrder.shipping_fee)}</UiText></View> : null}
          <View style={styles.totalRow}><UiText style={styles.sectionTitle}>{translate("orderStoreTotal")}</UiText><UiText style={styles.total}>{formatDZD(subTotal)}</UiText></View>
        </> : null}
        {(merchantOrder.payment_status === "paid" || (!cancelled && merchantOrder.payment_status === "unpaid")) ? <View style={styles.paymentInfo}>
          <View style={styles.totalRow}>
            <UiText style={styles.label}>{translate("orderPaymentStatus")}</UiText>
            <UiText style={[styles.label, merchantOrder.payment_status === "paid" ? styles.paymentPaid : styles.paymentUnpaid]}>{translate(merchantOrder.payment_status === "paid" ? "orderPaymentPaid" : "orderPaymentUnpaid")}</UiText>
          </View>
          {merchantOrder.payment_status === "paid" && merchantOrder.paid_amount != null ? <View style={styles.totalRow}><UiText style={styles.label}>{translate("orderPaidAmount")}</UiText><UiText style={styles.label}>{formatDZD(merchantOrder.paid_amount)}</UiText></View> : null}
          {merchantOrder.payment_status === "paid" && merchantOrder.paid_at ? <UiText style={styles.meta}>{translate("orderPaidAt")}: {dateLabel(merchantOrder.paid_at, language)}</UiText> : null}
        </View> : null}
        {canCancelMerchantOrder(merchantOrder.status, merchantOrder.quoted_at) ? <PressableSurface
          accessibilityLabel={translate("orderCancelStore")}
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
              accessibilityLabel={translate("orderQuoteAccept")}
              disabled={quoteMutation.isPending}
              onPress={() => quoteMutation.mutate({ merchantOrderId: merchantOrder.id, accept: true })}
              style={styles.acceptButton}
            >
              {quoteMutation.isPending ? <Spinner color={theme.colors.foreground} size="small" /> : <UiText style={styles.acceptButtonText}>{translate("orderQuoteAccept")}</UiText>}
            </PressableSurface>
            <PressableSurface
              accessibilityLabel={translate("orderQuoteDecline")}
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
            <UiText style={styles.meta}>{dateLabel(event.created_at, language)}</UiText>
            {event.note ? <UiText style={styles.meta}>{event.note}</UiText> : null}
          </View>
        ))}
        {order.delivery_type === "desk" && merchantOrder.store?.address_line ? <UiText style={styles.meta}>{translate("orderPickupAddress")}: {merchantOrder.store.address_line} · {merchantOrder.store.commune ?? ""}</UiText> : null}
      </View>;
    })}

    <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <UiText style={styles.sectionTitle}>{translate("orderRecipientTitle")}</UiText>
      <UiText style={[styles.recipient, { color: theme.colors.foreground }]}>{order.full_name ?? ""}</UiText>
      <UiText style={styles.meta}>{getLocalizedWilayaLabel(order.wilaya_id ?? 0, order.wilaya?.name_ar ?? "", language, order.wilaya?.name_fr)} · {order.commune ?? ""}</UiText>
      {order.delivery_type === "home" && order.address_line ? <UiText style={styles.meta}>{order.address_line}</UiText> : null}
      <UiText style={styles.meta}>{order.phone ?? ""}</UiText>
      <UiText style={styles.meta}>{order.delivery_type === "desk" ? translate("checkoutStorePickup") : translate("checkoutHomeDelivery")}</UiText>
      <UiText style={styles.meta}>{translate("orderPayment")}: {order.payment_method === "cod" ? translate("checkoutCodNote") : order.payment_method ?? ""}</UiText>
    </View>

    {(merchantOrders.length === 0 ? query.data.shipments : query.data.shipments.filter((shipment) => Boolean(shipment.company_id))).length > 0 ? <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <UiText style={styles.sectionTitle}>{translate("orderShipmentsTitle")}</UiText>
      {(merchantOrders.length === 0 ? query.data.shipments : query.data.shipments.filter((shipment) => Boolean(shipment.company_id))).map((shipment) => <View key={shipment.id} style={styles.shipment}>
        <OrderStatusBadge status={shipment.status} />
        {shipment.updated_at ? <UiText style={styles.meta}>{translate("orderUpdatedAt")}: {dateLabel(shipment.updated_at, language)}</UiText> : null}
        {shipment.notes ? <UiText style={styles.meta}>{shipment.notes}</UiText> : null}
      </View>)}
    </View> : null}
    {canCancelLegacyOrder(order.status, merchantOrders.length > 0, query.data.shipments.map((shipment) => shipment.status)) ? <PressableSurface
      accessibilityLabel={translate("orderCancel")}
      disabled={cancelMutation.isPending}
      onPress={() => setCancelTarget({ type: "order", id: order.id })}
      style={styles.cancelButton}
    >
      <UiText style={styles.cancelButtonText}>{translate("orderCancel")}</UiText>
    </PressableSurface> : null}
    {cancelMutation.isError ? <UiText style={styles.errorText}>{translate("orderCancelError")}</UiText> : null}
    <PressableSurface accessibilityRole="button" onPress={() => router.replace("/orders")} style={styles.secondary}><UiText style={styles.secondaryText}>{translate("ordersTitle")}</UiText></PressableSurface>
    <ConfirmDialog
      visible={cancelTarget !== null}
      onRequestClose={() => setCancelTarget(null)}
      onConfirm={() => { if (cancelTarget) cancelMutation.mutate(cancelTarget); }}
      title={translate("orderCancelConfirmTitle")}
      description={translate("orderCancelConfirmHint")}
      cancelLabel={translate("back")}
      confirmLabel={translate("orderCancelConfirmAction")}
      busy={cancelMutation.isPending}
      destructive
    />
    <ConfirmDialog
      visible={declineTarget !== null}
      onRequestClose={() => setDeclineTarget(null)}
      onConfirm={() => {
        if (declineTarget) {
          quoteMutation.mutate({ merchantOrderId: declineTarget, accept: false }, {
            onSuccess: () => setDeclineTarget(null)
          });
        }
      }}
      title={translate("orderQuoteDeclineConfirmTitle")}
      description={translate("orderQuoteDeclineConfirmHint")}
      cancelLabel={translate("back")}
      confirmLabel={translate("orderQuoteDecline")}
      busy={quoteMutation.isPending}
      destructive
    />
    
  </CustomerScreen>;
}

function createStyles(theme: AppTheme) { return StyleSheet.create({
  panel: { borderRadius: designTokens.radius.md, padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
  sectionTitle: { color: theme.colors.accentMuted, fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: designTokens.spacing.sm },
  label: { color: theme.colors.muted, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.bold },
  total: { color: theme.colors.accentMuted, fontSize: designTokens.typography.subtitle + 2, fontWeight: designTokens.fontWeights.extrabold },
  priceDisplay: { justifyContent: "flex-start" },
  itemPriceDisplay: { justifyContent: "flex-start" },
  meta: { color: theme.colors.muted, fontSize: designTokens.typography.caption, lineHeight: 18, textAlign: "auto" },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md, paddingVertical: designTokens.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  itemInfo: { flex: 1, alignItems: "flex-start", gap: designTokens.spacing.xs },
  itemName: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  merchantHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: designTokens.spacing.sm },
  notice: { color: theme.colors.warning, fontSize: designTokens.typography.caption, textAlign: "auto", lineHeight: 18 },
  cancelledNotice: { color: theme.colors.danger, fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.bold, textAlign: "auto", lineHeight: 18 },
  paymentInfo: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: designTokens.spacing.sm, gap: designTokens.spacing.xs },
  paymentPaid: { color: theme.colors.success },
  paymentUnpaid: { color: theme.colors.warning },
  recipient: { fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  shipment: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: designTokens.spacing.sm, gap: designTokens.spacing.xs },
  trackingEvent: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: designTokens.spacing.sm, gap: designTokens.spacing.xs },
  secondary: { minHeight: designTokens.dimensions.controlHeight.lg, borderRadius: designTokens.radius.md, borderWidth: 1, borderColor: theme.colors.border, justifyContent: "center", alignItems: "center" },
  secondaryText: { color: theme.colors.accentMuted, fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.extrabold },
  quoteActions: { flexDirection: "row", gap: designTokens.spacing.sm },
  acceptButton: { flex: 1, minHeight: designTokens.dimensions.controlHeight.lg, borderRadius: designTokens.radius.sm, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center" },
  acceptButtonText: { color: theme.colors.foreground, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
  declineButton: { flex: 1, minHeight: designTokens.dimensions.controlHeight.lg, borderRadius: designTokens.radius.sm, borderWidth: 1, borderColor: theme.colors.danger, alignItems: "center", justifyContent: "center" },
  declineButtonText: { color: theme.colors.danger, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
  cancelButton: { minHeight: designTokens.dimensions.controlHeight.lg, borderRadius: designTokens.radius.sm, borderWidth: 1, borderColor: theme.colors.danger, justifyContent: "center", alignItems: "center" },
  cancelButtonText: { color: theme.colors.danger, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
  errorText: { color: theme.colors.danger, fontSize: designTokens.typography.caption, textAlign: "auto" },
}); }

