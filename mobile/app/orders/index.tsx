import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, IconButton, PressableSurface, SegmentedControl, StatusBadge } from "@/components/ui";
import { formatDZD } from "@/lib/catalog";
import { fetchMyOrders, getOrderStatusTone, type CustomerOrder } from "@/lib/orders";
import { getSupabaseClient } from "@/lib/supabase";
import { translate } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";

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
  return orders.flatMap<OrderRow>((order) => {
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
  const theme = useAppTheme();
  const styles = createStyles(theme);
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
    <AppHeader title={translate("ordersTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Text style={{ color: theme.colors.foreground, fontSize: 24 }}>‹</Text>} />} />
    <ErrorState title={translate("ordersLoadError")} retryLabel={translate("retry")} onRetry={() => { void auth.refetch(); void orders.refetch(); }} />
  </CustomerScreen>;
  if (!auth.data) return <CustomerScreen>
    <AppHeader title={translate("ordersTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Text style={{ color: theme.colors.foreground, fontSize: 24 }}>‹</Text>} />} />\n    <Text style={{ color: theme.colors.muted, fontSize: 12, textAlign: "right" }}>{translate("ordersLoginHint")}</Text>
    <PressableSurface accessibilityRole="button" onPress={() => router.push("/login")} style={styles.primary}><Text style={styles.primaryText}>{translate("login")}</Text></PressableSurface>
  </CustomerScreen>;

  return <CustomerScreen>
    <AppHeader title={translate("ordersTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Text style={{ color: theme.colors.foreground, fontSize: 24 }}>‹</Text>} />} />\n    <Text style={{ color: theme.colors.muted, fontSize: 12, textAlign: "right" }}>{translate("ordersSubtitle")}</Text>
    <SegmentedControl
      accessibilityLabel={translate("ordersTitle")}
      options={TABS.map((item) => ({ key: item.id, label: translate(item.key) }))}
      value={tab}
      onChange={(value) => {
        const nextTab = TABS.find((item) => item.id === value);
        if (nextTab) setTab(nextTab.id);
      }}
      style={styles.tabs}
    />
    {filtered.length === 0 ? <EmptyState title={tab === "all" ? translate("ordersEmpty") : translate("ordersEmptyTab")} hint={translate("ordersEmptyHint")} /> : null}
    {filtered.map((row) => {
      const orderCode = row.order.id.replace(/-/g, "").slice(0, 8).toUpperCase();
      const tone = getOrderStatusTone(row.status);
      const total = row.status === "cancelled" || row.status === "rejected" ? 0 : row.subtotal + row.shippingFee;
      return <PressableSurface accessibilityRole="button" key={row.merchantOrderId ?? row.order.id} onPress={() => router.push({ pathname: "/orders/[orderId]", params: { orderId: row.order.id } })} accessibilityLabel={`${translate("ordersCode")} ${orderCode}، ${statusLabel(row.status)}، ${formatDZD(total)}`} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeading}>
            <Text style={[styles.orderCode, { color: theme.colors.foreground }]}>{translate("ordersCode")}: {orderCode}</Text>
            <Text style={styles.date}>{dateLabel(row.order.created_at)}</Text>
          </View>
          <StatusBadge
            label={statusLabel(row.status)}
            tone={tone === "success" ? "success" : tone === "danger" ? "danger" : tone === "pending" ? "warning" : "neutral"}
          />
        </View>
        {row.storeName ? <Text style={styles.storeName}>{row.storeName}</Text> : null}
        <Text style={[styles.meta, { color: theme.colors.muted }]}>{row.itemCount} {translate("ordersItems")}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.openLabel}>{translate("ordersViewDetails")}</Text>
          <Text style={styles.total}>{formatDZD(total)}</Text>
        </View>
      </PressableSurface>;
    })}
  </CustomerScreen>;
}

function createStyles(theme: AppTheme) { return StyleSheet.create({
  tabs: { width: "100%" },
  card: { borderRadius: 18, padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  cardHeading: { flex: 1, alignItems: "flex-end", gap: 4 },
  orderCode: { fontSize: 13, fontWeight: "900" },
  date: { color: theme.colors.muted, fontSize: 10 },
  storeName: { color: theme.colors.accentMuted, fontSize: 12, fontWeight: "900", textAlign: "right" },
  meta: { fontSize: 11, textAlign: "right" },
  cardFooter: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10 },
  openLabel: { color: theme.colors.accentMuted, fontSize: 11, fontWeight: "900" },
  total: { color: theme.colors.accentMuted, fontSize: 14, fontWeight: "900" },
  primary: { minHeight: 48, borderRadius: 14, backgroundColor: theme.colors.accent, justifyContent: "center", alignItems: "center" },
  primaryText: { color: theme.colors.foreground, fontWeight: "900" }
}); }

