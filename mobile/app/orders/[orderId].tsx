import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { CustomerHeading, CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { formatDZD } from "@/lib/catalog";
import { fetchCustomerOrderDetails, getOrderStatusTone } from "@/lib/orders";
import { getSupabaseClient } from "@/lib/supabase";
import { translate } from "@/lib/i18n";

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
    returned: translate("shipmentStatusReturned")
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
  const dark = useColorScheme() === "dark";
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
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
    enabled: Boolean(orderId) && auth.isSuccess && auth.data !== null
  });

  useEffect(() => {
    if (!orderId || !auth.data) return;
    const client = getSupabaseClient();
    const channel = client.channel("native-customer-order-" + orderId)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: "id=eq." + orderId }, () => { void query.refetch(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "merchant_orders" }, () => { void query.refetch(); })
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
  const activeStep = STEPS.findIndex((step) => step.status === order.status);
  const orderCode = order.id.replace(/-/g, "").slice(0, 8).toUpperCase();

  return <CustomerScreen>
    <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ {translate("back")}</Text></Pressable>
    <CustomerHeading title={translate("orderDetailsTitle")} subtitle={translate("ordersCode") + ": " + orderCode} />

    <View style={[styles.panel, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <Text style={styles.sectionTitle}>{translate("orderSummary")}</Text>
      <View style={styles.totalRow}><Text style={styles.label}>{translate("orderTotal")}</Text><Text style={styles.total}>{formatDZD(order.total)}</Text></View>
      <Text style={styles.meta}>{dateLabel(order.created_at)}</Text>
    </View>

    {showParentTimeline ? <View style={[styles.panel, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <Text style={styles.sectionTitle}>{translate("orderProgress")}</Text>
      {parentCancelled ? <Text style={styles.cancelled}>{statusLabel(order.status)}</Text> : STEPS.map((step, index) => {
        const complete = index <= activeStep;
        return <View key={step.status} style={styles.step}>
          <View style={[styles.stepDot, complete && styles.stepDone]}><Text style={[styles.stepNumber, complete && styles.stepNumberDone]}>{complete ? "✓" : String(index + 1)}</Text></View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{translate(step.title)}</Text>
            <Text style={styles.meta}>{translate(step.hint)}</Text>
          </View>
        </View>;
      })}
    </View> : <View style={[styles.panel, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <Text style={styles.sectionTitle}>{translate("orderPerStoreProgress")}</Text>
      <Text style={styles.meta}>{translate("orderPerStoreHint")}</Text>
    </View>}

    <View style={[styles.panel, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <Text style={styles.sectionTitle}>{translate("orderItemsTitle")}</Text>
      {order.items.map((item) => <View key={item.id} style={styles.itemRow}>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{item.product_name ?? translate("cartUnknownStore")}</Text>
          <Text style={styles.meta}>{translate("ordersQuantity")}: {item.quantity}</Text>
        </View>
        <Text style={styles.itemPrice}>{formatDZD(item.unit_price * item.quantity)}</Text>
      </View>)}
      <View style={styles.totalRow}><Text style={styles.label}>{translate("orderSubtotal")}</Text><Text style={styles.label}>{formatDZD(order.subtotal)}</Text></View>
      <View style={styles.totalRow}><Text style={styles.label}>{translate("orderShipping")}</Text><Text style={styles.label}>{formatDZD(order.shipping_fee)}</Text></View>
    </View>

    {merchantOrders.map((merchantOrder) => {
      const tone = getOrderStatusTone(merchantOrder.status);
      const cancelled = merchantOrder.status === "cancelled" || merchantOrder.status === "rejected";
      const subTotal = cancelled ? 0 : merchantOrder.subtotal + merchantOrder.shipping_fee;
      return <View key={merchantOrder.id} style={[styles.panel, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
        <View style={styles.merchantHeader}>
          <Text style={styles.sectionTitle}>{merchantOrder.store?.name ?? translate("ordersStore")}</Text>
          <View style={[styles.status, tone === "success" ? styles.statusSuccess : tone === "danger" ? styles.statusDanger : tone === "pending" ? styles.statusPending : styles.statusMuted]}>
            <Text style={styles.statusText}>{statusLabel(merchantOrder.status)}</Text>
          </View>
        </View>
        {merchantOrder.items.map((item) => <View key={item.id} style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{item.product_name ?? translate("cartUnknownStore")}</Text>
            <Text style={styles.meta}>{translate("ordersQuantity")}: {item.quantity}</Text>
          </View>
          <Text style={styles.itemPrice}>{formatDZD(item.unit_price * item.quantity)}</Text>
        </View>)}
        <View style={styles.totalRow}><Text style={styles.label}>{translate("orderStoreSubtotal")}</Text><Text style={styles.label}>{formatDZD(merchantOrder.subtotal)}</Text></View>
        {merchantOrder.status !== "pending" ? <View style={styles.totalRow}><Text style={styles.label}>{translate("orderShipping")}</Text><Text style={styles.label}>{formatDZD(merchantOrder.shipping_fee)}</Text></View> : null}
        {!cancelled ? <View style={styles.totalRow}><Text style={styles.sectionTitle}>{translate("orderStoreTotal")}</Text><Text style={styles.total}>{formatDZD(subTotal)}</Text></View> : null}
        {merchantOrder.status === "quoted" ? <Text style={styles.notice}>{translate("orderQuoteAwaiting")}</Text> : null}
        {order.delivery_type === "desk" && merchantOrder.store?.address_line ? <Text style={styles.meta}>{translate("orderPickupAddress")}: {merchantOrder.store.address_line} · {merchantOrder.store.commune ?? ""}</Text> : null}
      </View>;
    })}

    <View style={[styles.panel, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <Text style={styles.sectionTitle}>{translate("orderRecipientTitle")}</Text>
      <Text style={[styles.recipient, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{order.full_name ?? ""}</Text>
      <Text style={styles.meta}>{order.wilaya?.name_ar ?? ""} · {order.commune ?? ""}</Text>
      {order.delivery_type === "home" && order.address_line ? <Text style={styles.meta}>{order.address_line}</Text> : null}
      <Text style={styles.meta}>{order.phone ?? ""}</Text>
      <Text style={styles.meta}>{order.delivery_type === "desk" ? translate("checkoutStorePickup") : translate("checkoutHomeDelivery")}</Text>
      <Text style={styles.meta}>{translate("orderPayment")}: {order.payment_method === "cod" ? translate("checkoutCodNote") : order.payment_method ?? ""}</Text>
    </View>

    {query.data.shipments.length > 0 ? <View style={[styles.panel, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
      <Text style={styles.sectionTitle}>{translate("orderShipmentsTitle")}</Text>
      {query.data.shipments.map((shipment) => <View key={shipment.id} style={styles.shipment}>
        <Text style={styles.shipmentStatus}>{statusLabel(shipment.status)}</Text>
        {shipment.updated_at ? <Text style={styles.meta}>{translate("orderUpdatedAt")}: {dateLabel(shipment.updated_at)}</Text> : null}
        {shipment.notes ? <Text style={styles.meta}>{shipment.notes}</Text> : null}
      </View>)}
    </View> : null}
    <Pressable onPress={() => router.replace("/orders")} style={styles.secondary}><Text style={styles.secondaryText}>{translate("ordersTitle")}</Text></Pressable>
  </CustomerScreen>;
}

const styles = StyleSheet.create({
  back: { alignSelf: "flex-start", minHeight: 38, justifyContent: "center" },
  backText: { color: "#647D13", fontSize: 13, fontWeight: "900" },
  panel: { borderRadius: 18, padding: 14, gap: 12 },
  sectionTitle: { color: "#647D13", fontSize: 14, fontWeight: "900", textAlign: "right" },
  totalRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#E5E5E5", paddingTop: 9 },
  label: { color: "#737373", fontSize: 12, fontWeight: "700" },
  total: { color: "#647D13", fontSize: 18, fontWeight: "900" },
  meta: { color: "#737373", fontSize: 11, lineHeight: 18, textAlign: "right" },
  step: { flexDirection: "row-reverse", gap: 11, alignItems: "flex-start" },
  stepDot: { width: 29, height: 29, borderRadius: 15, borderWidth: 1, borderColor: "#D4D4D4", alignItems: "center", justifyContent: "center" },
  stepDone: { backgroundColor: "#C6F135", borderColor: "#C6F135" },
  stepNumber: { color: "#737373", fontSize: 11, fontWeight: "900" },
  stepNumberDone: { color: "#0A0A0A" },
  stepContent: { flex: 1, gap: 3, alignItems: "flex-end" },
  stepTitle: { fontSize: 12, fontWeight: "900", textAlign: "right" },
  cancelled: { color: "#B42318", fontSize: 13, fontWeight: "900", textAlign: "right" },
  itemRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#E5E5E5" },
  itemInfo: { flex: 1, alignItems: "flex-end", gap: 3 },
  itemName: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  itemPrice: { color: "#647D13", fontSize: 12, fontWeight: "900" },
  merchantHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 8 },
  status: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  statusSuccess: { backgroundColor: "#E8F5D0" },
  statusDanger: { backgroundColor: "#FDE8E7" },
  statusPending: { backgroundColor: "#FFF3D6" },
  statusMuted: { backgroundColor: "#E5E5E5" },
  statusText: { color: "#333333", fontSize: 10, fontWeight: "800" },
  notice: { color: "#8A6412", fontSize: 11, textAlign: "right", lineHeight: 18 },
  recipient: { fontSize: 13, fontWeight: "900", textAlign: "right" },
  shipment: { borderTopWidth: 1, borderTopColor: "#E5E5E5", paddingTop: 9, gap: 5 },
  shipmentStatus: { color: "#647D13", fontSize: 12, fontWeight: "900", textAlign: "right" },
  secondary: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#D4D4D4", justifyContent: "center", alignItems: "center" },
  secondaryText: { color: "#647D13", fontSize: 13, fontWeight: "900" }
});
