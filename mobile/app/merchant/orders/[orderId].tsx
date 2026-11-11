import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatMarketPrice, formatNumber } from "@/lib/catalog";
import {
  collectMerchantOrderCod,
  fetchMerchantAccess,
  fetchMerchantOrderDetails,
  rejectMerchantOrder,
  submitMerchantOrderQuote,
  updateMerchantOrderTracking,
  type MerchantTrackingStatus
} from "@/lib/merchant";
import { canCollectMerchantOrderCod, canManageMerchantOrderFulfillment, getNextMerchantTrackingStatus } from "@/lib/merchant-dashboard-state";
import { readCartOptions } from "@/lib/cart-state";
import { translate, type TranslationKey, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { getLocalizedWilayaLabel } from "@/lib/locale-data";
import { Alert, AppHeader, Button, ConfirmDialog, ErrorState, MerchantOrderCard, MerchantStatusBadge, PriceDisplay, OrderCardSkeleton, Text as UiText, TextField, TrackingTimeline } from "@/components/ui";

type ConfirmAction = "reject" | "collect" | null;

const trackingTranslationKeys: Record<MerchantTrackingStatus, TranslationKey> = {
  preparing: "merchantTrackingPreparing",
  ready_for_dispatch: "merchantTrackingReady",
  out_for_delivery: "merchantTrackingOutForDelivery",
  delivered: "merchantTrackingDelivered"
};

export default function MerchantOrderDetailsScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const [shippingFee, setShippingFee] = useState("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const access = useQuery({
    queryKey: ["merchant-access"],
    queryFn: fetchMerchantAccess,
    retry: false
  });
  const storeId = access.data?.store?.id ?? null;
  const isReady = access.data?.status === "merchant_ready" && !!storeId && !!orderId;

  const detail = useQuery({
    queryKey: ["merchant-order-detail", storeId, orderId],
    queryFn: () => fetchMerchantOrderDetails(orderId ?? "", storeId ?? ""),
    enabled: isReady,
    retry: false
  });

  const merchantOrder = detail.data?.merchantOrder;
  const deliveryType = merchantOrder?.order.delivery_type;
  const trackingEvents = detail.data?.trackingEvents ?? [];
  const trackingSteps = trackingEvents.map((event, index) => ({
    key: event.id,
    title: translate(trackingTranslationKeys[event.status]),
    description: new Date(event.created_at).toLocaleString(language === "ar" ? "ar-DZ" : "en-DZ"),
    status: index === trackingEvents.length - 1 ? "current" as const : "complete" as const
  }));
  const latestTrackingStatus = trackingEvents[trackingEvents.length - 1]?.status
    ?? (merchantOrder?.status === "delivered"
      ? "delivered"
      : merchantOrder?.status === "shipped"
        ? deliveryType === "desk" ? "ready_for_dispatch" : "out_for_delivery"
        : "confirmed");
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["merchant-order-detail", storeId, orderId] }),
      queryClient.invalidateQueries({ queryKey: ["merchant-dashboard", storeId] })
    ]);
  };

  const quoteMutation = useMutation({
    mutationFn: (fee: number) => submitMerchantOrderQuote(orderId ?? "", fee),
    onSuccess: async () => {
      setActionError(null);
      await refresh();
    },
    onError: (error) => setActionError(getErrorMessage(error))
  });

  const actionMutation = useMutation({
    mutationFn: async (action: Exclude<ConfirmAction, null>) => {
      if (action === "reject") await rejectMerchantOrder(orderId ?? "");
      else await collectMerchantOrderCod(orderId ?? "");
    },
    onSuccess: async () => {
      setConfirmAction(null);
      setActionError(null);
      await refresh();
    },
    onError: (error) => setActionError(getErrorMessage(error))
  });

  const statusMutation = useMutation({
    mutationFn: (status: MerchantTrackingStatus) => updateMerchantOrderTracking(orderId ?? "", status),
    onSuccess: async () => {
      setActionError(null);
      await refresh();
    },
    onError: (error) => setActionError(getErrorMessage(error))
  });

  if (access.isPending) return <LoadingScreen theme={theme} label={translate("merchantLoading")} />;
  if (access.isError) {
    return <MessageScreen theme={theme} title={translate("merchantLoadError")} actionLabel={translate("merchantRetry")} busy={access.isFetching} onAction={() => void access.refetch()} />;
  }
  if (!access.data) return <Redirect href="/login" />;
  if (!isReady) return <Redirect href="/merchant" />;

  if (detail.isPending) return <LoadingScreen theme={theme} label={translate("merchantOrderDetailLoading")} />;
  if (detail.isError || !detail.data) {
    return <MessageScreen theme={theme} title={translate("merchantOrderDetailError")} actionLabel={translate("merchantRetry")} busy={detail.isFetching} onAction={() => void detail.refetch()} />;
  }

  const order = detail.data.merchantOrder;
  const customerOrder = order.order;
  const total = order.subtotal + order.shipping_fee;
  const canManageFulfillment = canManageMerchantOrderFulfillment(order.status) && customerOrder.status !== "cancelled";
  const nextStatus = canManageFulfillment
    ? getNextMerchantTrackingStatus(latestTrackingStatus, deliveryType ?? "")
    : null;
  const nextStatusLabel = nextStatus ? trackingTranslationKeys[nextStatus] : null;
  const canCollectCod = canCollectMerchantOrderCod(order.status, order.payment_status, deliveryType ?? "", false);
  const canQuote = customerOrder.status !== "cancelled" && order.status === "pending" && !order.quoted_at;
  const canReject = canQuote;

  const sendQuote = () => {
    const fee = deliveryType === "desk" ? 0 : Number(shippingFee);
    if (!Number.isInteger(fee) || fee < 0 || fee > 1_000_000 || (deliveryType === "home" && shippingFee.trim() === "")) {
      setActionError(translate("merchantQuoteInvalidFee"));
      return;
    }
    setActionError(null);
    quoteMutation.mutate(fee);
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title={translate("merchantOrderDetailTitle")} leading={<Button label={translate("merchantOrderDetailBack")} onPress={() => router.back()} variant="ghost" size="sm" />} />
        <UiText style={[styles.eyebrow, { color: theme.colors.accentMuted }]}>{translate("merchantOrderNumber")} {customerOrder.id.slice(0, 8)}</UiText>
        <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{new Date(customerOrder.created_at).toLocaleString(language === "ar" ? "ar-DZ" : "en-DZ")}</UiText>

        <MerchantOrderCard>
          <View style={styles.summaryRow}>
            <UiText style={[styles.amount, { color: theme.colors.accentMuted }]}>{formatMarketPrice(total, customerOrder.currency_code ?? "DZD")}</UiText>
            <StatusPill status={order.status} deliveryType={deliveryType ?? "home"} />
          </View>
          <View style={styles.sectionHeading}>
            <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantOrderItems")}</UiText>
            <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{formatNumber(detail.data.items.length)} {translate("merchantOrderItems")}</UiText>
          </View>
          {detail.data.items.length === 0 ? (
            <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantOrderItemsUnavailable")}</UiText>
          ) : detail.data.items.map((item) => (
            <View key={item.id} style={[styles.itemRow, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.itemInfo}>
                <UiText style={[styles.itemName, { color: theme.colors.foreground }]}>{item.product_name || translate("merchantOrderItems")}</UiText>
                <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantOrderQuantity")}: {formatNumber(item.quantity)}</UiText>
                {Object.entries(readCartOptions(item.options)).length > 0 ? <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{Object.entries(readCartOptions(item.options)).map(([key, value]) => (key === "size" ? translate("productSizeOption") : key === "color" ? translate("productColorOption") : key) + ": " + value).join(" · ")}</UiText> : null}
              </View>
              <PriceDisplay value={formatMarketPrice(item.unit_price * item.quantity, customerOrder.currency_code ?? "DZD")} style={styles.itemPriceDisplay} />
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
            <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantOrderSubtotal")}</UiText>
            <UiText style={[styles.valueText, { color: theme.colors.foreground }]}>{formatMarketPrice(order.subtotal, customerOrder.currency_code ?? "DZD")}</UiText>
          </View>
          <View style={styles.totalRow}>
            <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantOrderShippingFee")}</UiText>
            <UiText style={[styles.valueText, { color: theme.colors.foreground }]}>{formatMarketPrice(order.shipping_fee, customerOrder.currency_code ?? "DZD")}</UiText>
          </View>
          <View style={styles.totalRow}>
            <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantOrderTotal")}</UiText>
            <UiText style={[styles.amount, { color: theme.colors.accentMuted }]}>{formatMarketPrice(total, customerOrder.currency_code ?? "DZD")}</UiText>
          </View>
        </MerchantOrderCard>

        <MerchantOrderCard>
          <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantOrderCustomerTitle")}</UiText>
          <InfoRow label={translate("merchantCustomerUnknown")} value={customerOrder.full_name || "—"} theme={theme} />
          <InfoRow label={translate("merchantOrderPhone")} value={customerOrder.phone || "—"} theme={theme} />
          <InfoRow label={translate("merchantStoreWilayaLabel")} value={getLocalizedWilayaLabel(customerOrder.wilaya_id ?? 0, customerOrder.wilaya?.name_ar ?? "—", language, customerOrder.wilaya?.name_fr)} theme={theme} />
          <InfoRow label={translate("checkoutDaira")} value={customerOrder.daira ? (language === "ar" ? customerOrder.daira.name_ar : customerOrder.daira.name_fr ?? customerOrder.daira.name_ar) : "—"} theme={theme} />
          <InfoRow label={translate("merchantStoreCommuneLabel")} value={customerOrder.commune || "—"} theme={theme} />
          <InfoRow label={translate("merchantStoreAddressLabel")} value={customerOrder.address_line || "—"} theme={theme} />
          <InfoRow label={translate("merchantOrderDeliveryType")} value={deliveryType === "desk" ? translate("checkoutStorePickup") : translate("checkoutHomeDelivery")} theme={theme} />
          <InfoRow label={translate("merchantOrderPaymentMethod")} value={customerOrder.payment_method === "cod" ? translate("checkoutPaymentCod") : customerOrder.payment_method || "—"} theme={theme} />
          {detail.data.shipment ? (
            <InfoRow label={translate("merchantOrderShipmentStatus")} value={merchantShipmentStatusLabel(detail.data.shipment.status)} theme={theme} />
          ) : null}
        </MerchantOrderCard>

        {canQuote ? (
          <MerchantOrderCard>
            <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantQuoteTitle")}</UiText>
            {deliveryType === "desk" ? (
              <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantQuotePickupHint")}</UiText>
            ) : (
              <>
                <UiText style={[styles.fieldLabel, { color: theme.colors.foreground }]}>{translate("merchantOrderShippingFee")}</UiText>
                <TextField
                  value={shippingFee}
                  onChangeText={setShippingFee}
                  keyboardType="number-pad"
                  placeholder={translate("merchantQuoteShippingPlaceholder")}
                  placeholderTextColor={theme.colors.placeholder}
                  style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.inputBorder, color: theme.colors.foreground }]}
                  textAlign="auto"
                />
              </>
            )}
            <Button label={translate("merchantQuoteSend")} onPress={sendQuote} loading={quoteMutation.isPending} fullWidth />
            {canReject ? (
              <Button label={translate("merchantOrderReject")} onPress={() => setConfirmAction("reject")} variant="danger" fullWidth />
            ) : null}
          </MerchantOrderCard>
        ) : null}

        {order.status === "quoted" ? (
          <Alert description={translate("merchantQuoteAwaitingCustomer")} tone="warning" />
        ) : null}

        <MerchantOrderCard>
          <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantTrackingTitle")}</UiText>
          {trackingEvents.length === 0 ? (
            <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantTrackingEmpty")}</UiText>
          ) : <TrackingTimeline steps={trackingSteps} />}
        </MerchantOrderCard>

        {nextStatus && nextStatusLabel ? (
          <MerchantOrderCard>
            <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantFulfillmentTitle")}</UiText>
            <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>
              {nextStatus === "delivered" && deliveryType === "desk"
                ? translate("merchantMarkPickupDeliveredHint")
                : translate("merchantMarkShippedHint")}
            </UiText>
            <Button label={translate("merchantTrackingAdvance") + ": " + translate(nextStatusLabel)} onPress={() => statusMutation.mutate(nextStatus)} loading={statusMutation.isPending} fullWidth />
          </MerchantOrderCard>
        ) : null}

        {canCollectCod ? (
          <MerchantOrderCard>
            <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantCodTitle")}</UiText>
            <UiText style={[styles.amount, { color: theme.colors.accentMuted }]}>{formatMarketPrice(total, customerOrder.currency_code ?? "DZD")}</UiText>
            <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate(deliveryType === "home" ? "merchantCodDeliveryHint" : "merchantCodPickupHint")}</UiText>
            <Button label={translate("merchantCodCollect")} onPress={() => setConfirmAction("collect")} fullWidth />
          </MerchantOrderCard>
        ) : null}

        {order.payment_status === "paid" ? (
          <Alert description={`${translate("merchantCodPaid")}: ${formatMarketPrice(order.paid_amount ?? 0, customerOrder.currency_code ?? "DZD")}`} tone="success" />
        ) : null}

        {actionError ? (
          <Alert description={translateError(actionError)} tone="danger" />
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={confirmAction !== null}
        onRequestClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && actionMutation.mutate(confirmAction)}
        title={confirmAction === "reject" ? translate("merchantRejectConfirmTitle") : translate("merchantCodConfirmTitle")}
        description={confirmAction === "reject" ? translate("merchantRejectConfirmHint") : translate("merchantCodConfirmHint")}
        cancelLabel={translate("merchantModalClose")}
        confirmLabel={translate("merchantConfirmAction")}
        busy={actionMutation.isPending}
        destructive={confirmAction === "reject"}
      />
    </SafeAreaView>
  );
}

