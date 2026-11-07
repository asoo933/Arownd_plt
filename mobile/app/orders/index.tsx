import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { CustomerHeading, CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { formatDZD } from "@/lib/catalog";
import { fetchMyOrders, getOrderStatusTone, type CustomerOrder } from "@/lib/orders";
import { getSupabaseClient } from "@/lib/supabase";
import { translate } from "@/lib/i18n";

type OrdersTab = "all" | "active" | "delivered" | "cancelled";
type OrderRow = {
  order: CustomerOrder;
  merchantOrderId: string | null;
  status: string;
  subtotal: number;
  shippingFee: number;
  storeName: string | null;
  itemCount: number;
};

const TABS: { id: OrdersTab; key: "ordersTabAll" | "ordersTabActive" | "ordersTabDelivered" | "ordersTabCancelled" }[] = [
  { id: "all", key: "ordersTabAll" },
  { id: "active", key: "ordersTabActive" },
  { id: "delivered", key: "ordersTabDelivered" },
  { id: "cancelled", key: "ordersTabCancelled" }
];

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: translate("orderStatusPending"),
    quoted: translate("orderStatusQuoted"),
    confirmed: translate("orderStatusConfirmed"),
    shipped: translate("orderStatusShipped"),
    delivered: translate("orderStatusDelivered"),
    cancelled: translate("orderStatusCancelled"),
    rejected: translate("orderStatusRejected")
  };
  return labels[status] ?? translate("orderStatusUnknown");
}

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function toRows(orders: CustomerOrder[]): OrderRow[] {
  return orders.flatMap((order) => {
    if (order.merchant_orders.length === 0) {
      return [{
        order,
        merchantOrderId: null,
        status: order.status,
        subtotal: order.subtotal,
        shippingFee: order.shipping_fee,
        storeName: null,
        itemCount: order.items.length
      }];
    }
    return order.merchant_orders.map((merchantOrder) => ({
      order,
      merchantOrderId: merchantOrder.id,
      status: merchantOrder.status,
      subtotal: merchantOrder.subtotal,
      shippingFee: merchantOrder.shipping_fee,
      storeName: merchantOrder.store?.name ?? null,
      itemCount: merchantOrder.items.length
    }));
  });
}

