import { useQuery } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatDZD } from "@/lib/catalog";
import {
  fetchMerchantAccess,
  fetchMerchantDashboard
} from "@/lib/merchant";
import { translate, type TranslationKey } from "@/lib/i18n";
import type { MerchantDashboardOrder } from "@/lib/merchant-dashboard-state";
import { useAppTheme, type AppTheme } from "@/lib/theme";

type OrderFilter = "all" | "pending" | "quoted" | "confirmed" | "shipped" | "delivered" | "cancelled";

const FILTERS: ReadonlyArray<{ value: OrderFilter; label: TranslationKey }> = [
  { value: "all", label: "merchantOrdersFilterAll" },
  { value: "pending", label: "merchantOrdersFilterPending" },
  { value: "quoted", label: "merchantOrdersFilterQuoted" },
  { value: "confirmed", label: "merchantOrdersFilterConfirmed" },
  { value: "shipped", label: "merchantOrdersFilterShipped" },
  { value: "delivered", label: "merchantOrdersFilterDelivered" },
  { value: "cancelled", label: "merchantOrdersFilterCancelled" }
];

export default function MerchantOrdersScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const [filter, setFilter] = useState<OrderFilter>("all");

  const access = useQuery({
    queryKey: ["merchant-access"],
    queryFn: fetchMerchantAccess,
    retry: false
  });

  const storeId = access.data?.store?.id ?? null;
  const ready = access.data?.status === "merchant_ready" && !!storeId;

  const dashboard = useQuery({
    queryKey: ["merchant-dashboard", storeId],
    queryFn: () => fetchMerchantDashboard(storeId ?? ""),
    enabled: ready,
    retry: false
  });

  if (access.isPending) {
    return <LoadingScreen theme={theme} label={translate("merchantLoading")} />;
  }

  if (access.isError) {
    return (
      <MessageScreen
        theme={theme}
        title={translate("merchantLoadError")}
        actionLabel={translate("merchantRetry")}
        onAction={() => void access.refetch()}
      />
    );
  }

  if (!access.data) return <Redirect href="/login" />;
  if (!ready) return <Redirect href="/merchant" />;

  if (dashboard.isPending) {
    return <LoadingScreen theme={theme} label={translate("merchantDashboardLoading")} />;
  }

  if (dashboard.isError) {
    return (
      <MessageScreen
        theme={theme}
        title={translate("merchantDashboardError")}
        actionLabel={translate("merchantRetry")}
        onAction={() => void dashboard.refetch()}
      />
    );
  }

  const visibleOrders = filter === "all"
    ? dashboard.data.orders
    : dashboard.data.orders.filter((order) => order.status === filter);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/merchant")}
          style={styles.backButton}
        >
          <Text style={[styles.backText, { color: theme.colors.accentMuted }]}>
            {translate("merchantOrdersBack")}
          </Text>
        </Pressable>

        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: theme.colors.accentMuted }]}>
            {dashboard.data.store.name}
          </Text>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>
            {translate("merchantOrdersPageTitle")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
            {translate("merchantOrdersPageSubtitle")}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((item) => {
            const selected = filter === item.value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(item.value)}
                style={[
                  styles.filterChip,
                  {
                    borderColor: selected ? theme.colors.accentMuted : theme.colors.border,
                    backgroundColor: selected ? theme.colors.successSurface : theme.colors.surface
                  }
                ]}
              >
                <Text style={[
                  styles.filterText,
                  { color: selected ? theme.colors.accentMuted : theme.colors.muted }
                ]}>
                  {translate(item.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.listHeading}>
          <Text style={[styles.countText, { color: theme.colors.muted }]}>
            {visibleOrders.length} / {dashboard.data.orders.length}
          </Text>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
            {translate("merchantRecentOrdersTitle")}
          </Text>
        </View>

        {visibleOrders.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
              {filter === "all"
                ? translate("merchantOrdersEmpty")
                : translate("merchantOrdersFilterEmptyHint")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {filter === "all" ? translate("merchantOrdersEmptyHint") : translate("merchantOrdersFilterEmpty")}
            </Text>
          </View>
        ) : (
          <View style={styles.orderList}>
            {visibleOrders.map((order) => (
              <OrderCard key={order.id} order={order} theme={theme} />
            ))}
          </View>
        )}

        <Text style={[styles.limitHint, { color: theme.colors.subtle }]}>
          {translate("merchantOrdersListLimitHint")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderCard({ order, theme }: { order: MerchantDashboardOrder; theme: AppTheme }) {
  const style = createStyles(theme);
  const itemNames = order.productNames.length > 0
    ? order.productNames.slice(0, 3).join("، ")
    : translate("merchantOrderItems");
  const location = [order.commune, order.wilayaName].filter(Boolean).join("، ");

  return (
    <View style={[style.orderCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={style.orderHeader}>
        <Text style={[style.orderCode, { color: theme.colors.foreground }]}>
          {translate("merchantOrderNumber")} {order.parentOrderId.slice(0, 8)}
        </Text>
        <OrderStatus order={order} theme={theme} />
      </View>
      <Text style={[style.customerName, { color: theme.colors.foreground }]}>
        {order.customerName || translate("merchantCustomerUnknown")}
      </Text>
      <Text style={[style.orderMeta, { color: theme.colors.muted }]} numberOfLines={2}>
        {itemNames} · {order.totalQuantity} {translate("merchantOrderQuantity")}
      </Text>
      {location ? (
        <Text style={[style.orderMeta, { color: theme.colors.muted }]}>{location}</Text>
      ) : null}
      <View style={style.orderFooter}>
        <Text style={[style.orderAmount, { color: theme.colors.accentMuted }]}>
          {formatDZD(order.subtotal + order.shippingFee)}
        </Text>
        <Text style={[style.deliveryType, { color: theme.colors.subtle }]}>
          {order.deliveryType === "desk"
            ? translate("checkoutStorePickup")
            : translate("checkoutHomeDelivery")}
        </Text>
      </View>
    </View>
  );
}

function OrderStatus({ order, theme }: { order: MerchantDashboardOrder; theme: AppTheme }) {
  const labelByStatus: Record<string, TranslationKey> = {
    pending: "merchantOrderStatusPending",
    quoted: "merchantOrderStatusQuoted",
    confirmed: "merchantOrderStatusConfirmed",
    shipped: "merchantOrderStatusShipped",
    delivered: "merchantOrderStatusDelivered",
    cancelled: "merchantOrderStatusCancelled"
  };
  const tone = order.status === "delivered"
    ? theme.colors.success
    : order.status === "cancelled"
      ? theme.colors.danger
      : order.status === "pending" || order.status === "quoted"
        ? theme.colors.warning
        : theme.colors.muted;
  const background = order.status === "delivered"
    ? theme.colors.successSurface
    : order.status === "cancelled"
      ? theme.colors.dangerSurface
      : order.status === "pending" || order.status === "quoted"
        ? theme.colors.warningSurface
        : theme.colors.surfaceMuted;

  return (
    <View style={{ backgroundColor: background, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}>
      <Text style={{ color: tone, fontSize: 10, fontWeight: "900" }}>
        {translate(labelByStatus[order.status] ?? "merchantOrderStatusUnknown")}
      </Text>
    </View>
  );
}

function LoadingScreen({ theme, label }: { theme: AppTheme; label: string }) {
  return (
    <SafeAreaView style={[stylesForScreen.safe, { backgroundColor: theme.colors.background }]}>
      <View style={stylesForScreen.center}>
        <ActivityIndicator color={theme.colors.accentMuted} />
        <Text style={[stylesForScreen.message, { color: theme.colors.muted }]}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

function MessageScreen({
  theme,
  title,
  actionLabel,
  onAction
}: {
  theme: AppTheme;
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <SafeAreaView style={[stylesForScreen.safe, { backgroundColor: theme.colors.background }]}>
      <View style={stylesForScreen.center}>
        <Text style={[stylesForScreen.message, { color: theme.colors.foreground }]}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={[stylesForScreen.action, { backgroundColor: theme.colors.accent }]}
        >
          <Text style={[stylesForScreen.actionText, { color: theme.colors.accentForeground }]}>{actionLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const stylesForScreen = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 16 },
  message: { fontSize: 14, lineHeight: 22, textAlign: "center", fontWeight: "700" },
  action: { minHeight: 46, borderRadius: 14, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  actionText: { fontSize: 13, fontWeight: "900" }
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: 17, paddingBottom: 35, gap: 16 },
    backButton: { minHeight: 43, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 3 },
    backText: { fontSize: 12, fontWeight: "800" },
    heading: { alignItems: "flex-end", gap: 7 },
    eyebrow: { fontSize: 11, fontWeight: "900" },
    title: { fontSize: 24, lineHeight: 32, fontWeight: "900", textAlign: "right" },
    subtitle: { fontSize: 12, lineHeight: 19, textAlign: "right" },
    filters: { flexDirection: "row-reverse", gap: 8, paddingVertical: 3 },
    filterChip: { minHeight: 42, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
    filterText: { fontSize: 11, fontWeight: "800" },
    listHeading: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
    sectionTitle: { fontSize: 14, fontWeight: "900", textAlign: "right" },
    countText: { fontSize: 11, fontWeight: "800" },
    orderList: { gap: 10 },
    orderCard: { borderWidth: 1, borderRadius: 17, padding: 14, gap: 9 },
    orderHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
    orderCode: { fontSize: 12, fontWeight: "900" },
    customerName: { fontSize: 13, fontWeight: "800", textAlign: "right" },
    orderMeta: { fontSize: 11, textAlign: "right", lineHeight: 17 },
    orderFooter: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
    orderAmount: { fontSize: 13, fontWeight: "900" },
    deliveryType: { fontSize: 10, fontWeight: "700" },
    emptyCard: { borderWidth: 1, borderRadius: 17, padding: 18, gap: 7, alignItems: "flex-end" },
    emptyTitle: { fontSize: 13, fontWeight: "900", textAlign: "right" },
    limitHint: { fontSize: 10, lineHeight: 16, textAlign: "right", paddingHorizontal: 3 }
  });
}
