import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatDZD } from "@/lib/catalog";
import {
  collectMerchantOrderCod,
  fetchMerchantAccess,
  fetchMerchantOrderDetails,
  rejectMerchantOrder,
  submitMerchantOrderQuote,
  updateMerchantOrderTracking,
  type MerchantTrackingStatus
} from "@/lib/merchant";
import { getNextMerchantTrackingStatus } from "@/lib/merchant-dashboard-state";
import { readCartOptions } from "@/lib/cart-state";
import { translate, type TranslationKey } from "@/lib/i18n";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { AppHeader, Button, ConfirmDialog, ErrorState, LoadingState, MerchantOrderCard, MerchantStatusBadge, PriceDisplay, Text as UiText, TextField } from "@/components/ui";

type ConfirmAction = "reject" | "collect" | null;

const trackingTranslationKeys: Record<MerchantTrackingStatus, TranslationKey> = {
  preparing: "merchantTrackingPreparing",
  ready_for_dispatch: "merchantTrackingReady",
  out_for_delivery: "merchantTrackingOutForDelivery",
  delivered: "merchantTrackingDelivered"
};

export default function MerchantOrderDetailsScreen() {
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
  const latestTrackingStatus = trackingEvents[trackingEvents.length - 1]?.status
    ?? (merchantOrder?.status === "delivered"
      ? "delivered"
      : merchantOrder?.status === "shipped"
        ? deliveryType === "desk" ? "ready_for_dispatch" : "out_for_delivery"
        : "confirmed");
  const isCarrierManaged = deliveryType === "home" && !!detail.data?.shipment?.company_id;
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
    return <MessageScreen theme={theme} title={translate("merchantLoadError")} actionLabel={translate("merchantRetry")} onAction={() => void access.refetch()} />;
  }
  if (!access.data) return <Redirect href="/login" />;
  if (!isReady) return <Redirect href="/merchant" />;

  if (detail.isPending) return <LoadingScreen theme={theme} label={translate("merchantOrderDetailLoading")} />;
  if (detail.isError || !detail.data) {
    return <MessageScreen theme={theme} title={translate("merchantOrderDetailError")} actionLabel={translate("merchantRetry")} onAction={() => void detail.refetch()} />;
  }

  const order = detail.data.merchantOrder;
  const customerOrder = order.order;
  const total = order.subtotal + order.shipping_fee;
  const nextStatus = isCarrierManaged ? null : getNextMerchantTrackingStatus(latestTrackingStatus, deliveryType ?? "");
  const nextStatusLabel = nextStatus ? trackingTranslationKeys[nextStatus] : null;
  const canCollectCod = deliveryType === "desk" && order.status === "delivered" && order.payment_status !== "paid";
  const canQuote = order.status === "pending" && !order.quoted_at;
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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader title={translate("merchantOrderDetailTitle")} leading={<Button label={translate("merchantOrderDetailBack")} onPress={() => router.back()} variant="ghost" size="sm" />} />
        <UiText style={[styles.eyebrow, { color: theme.colors.accentMuted }]}>{translate("merchantOrderNumber")} {customerOrder.id.slice(0, 8)}</UiText>
        <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{new Date(customerOrder.created_at).toLocaleString("ar-DZ")}</UiText>

        <MerchantOrderCard>
          <View style={styles.summaryRow}>
            <UiText style={[styles.amount, { color: theme.colors.accentMuted }]}>{formatDZD(total)}</UiText>
            <StatusPill status={order.status} deliveryType={deliveryType ?? "home"} />
          </View>
          <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantOrderItems")}</UiText>
          {detail.data.items.length === 0 ? (
            <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantOrderItemsUnavailable")}</UiText>
          ) : detail.data.items.map((item) => (
            <View key={item.id} style={[styles.itemRow, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.itemInfo}>
                <UiText style={[styles.itemName, { color: theme.colors.foreground }]}>{item.product_name || translate("merchantOrderItems")}</UiText>
                <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantOrderQuantity")}: {item.quantity}</UiText>
                {Object.entries(readCartOptions(item.options)).length > 0 ? <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{Object.entries(readCartOptions(item.options)).map(([key, value]) => (key === "size" ? translate("productSizeOption") : key === "color" ? translate("productColorOption") : key) + ": " + value).join(" · ")}</UiText> : null}
              </View>
              <PriceDisplay value={formatDZD(item.unit_price * item.quantity)} style={styles.itemPriceDisplay} />
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
            <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantOrderSubtotal")}</UiText>
            <UiText style={[styles.valueText, { color: theme.colors.foreground }]}>{formatDZD(order.subtotal)}</UiText>
          </View>
          <View style={styles.totalRow}>
            <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantOrderShippingFee")}</UiText>
            <UiText style={[styles.valueText, { color: theme.colors.foreground }]}>{formatDZD(order.shipping_fee)}</UiText>
          </View>
          <View style={styles.totalRow}>
            <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantOrderTotal")}</UiText>
            <UiText style={[styles.amount, { color: theme.colors.accentMuted }]}>{formatDZD(total)}</UiText>
          </View>
        </MerchantOrderCard>

        <MerchantOrderCard>
          <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantOrderCustomerTitle")}</UiText>
          <InfoRow label={translate("merchantCustomerUnknown")} value={customerOrder.full_name || "—"} theme={theme} />
          <InfoRow label={translate("merchantOrderPhone")} value={customerOrder.phone || "—"} theme={theme} />
          <InfoRow label={translate("merchantStoreWilayaLabel")} value={customerOrder.wilaya?.name_ar || "—"} theme={theme} />
          <InfoRow label={translate("merchantStoreCommuneLabel")} value={customerOrder.commune || "—"} theme={theme} />
          <InfoRow label={translate("merchantStoreAddressLabel")} value={customerOrder.address_line || "—"} theme={theme} />
          <InfoRow label={translate("merchantOrderDeliveryType")} value={deliveryType === "desk" ? translate("checkoutStorePickup") : translate("checkoutHomeDelivery")} theme={theme} />
          <InfoRow label={translate("merchantOrderPaymentMethod")} value={customerOrder.payment_method || "—"} theme={theme} />
          {detail.data.shipment ? (
            <InfoRow label={translate("merchantOrderShipmentStatus")} value={detail.data.shipment.status} theme={theme} />
          ) : null}
        </MerchantOrderCard>

        {canQuote ? (
          <MerchantOrderCard>
            <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantQuoteTitle")}</UiText>
            {deliveryType === "desk" ? (
              <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantQuotePickupHint")}</UiText>
            ) : (
              <UiTextField
                value={shippingFee}
                onChangeText={setShippingFee}
                keyboardType="number-pad"
                placeholder={translate("merchantQuoteShippingPlaceholder")}
                placeholderTextColor={theme.colors.placeholder}
                style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.foreground }]}
                textAlign="right"
              />
            )}
            <Button label={translate("merchantQuoteSend")} onPress={sendQuote} loading={quoteMutation.isPending} fullWidth />
            {canReject ? (
              <Button label={translate("merchantOrderReject")} onPress={() => setConfirmAction("reject")} variant="danger" fullWidth />
            ) : null}
          </MerchantOrderCard>
        ) : null}

        {order.status === "quoted" ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.warningSurface }]}>
            <UiText style={[styles.noticeText, { color: theme.colors.warning }]}>{translate("merchantQuoteAwaitingCustomer")}</UiText>
          </View>
        ) : null}

        {isCarrierManaged ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.warningSurface }]}>
            <UiText style={[styles.noticeText, { color: theme.colors.warning }]}>
              {translate("merchantTrackingCarrierCompletesDelivery")}
            </UiText>
          </View>
        ) : null}

        <MerchantOrderCard>
          <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantTrackingTitle")}</UiText>
          {trackingEvents.length === 0 ? (
            <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantTrackingEmpty")}</UiText>
          ) : trackingEvents.map((event) => (
            <View key={event.id} style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
              <UiText style={[styles.valueText, { color: theme.colors.foreground }]}>{translate(trackingTranslationKeys[event.status])}</UiText>
              <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{new Date(event.created_at).toLocaleString("ar-DZ")}</UiText>
            </View>
          ))}
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
            <UiText style={[styles.amount, { color: theme.colors.accentMuted }]}>{formatDZD(total)}</UiText>
            <UiText style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantCodPickupHint")}</UiText>
            <Button label={translate("merchantCodCollect")} onPress={() => setConfirmAction("collect")} fullWidth />
          </MerchantOrderCard>
        ) : null}

        {order.payment_status === "paid" ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.successSurface }]}>
            <UiText style={[styles.noticeText, { color: theme.colors.success }]}>{translate("merchantCodPaid")}: {formatDZD(order.paid_amount ?? 0)}</UiText>
          </View>
        ) : null}

        {actionError ? (
          <View style={[styles.errorCard, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerBorder }]}>
            <UiText style={[styles.dangerButtonText, { color: theme.colors.danger }]}>{translateError(actionError)}</UiText>
          </View>
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function translateError(error: string): string {
  if (error.includes("not_authorized")) return translate("merchantErrorNotAuthorized");
  if (error.includes("invalid_tracking_transition")) return translate("merchantTrackingTransitionError");
  if (error.includes("shipment_not_delivered")) return translate("merchantCodShipmentNotDelivered");
  if (error.includes("shipment_company_not_assigned")) return translate("merchantCodCarrierMissing");
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
      <UiText style={{ color: theme.colors.foreground, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.bold, textAlign: "right", flexShrink: 1 }}>{value}</UiText>
    </View>
  );
}