function merchantShipmentStatusLabel(status: string): string {
  const labels: Record<string, TranslationKey> = {
    accepted: "shipmentStatusAccepted",
    picked_up: "shipmentStatusPickedUp",
    in_transit: "shipmentStatusTransit",
    failed: "shipmentStatusFailed",
    returned: "shipmentStatusReturned"
  };
  const key = labels[status];
  return key ? translate(key) : translate("orderStatusUnknown");
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function translateError(error: string): string {
  if (error.includes("not_authorized")) return translate("merchantErrorNotAuthorized");
  if (error.includes("invalid_tracking_transition")) return translate("merchantTrackingTransitionError");
  if (error.includes("store_pickup_not_completed")) return translate("merchantCodPickupNotCompleted");
  return translate("merchantActionGenericError");
}

function StatusPill({ status, deliveryType }: { status: string; deliveryType: string }) {
  const keyByStatus: Record<string, TranslationKey> = {
    pending: "merchantOrderStatusPending",
    quoted: "merchantOrderStatusQuoted",
    confirmed: "merchantOrderStatusConfirmed",
    shipped: "merchantOrderStatusShipped",
    delivered: "merchantOrderStatusDelivered",
    cancelled: "merchantOrderStatusCancelled"
  };
  const tone = status === "delivered"
    ? "success"
    : status === "cancelled"
      ? "danger"
      : status === "pending" || status === "quoted"
        ? "warning"
        : "neutral";
  const displayKey = status === "shipped" && deliveryType === "desk"
    ? "merchantOrderStatusPrepared"
    : keyByStatus[status] ?? "merchantOrderStatusUnknown";
  return <MerchantStatusBadge label={translate(displayKey)} tone={tone} />;
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: AppTheme }) {
  return (
    <View style={stylesForComponents.infoRow}>
      <UiText style={{ color: theme.colors.muted, fontSize: designTokens.typography.caption }}>{label}</UiText>
      <UiText style={{ color: theme.colors.foreground, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.bold, textAlign: "auto", flexShrink: 1 }}>{value}</UiText>
    </View>
  );
}

