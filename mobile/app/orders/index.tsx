import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, Icon, IconButton, OrderCard, OrderStatusBadge, PriceDisplay, PressableSurface, SegmentedControl, Text as UiText } from "@/components/ui";
import { formatDZD, formatNumber } from "@/lib/catalog";
import { fetchMyOrders, getOrderStatusTone, type CustomerOrder } from "@/lib/orders";
import { getSupabaseClient } from "@/lib/supabase";
import { translate, type Language, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";

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

function dateLabel(value: string, language: Language): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "en-DZ", { day: "numeric", month: "long", year: "numeric" }).format(date);
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
  const { language } = useLanguage();
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

  const userId = auth.data?.id;
  const refetchOrders = orders.refetch;

  useEffect(() => {
    if (!userId) return;
    const client = getSupabaseClient();
    const channel = client.channel("native-customer-orders-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: "user_id=eq." + userId }, () => {
        void refetchOrders();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "merchant_orders", filter: "customer_id=eq." + userId }, () => {
        void refetchOrders();
      })
      .subscribe();
    return () => { void client.removeChannel(channel); };
  }, [userId, refetchOrders]);

  const rows = useMemo(() => toRows(orders.data ?? []), [orders.data]);
  const filtered = rows.filter((row) => {
    if (tab === "all") return true;
    if (tab === "active") return ["pending", "quoted", "confirmed", "shipped"].includes(row.status);
    if (tab === "delivered") return row.status === "delivered";
    return row.status === "cancelled" || row.status === "rejected";
  });

  if (auth.isPending || (auth.data && orders.isPending)) return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  if (auth.isError || orders.isError) return <CustomerScreen>
    <AppHeader title={translate("ordersTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="arrow-right" size={22} color={theme.colors.foreground} />} />} />
    <ErrorState title={translate("ordersLoadError")} retryLabel={translate("retry")} onRetry={() => { void auth.refetch(); void refetchOrders(); }} />
  </CustomerScreen>;
  if (!auth.data) return <CustomerScreen>
    <AppHeader title={translate("ordersTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="arrow-right" size={22} color={theme.colors.foreground} />} />} />
    <UiText style={{ color: theme.colors.muted, fontSize: designTokens.typography.caption + 1, textAlign: "auto" }}>{translate("ordersLoginHint")}</UiText>
    <PressableSurface accessibilityRole="button" accessibilityLabel={translate("login")} onPress={() => router.push("/login")} style={styles.primary}><UiText style={styles.primaryText}>{translate("login")}</UiText></PressableSurface>
  </CustomerScreen>;

  return <CustomerScreen>
    <AppHeader title={translate("ordersTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="arrow-right" size={22} color={theme.colors.foreground} />} />} />
    <UiText style={{ color: theme.colors.muted, fontSize: designTokens.typography.caption + 1, textAlign: "auto" }}>{translate("ordersSubtitle")}</UiText>
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
      return <OrderCard key={row.merchantOrderId ?? row.order.id} onPress={() => router.push({ pathname: "/orders/[orderId]", params: { orderId: row.order.id } })} accessibilityLabel={`${translate("ordersCode")} ${orderCode}، ${statusLabel(row.status)}، ${formatDZD(total)}`} style={styles.card} contentStyle={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeading}>
            <UiText style={[styles.orderCode, { color: theme.colors.foreground }]}>{translate("ordersCode")}: {orderCode}</UiText>
            <UiText style={styles.date}>{dateLabel(row.order.created_at, language)}</UiText>
          </View>
          <OrderStatusBadge label={statusLabel(row.status)} tone={tone === "success" ? "success" : tone === "danger" ? "danger" : tone === "pending" ? "warning" : "neutral"} />
        </View>
        {row.storeName ? <UiText style={styles.storeName}>{row.storeName}</UiText> : null}
        <View style={styles.metaRow}>
          <UiText style={[styles.meta, { color: theme.colors.muted }]}>{formatNumber(row.itemCount)} {translate("ordersItems")}</UiText>
          <Icon name="shopping-bag" size={designTokens.dimensions.iconSize.xs} color={theme.colors.muted} />
        </View>
        <View style={styles.cardFooter}>
          <UiText style={styles.openLabel}>{translate("ordersViewDetails")}</UiText>
          <PriceDisplay value={formatDZD(total)} style={styles.priceDisplay} />
        </View>
      </OrderCard>;
    })}
  </CustomerScreen>;
}

function createStyles(theme: AppTheme) { return StyleSheet.create({
  tabs: { width: "100%" },
  card: { borderRadius: designTokens.radius.xl },
  cardContent: { padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
  priceDisplay: { justifyContent: "flex-start" },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md },
  cardHeading: { flex: 1, alignItems: "flex-start", gap: designTokens.spacing.xs },
  orderCode: { fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.extrabold },
  date: { color: theme.colors.muted, fontSize: designTokens.typography.caption - 1 },
  storeName: { color: theme.colors.accentMuted, fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.xs },
  meta: { fontSize: designTokens.typography.caption, textAlign: "auto" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, paddingTop: designTokens.spacing.md, marginTop: designTokens.spacing.xs },
  openLabel: { color: theme.colors.accentMuted, fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
  primary: { minHeight: 48, borderRadius: designTokens.radius.md, backgroundColor: theme.colors.accent, justifyContent: "center", alignItems: "center" },
  primaryText: { color: theme.colors.foreground, fontWeight: designTokens.fontWeights.extrabold }
}); }

