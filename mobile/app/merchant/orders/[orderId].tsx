import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatDZD } from "@/lib/catalog";
import {
  collectMerchantOrderCod,
  fetchMerchantAccess,
  fetchMerchantOrderDetails,
  fetchMerchantOrderTracking,
  rejectMerchantOrder,
  submitMerchantOrderQuote,
  updateMerchantOrderStatus,
  updateMerchantOrderTracking,
  type MerchantTrackingStatus
} from "@/lib/merchant";
import { getNextMerchantTrackingStatus } from "@/lib/merchant-dashboard-state";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";

type ConfirmAction = "reject" | "collect" | null;

const TRACKING_STEPS: ReadonlyArray<{ status: MerchantTrackingStatus; label: TranslationKey }> = [
  { status: "preparing", label: "merchantTrackingPreparing" },
  { status: "ready_for_dispatch", label: "merchantTrackingReady" },
  { status: "out_for_delivery", label: "merchantTrackingOutForDelivery" },
  { status: "delivered", label: "merchantTrackingDelivered" }
];

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
  const carrierManaged = deliveryType === "home" && !!detail.data?.shipment?.company_id;
  const merchantManaged = deliveryType === "desk" || (deliveryType === "home" && !carrierManaged);

  const tracking = useQuery({
    queryKey: ["merchant-order-tracking", orderId],
    queryFn: () => fetchMerchantOrderTracking(orderId ?? ""),
    enabled: isReady && !!merchantOrder && (merchantOrder.status === "confirmed" || merchantOrder.status === "shipped") && merchantManaged,
    retry: false
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["merchant-order-detail", storeId, orderId] }),
      queryClient.invalidateQueries({ queryKey: ["merchant-order-tracking", orderId] }),
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

  const trackingMutation = useMutation({
    mutationFn: async (status: MerchantTrackingStatus) => {
      if (status === "out_for_delivery" && order.status === "confirmed") {
        await updateMerchantOrderStatus(orderId ?? "", "shipped");
      }
      await updateMerchantOrderTracking(orderId ?? "", status);
    },
    onSuccess: async () => {
      setActionError(null);
      await refresh();
    },
    onError: async (error) => {
      setActionError(getErrorMessage(error));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["merchant-order-detail", storeId, orderId] }),
        queryClient.invalidateQueries({ queryKey: ["merchant-order-tracking", orderId] })
      ]);
    }
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
  const trackingEvents = tracking.data ?? [];
  const visibleTrackingSteps = deliveryType === "desk"
    ? TRACKING_STEPS
    : TRACKING_STEPS.filter((step) => step.status !== "delivered");
  const nextTrackingStatus = getNextMerchantTrackingStatus(trackingEvents.map((event) => event.status));
  const nextTrackingStep = visibleTrackingSteps.find((step) => step.status === nextTrackingStatus);
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
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.colors.accentMuted }]}>{translate("merchantOrderDetailBack")}</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.colors.accentMuted }]}>{translate("merchantOrderNumber")} {customerOrder.id.slice(0, 8)}</Text>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>{translate("merchantOrderDetailTitle")}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {new Date(customerOrder.created_at).toLocaleString("ar-DZ")}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={[styles.amount, { color: theme.colors.accentMuted }]}>{formatDZD(total)}</Text>
            <StatusPill status={order.status} theme={theme} />
          </View>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantOrderItems")}</Text>
          {detail.data.items.length === 0 ? (
            <Text style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantOrderItemsUnavailable")}</Text>
          ) : detail.data.items.map((item) => (
            <View key={item.id} style={[styles.itemRow, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.colors.foreground }]}>{item.product_name || translate("merchantOrderItems")}</Text>
                <Text style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantOrderQuantity")}: {item.quantity}</Text>
              </View>
              <Text style={[styles.itemPrice, { color: theme.colors.foreground }]}>{formatDZD(item.unit_price * item.quantity)}</Text>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantOrderSubtotal")}</Text>
            <Text style={[styles.valueText, { color: theme.colors.foreground }]}>{formatDZD(order.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantOrderShippingFee")}</Text>
            <Text style={[styles.valueText, { color: theme.colors.foreground }]}>{formatDZD(order.shipping_fee)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantOrderTotal")}</Text>
            <Text style={[styles.amount, { color: theme.colors.accentMuted }]}>{formatDZD(total)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantOrderCustomerTitle")}</Text>
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
        </View>

        {canQuote ? (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantQuoteTitle")}</Text>
            {deliveryType === "desk" ? (
              <Text style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantQuotePickupHint")}</Text>
            ) : (
              <TextInput
                value={shippingFee}
                onChangeText={setShippingFee}
                keyboardType="number-pad"
                placeholder={translate("merchantQuoteShippingPlaceholder")}
                placeholderTextColor={theme.colors.placeholder}
                style={[styles.input, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, color: theme.colors.foreground }]}
                textAlign="right"
              />
            )}
            <Pressable accessibilityRole="button" disabled={quoteMutation.isPending} onPress={sendQuote} style={[styles.primaryButton, { backgroundColor: theme.colors.accent }, quoteMutation.isPending && styles.disabled]}>
              {quoteMutation.isPending ? <ActivityIndicator color={theme.colors.accentForeground} /> : <Text style={[styles.primaryButtonText, { color: theme.colors.accentForeground }]}>{translate("merchantQuoteSend")}</Text>}
            </Pressable>
            {canReject ? (
              <Pressable accessibilityRole="button" onPress={() => setConfirmAction("reject")} style={[styles.dangerButton, { borderColor: theme.colors.dangerBorder }]}>
                <Text style={[styles.dangerButtonText, { color: theme.colors.danger }]}>{translate("merchantOrderReject")}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {order.status === "quoted" ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.warningSurface }]}>
            <Text style={[styles.noticeText, { color: theme.colors.warning }]}>{translate("merchantQuoteAwaitingCustomer")}</Text>
          </View>
        ) : null}

        {order.status === "confirmed" && merchantManaged ? (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantTrackingTitle")}</Text>
            {tracking.isPending ? <ActivityIndicator color={theme.colors.accentMuted} /> : null}
            {tracking.isError ? (
              <Pressable accessibilityRole="button" onPress={() => void tracking.refetch()}>
                <Text style={[styles.mutedText, { color: theme.colors.danger }]}>{translate("merchantTrackingError")}</Text>
              </Pressable>
            ) : null}
            {visibleTrackingSteps.map((step) => {
              const event = trackingEvents.find((item) => item.status === step.status);
              return (
                <View key={step.status} style={styles.trackingRow}>
                  <Text style={[styles.trackingMark, { color: event ? theme.colors.success : theme.colors.subtle }]}>{event ? "✓" : "○"}</Text>
                  <View style={styles.trackingInfo}>
                    <Text style={[styles.itemName, { color: event ? theme.colors.foreground : theme.colors.muted }]}>{translate(step.label)}</Text>
                    {event ? <Text style={[styles.mutedText, { color: theme.colors.muted }]}>{new Date(event.created_at).toLocaleString("ar-DZ")}</Text> : null}
                  </View>
                </View>
              );
            })}
            {deliveryType === "home" && trackingEvents.some((event) => event.status === "out_for_delivery") ? (
              <Text style={[styles.mutedText, { color: theme.colors.muted }]}>
                {translate("merchantTrackingCarrierCompletesDelivery")}
              </Text>
            ) : null}
            {nextTrackingStep && !tracking.isError ? (
              <Pressable
                accessibilityRole="button"
                disabled={trackingMutation.isPending || tracking.isPending}
                onPress={() => trackingMutation.mutate(nextTrackingStep.status)}
                style={[styles.primaryButton, { backgroundColor: theme.colors.accent }, (trackingMutation.isPending || tracking.isPending) && styles.disabled]}
              >
                {trackingMutation.isPending ? <ActivityIndicator color={theme.colors.accentForeground} /> : <Text style={[styles.primaryButtonText, { color: theme.colors.accentForeground }]}>{translate("merchantTrackingAdvance")}: {translate(nextTrackingStep.label)}</Text>}
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {canCollectCod ? (
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantCodTitle")}</Text>
            <Text style={[styles.amount, { color: theme.colors.accentMuted }]}>{formatDZD(total)}</Text>
            <Text style={[styles.mutedText, { color: theme.colors.muted }]}>{translate("merchantCodPickupHint")}</Text>
            <Pressable accessibilityRole="button" onPress={() => setConfirmAction("collect")} style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]}>
              <Text style={[styles.primaryButtonText, { color: theme.colors.accentForeground }]}>{translate("merchantCodCollect")}</Text>
            </Pressable>
          </View>
        ) : null}

        {order.payment_status === "paid" ? (
          <View style={[styles.notice, { backgroundColor: theme.colors.successSurface }]}>
            <Text style={[styles.noticeText, { color: theme.colors.success }]}>{translate("merchantCodPaid")}: {formatDZD(order.paid_amount ?? 0)}</Text>
          </View>
        ) : null}

        {actionError ? (
          <View style={[styles.errorCard, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerBorder }]}>
            <Text style={[styles.dangerButtonText, { color: theme.colors.danger }]}>{translateError(actionError)}</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal transparent visible={confirmAction !== null} animationType="fade" onRequestClose={() => setConfirmAction(null)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.confirmPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
              {confirmAction === "reject" ? translate("merchantRejectConfirmTitle") : translate("merchantCodConfirmTitle")}
            </Text>
            <Text style={[styles.mutedText, { color: theme.colors.muted }]}>
              {confirmAction === "reject" ? translate("merchantRejectConfirmHint") : translate("merchantCodConfirmHint")}
            </Text>
            <View style={styles.confirmActions}>
              <Pressable accessibilityRole="button" onPress={() => setConfirmAction(null)} style={[styles.secondaryButton, { borderColor: theme.colors.border }]}>
                <Text style={[styles.secondaryButtonText, { color: theme.colors.foreground }]}>{translate("merchantModalClose")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={actionMutation.isPending}
                onPress={() => confirmAction && actionMutation.mutate(confirmAction)}
                style={[styles.primaryButton, { backgroundColor: confirmAction === "reject" ? theme.colors.danger : theme.colors.accent }, actionMutation.isPending && styles.disabled]}
              >
                {actionMutation.isPending ? <ActivityIndicator color={theme.colors.accentForeground} /> : <Text style={[styles.primaryButtonText, { color: theme.colors.accentForeground }]}>{translate("merchantConfirmAction")}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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

function StatusPill({ status, theme }: { status: string; theme: AppTheme }) {
  const keyByStatus: Record<string, TranslationKey> = {
    pending: "merchantOrderStatusPending",
    quoted: "merchantOrderStatusQuoted",
    confirmed: "merchantOrderStatusConfirmed",
    shipped: "merchantOrderStatusShipped",
    delivered: "merchantOrderStatusDelivered",
    cancelled: "merchantOrderStatusCancelled"
  };
  const tone = status === "delivered" ? theme.colors.success : status === "cancelled" ? theme.colors.danger : status === "pending" || status === "quoted" ? theme.colors.warning : theme.colors.muted;
  const background = status === "delivered" ? theme.colors.successSurface : status === "cancelled" ? theme.colors.dangerSurface : status === "pending" || status === "quoted" ? theme.colors.warningSurface : theme.colors.surfaceMuted;
  return (
    <View style={[stylesForComponents.pill, { backgroundColor: background }]}>
      <Text style={{ color: tone, fontSize: 10, fontWeight: "900" }}>{translate(keyByStatus[status] ?? "merchantOrderStatusUnknown")}</Text>
    </View>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: AppTheme }) {
  return (
    <View style={stylesForComponents.infoRow}>
      <Text style={{ color: theme.colors.muted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: theme.colors.foreground, fontSize: 12, fontWeight: "700", textAlign: "right", flexShrink: 1 }}>{value}</Text>
    </View>
  );
}

function LoadingScreen({ theme, label }: { theme: AppTheme; label: string }) {
  return (
    <SafeAreaView style={[stylesForComponents.safe, { backgroundColor: theme.colors.background }]}>
      <View style={stylesForComponents.center}>
        <ActivityIndicator color={theme.colors.accentMuted} />
        <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

function MessageScreen({ theme, title, actionLabel, onAction }: { theme: AppTheme; title: string; actionLabel: string; onAction: () => void }) {
  return (
    <SafeAreaView style={[stylesForComponents.safe, { backgroundColor: theme.colors.background }]}>
      <View style={stylesForComponents.center}>
        <Text style={{ color: theme.colors.foreground, fontSize: 14, fontWeight: "800", textAlign: "center" }}>{title}</Text>
        <Pressable accessibilityRole="button" onPress={onAction} style={[stylesForComponents.primaryButton, { backgroundColor: theme.colors.accent }]}>
          <Text style={{ color: theme.colors.accentForeground, fontWeight: "900" }}>{actionLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const stylesForComponents = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 14 },
  primaryButton: { minHeight: 46, borderRadius: 13, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  infoRow: { minHeight: 35, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12 }
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: 17, paddingBottom: 38, gap: 13 },
    backButton: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 3 },
    backText: { fontSize: 12, fontWeight: "800" },
    header: { alignItems: "flex-end", gap: 5 },
    eyebrow: { fontSize: 11, fontWeight: "900" },
    title: { fontSize: 23, fontWeight: "900", textAlign: "right" },
    subtitle: { fontSize: 11, textAlign: "right" },
    card: { borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 14, gap: 11 },
    summaryRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
    amount: { fontSize: 17, fontWeight: "900" },
    sectionTitle: { fontSize: 14, fontWeight: "900", textAlign: "right" },
    itemRow: { minHeight: 55, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 7 },
    itemInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
    itemName: { fontSize: 12, fontWeight: "800", textAlign: "right" },
    itemPrice: { fontSize: 12, fontWeight: "900" },
    mutedText: { fontSize: 11, lineHeight: 17, textAlign: "right" },
    totalRow: { minHeight: 30, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 },
    valueText: { fontSize: 12, fontWeight: "800" },
    input: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: 14 },
    primaryButton: { minHeight: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
    primaryButtonText: { fontSize: 12, fontWeight: "900" },
    dangerButton: { minHeight: 45, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    dangerButtonText: { fontSize: 12, fontWeight: "800", textAlign: "center" },
    notice: { borderRadius: 14, padding: 13 },
    noticeText: { fontSize: 12, fontWeight: "800", textAlign: "right" },
    trackingRow: { minHeight: 42, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
    trackingMark: { fontSize: 16, fontWeight: "900" },
    trackingInfo: { flex: 1, alignItems: "flex-end", gap: 3 },
    errorCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
    modalBackdrop: { flex: 1, justifyContent: "center", padding: 22 },
    confirmPanel: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 13 },
    confirmActions: { flexDirection: "row-reverse", gap: 9 },
    secondaryButton: { minHeight: 46, flex: 1, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    secondaryButtonText: { fontSize: 12, fontWeight: "800" },
    disabled: { opacity: 0.5 }
  });
}