function LoadingScreen({ theme, label }: { theme: AppTheme; label: string }) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[stylesForComponents.safe, { backgroundColor: theme.colors.background }]}>
      <View accessible accessibilityLabel={label} style={stylesForComponents.screenContent}>
        <AppHeader
          title={translate("merchantOrderDetailTitle")}
          leading={<Button label={translate("merchantOrderDetailBack")} onPress={() => router.back()} variant="ghost" size="sm" />}
        />
        <View style={stylesForComponents.skeletonList}>
          {[0, 1, 2].map((item) => <OrderCardSkeleton key={item} />)}
        </View>
      </View>
    </SafeAreaView>
  );
}

function MessageScreen({ theme, title, actionLabel, onAction, busy = false }: { theme: AppTheme; title: string; actionLabel: string; onAction: () => void; busy?: boolean }) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[stylesForComponents.safe, { backgroundColor: theme.colors.background }]}>
      <View style={stylesForComponents.screenContent}>
        <AppHeader
          title={translate("merchantOrderDetailTitle")}
          leading={<Button label={translate("merchantOrderDetailBack")} onPress={() => router.back()} variant="ghost" size="sm" />}
        />
        <ErrorState title={title} retryLabel={actionLabel} busy={busy} onRetry={onAction} />
      </View>
    </SafeAreaView>
  );
}

