import { useQuery } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
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
import { AppHeader, Button, FilterBar, FilterChip, MerchantOrderCard, MerchantStatusBadge, PriceDisplay, Text as UiText } from "@/components/ui";

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
        <AppHeader
          title={translate("merchantOrdersPageTitle")}
          leading={<Button label={translate("merchantOrdersBack")} onPress={() => router.replace("/merchant")} variant="ghost" size="sm" />}
        />
        <UiText style={[styles.eyebrow, { color: theme.colors.accentMuted }]}>{dashboard.data.store.name}</UiText>
        <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("merchantOrdersPageSubtitle")}</UiText>

        <FilterBar style={styles.filters}>
          {FILTERS.map((item) => (
            <FilterChip key={item.value} label={translate(item.label)} selected={filter === item.value} onPress={() => setFilter(item.value)} />
          ))}
        </FilterBar>

        <View style={styles.listHeading}>
          <UiText style={[styles.countText, { color: theme.colors.muted }]}>
            {visibleOrders.length} / {dashboard.data.orders.length}
          </UiText>
          <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
            {translate("merchantRecentOrdersTitle")}
          </UiText>
        </View>

        {visibleOrders.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <UiText style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
              {filter === "all"
                ? translate("merchantOrdersEmpty")
                : translate("merchantOrdersFilterEmptyHint")}
            </UiText>
            <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>
              {filter === "all" ? translate("merchantOrdersEmptyHint") : translate("merchantOrdersFilterEmpty")}
            </UiText>
          </View>
        ) : (
          <View style={styles.orderList}>
            {visibleOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                theme={theme}
                onPress={() => router.push({ pathname: "/merchant/orders/[orderId]", params: { orderId: order.id } })}
              />
            ))}
          </View>
        )}

        <UiText style={[styles.limitHint, { color: theme.colors.subtle }]}>
          {translate("merchantOrdersListLimitHint")}
        </UiText>
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderCard({ order, theme, onPress }: { order: MerchantDashboardOrder; theme: AppTheme; onPress: () => void }) {
  const style = createStyles(theme);
  const itemNames = order.productNames.length > 0
    ? order.productNames.slice(0, 3).join("، ")
    : translate("merchantOrderItems");
  const location = [order.commune, order.wilayaName].filter(Boolean).join("، ");

  return (
    <MerchantOrderCard onPress={onPress} style={style.orderCard} accessibilityLabel={translate("merchantOrderNumber") + " " + order.parentOrderId.slice(0, 8)}>
      <View style={style.orderHeader}>
        <UiText style={[style.orderCode, { color: theme.colors.foreground }]}>
          {translate("merchantOrderNumber")} {order.parentOrderId.slice(0, 8)}
        </UiText>
        <OrderStatus order={order} />
      </View>
      <UiText style={[style.customerName, { color: theme.colors.foreground }]}>
        {order.customerName || translate("merchantCustomerUnknown")}
      </UiText>
      <UiText style={[style.orderMeta, { color: theme.colors.muted }]} numberOfLines={2}>
        {itemNames} · {order.totalQuantity} {translate("merchantOrderQuantity")}
      </UiText>
      {location ? (
        <UiText style={[style.orderMeta, { color: theme.colors.muted }]}>{location}</UiText>
      ) : null}
      <View style={style.orderFooter}>
        <PriceDisplay value={formatDZD(order.subtotal + order.shippingFee)} style={style.orderPrice} />
        <UiText style={[style.deliveryType, { color: theme.colors.subtle }]}>
          {order.deliveryType === "desk"
            ? translate("checkoutStorePickup")
            : translate("checkoutHomeDelivery")}
        </UiText>
      </View>
      <UiText style={{ color: theme.colors.accentMuted, fontSize: 10, fontWeight: "900", textAlign: "right" }}>
        {translate("merchantOrderDetailTitle")} ←
      </UiText>
    </MerchantOrderCard>
  );
}

function OrderStatus({ order }: { order: MerchantDashboardOrder }) {
  const labelByStatus: Record<string, TranslationKey> = {
    pending: "merchantOrderStatusPending",
    quoted: "merchantOrderStatusQuoted",
    confirmed: "merchantOrderStatusConfirmed",
    shipped: "merchantOrderStatusShipped",
    delivered: "merchantOrderStatusDelivered",
    cancelled: "merchantOrderStatusCancelled"
  };
  const tone = order.status === "delivered"
    ? "success"
    : order.status === "cancelled"
      ? "danger"
      : order.status === "pending" || order.status === "quoted"
        ? "warning"
        : "neutral";
  const key = order.status === "shipped" && order.deliveryType === "desk"
    ? "merchantOrderStatusPrepared"
    : labelByStatus[order.status] ?? "merchantOrderStatusUnknown";

  return <MerchantStatusBadge label={translate(key)} tone={tone} />;
}

function LoadingScreen({ theme, label }: { theme: AppTheme; label: string }) {
  return (
    <SafeAreaView style={[stylesForScreen.safe, { backgroundColor: theme.colors.background }]}>
      <View style={stylesForScreen.center}>
        <ActivityIndicator color={theme.colors.accentMuted} />
        <UiText style={[stylesForScreen.message, { color: theme.colors.muted }]}>{label}</UiText>
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
        <UiText style={[stylesForScreen.message, { color: theme.colors.foreground }]}>{title}</UiText>
        <Button label={actionLabel} onPress={onAction} />
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
    eyebrow: { fontSize: 11, fontWeight: "900" },
    subtitle: { fontSize: 12, lineHeight: 19, textAlign: "right" },
    filters: { paddingVertical: 3 },
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
    orderPrice: { alignSelf: "flex-start" },
    deliveryType: { fontSize: 10, fontWeight: "700" },
    emptyCard: { borderWidth: 1, borderRadius: 17, padding: 18, gap: 7, alignItems: "flex-end" },
    emptyTitle: { fontSize: 13, fontWeight: "900", textAlign: "right" },
    limitHint: { fontSize: 10, lineHeight: 16, textAlign: "right", paddingHorizontal: 3 }
  });
}