function LoadingScreen({ theme, label }: { theme: AppTheme; label: string }) {
  return (
    <SafeAreaView style={[stylesForComponents.safe, { backgroundColor: theme.colors.background }]}>
      <View style={stylesForComponents.center}>
        <LoadingState label={label} />
      </View>
    </SafeAreaView>
  );
}

function MessageScreen({ theme, title, actionLabel, onAction }: { theme: AppTheme; title: string; actionLabel: string; onAction: () => void }) {
  return (
    <SafeAreaView style={[stylesForComponents.safe, { backgroundColor: theme.colors.background }]}>
      <View style={stylesForComponents.center}>
        <ErrorState title={title} retryLabel={actionLabel} onRetry={onAction} />
      </View>
    </SafeAreaView>
  );
}

const stylesForComponents = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: designTokens.spacing.lg },
  primaryButton: { minHeight: 46, borderRadius: 13, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  infoRow: { minHeight: 35, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12 }
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: 17, paddingBottom: 38, gap: 13 },
    eyebrow: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
    subtitle: { fontSize: designTokens.typography.caption, textAlign: "right" },
    summaryRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
    amount: { fontSize: 17, fontWeight: designTokens.fontWeights.extrabold },
    sectionTitle: { fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, textAlign: "right" },
    itemRow: { minHeight: 55, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 7 },
    itemInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
    itemName: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "right" },
    itemPriceDisplay: { alignSelf: "flex-start" },
    mutedText: { fontSize: designTokens.typography.caption, lineHeight: 17, textAlign: "right" },
    totalRow: { minHeight: 30, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 },
    valueText: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
    input: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: designTokens.typography.body },
    dangerButton: { minHeight: 45, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    dangerButtonText: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "center" },
    notice: { borderRadius: 14, padding: 13 },
    noticeText: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "right" },
    errorCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
    disabled: { opacity: 0.5 }
  });
}