const stylesForComponents = StyleSheet.create({
  safe: { flex: 1 },
  screenContent: { flex: 1, padding: designTokens.spacing.lg, justifyContent: "center", gap: designTokens.spacing.lg },
  skeletonList: { width: "100%", gap: designTokens.spacing.md },
  infoRow: { minHeight: designTokens.dimensions.controlHeight.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md }
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: designTokens.spacing.lg, paddingBottom: designTokens.spacing.xxl, gap: designTokens.spacing.lg },
    eyebrow: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
    subtitle: { fontSize: designTokens.typography.caption + 1, lineHeight: 19, textAlign: "auto" },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: designTokens.spacing.md },
    amount: { fontSize: designTokens.typography.subtitle, fontWeight: designTokens.fontWeights.extrabold },
    sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.sm },
    sectionTitle: { fontSize: designTokens.typography.body, lineHeight: 21, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    itemRow: { minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: designTokens.spacing.sm },
    itemInfo: { flex: 1, alignItems: "flex-start", gap: designTokens.spacing.xs },
    itemName: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    itemPriceDisplay: { alignSelf: "flex-start" },
    mutedText: { fontSize: designTokens.typography.caption, lineHeight: 18, textAlign: "auto" },
    totalRow: { minHeight: 38, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: designTokens.spacing.sm },
    valueText: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    fieldLabel: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    input: { minHeight: designTokens.dimensions.controlHeight.lg, borderWidth: 1, borderRadius: theme.radius.sm, paddingHorizontal: designTokens.spacing.md, fontSize: designTokens.typography.body }
  });
}