export default function OrdersScreen() {
  const dark = useColorScheme() === "dark";
  const [tab, setTab] = useState<OrdersTab>("all");
  const auth = useQuery({
    queryKey: ["customer-orders-auth"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().auth.getUser();
      if (error) throw error;
      return data.user;
    }
  });
  const orders = useQuery({
    queryKey: ["customer-orders"],
    queryFn: fetchMyOrders,
    enabled: auth.isSuccess && auth.data !== null
  });

  useEffect(() => {
    const userId = auth.data?.id;
    if (!userId) return;
    const client = getSupabaseClient();
    const channel = client.channel("native-customer-orders-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: "user_id=eq." + userId }, () => {
        void orders.refetch();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "merchant_orders", filter: "customer_id=eq." + userId }, () => {
        void orders.refetch();
      })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [auth.data?.id, orders.refetch]);

  const rows = useMemo(() => toRows(orders.data ?? []), [orders.data]);
  const filtered = rows.filter((row) => {
    if (tab === "all") return true;
    if (tab === "active") return ["pending", "quoted", "confirmed", "shipped"].includes(row.status);
    if (tab === "delivered") return row.status === "delivered";
    return row.status === "cancelled" || row.status === "rejected";
  });

  if (auth.isPending || (auth.data && orders.isPending)) return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  if (auth.isError || orders.isError) return <CustomerScreen>
    <CustomerHeading title={translate("ordersTitle")} />
    <ErrorState title={translate("ordersLoadError")} retryLabel={translate("retry")} onRetry={() => { void auth.refetch(); void orders.refetch(); }} />
  </CustomerScreen>;
  if (!auth.data) return <CustomerScreen>
    <CustomerHeading title={translate("ordersTitle")} subtitle={translate("ordersLoginHint")} />
    <Pressable onPress={() => router.push("/login")} style={styles.primary}><Text style={styles.primaryText}>{translate("login")}</Text></Pressable>
  </CustomerScreen>;

  return <CustomerScreen>
    <CustomerHeading title={translate("ordersTitle")} subtitle={translate("ordersSubtitle")} />
    <View style={styles.tabs}>
      {TABS.map((item) => <Pressable key={item.id} onPress={() => setTab(item.id)} style={[styles.tab, tab === item.id && styles.tabActive]}>
        <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{translate(item.key)}</Text>
      </Pressable>)}
    </View>
    {filtered.length === 0 ? <EmptyState title={tab === "all" ? translate("ordersEmpty") : translate("ordersEmptyTab")} hint={translate("ordersEmptyHint")} /> : null}
    {filtered.map((row) => {
      const orderCode = row.order.id.replace(/-/g, "").slice(0, 8).toUpperCase();
      const tone = getOrderStatusTone(row.status);
      const total = row.status === "cancelled" || row.status === "rejected" ? 0 : row.subtotal + row.shippingFee;
      return <Pressable key={row.merchantOrderId ?? row.order.id} onPress={() => router.push({ pathname: "/orders/[orderId]", params: { orderId: row.order.id } })} style={[styles.card, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeading}>
            <Text style={[styles.orderCode, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{translate("ordersCode")}: {orderCode}</Text>
            <Text style={styles.date}>{dateLabel(row.order.created_at)}</Text>
          </View>
          <View style={[styles.status, tone === "success" ? styles.statusSuccess : tone === "danger" ? styles.statusDanger : tone === "pending" ? styles.statusPending : styles.statusMuted]}>
            <Text style={styles.statusText}>{statusLabel(row.status)}</Text>
          </View>
        </View>
        {row.storeName ? <Text style={styles.storeName}>{row.storeName}</Text> : null}
        <Text style={[styles.meta, { color: dark ? "#A3A3A3" : "#737373" }]}>{row.itemCount} {translate("ordersItems")}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.openLabel}>{translate("ordersViewDetails")}</Text>
          <Text style={styles.total}>{formatDZD(total)}</Text>
        </View>
      </Pressable>;
    })}
  </CustomerScreen>;
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row-reverse", gap: 7, flexWrap: "wrap" },
  tab: { minHeight: 40, borderRadius: 13, borderWidth: 1, borderColor: "#D4D4D4", paddingHorizontal: 12, justifyContent: "center" },
  tabActive: { backgroundColor: "#C6F135", borderColor: "#C6F135" },
  tabText: { color: "#737373", fontSize: 11, fontWeight: "800" },
  tabTextActive: { color: "#0A0A0A" },
  card: { borderRadius: 18, padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  cardHeading: { flex: 1, alignItems: "flex-end", gap: 4 },
  orderCode: { fontSize: 13, fontWeight: "900" },
  date: { color: "#737373", fontSize: 10 },
  status: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  statusSuccess: { backgroundColor: "#E8F5D0" },
  statusDanger: { backgroundColor: "#FDE8E7" },
  statusPending: { backgroundColor: "#FFF3D6" },
  statusMuted: { backgroundColor: "#E5E5E5" },
  statusText: { color: "#333333", fontSize: 10, fontWeight: "800" },
  storeName: { color: "#647D13", fontSize: 12, fontWeight: "900", textAlign: "right" },
  meta: { fontSize: 11, textAlign: "right" },
  cardFooter: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#E5E5E5", paddingTop: 10 },
  openLabel: { color: "#647D13", fontSize: 11, fontWeight: "900" },
  total: { color: "#647D13", fontSize: 14, fontWeight: "900" },
  primary: { minHeight: 50, borderRadius: 14, backgroundColor: "#C6F135", justifyContent: "center", alignItems: "center" },
  primaryText: { color: "#0A0A0A", fontWeight: "900" }
});
