import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import {
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatDZD, formatNumber } from "@/lib/catalog";
import {
  fetchMerchantAccess,
  fetchMerchantDashboard,
  fetchMerchantOrderDetails
} from "@/lib/merchant";
import { translate, type Language, type TranslationKey, useLanguage } from "@/lib/i18n";
import { getLocalizedWilayaLabel } from "@/lib/locale-data";
import type { MerchantDashboardOrder } from "@/lib/merchant-dashboard-state";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { RefreshableScrollView, AppHeader, Button, Card, ErrorState, FilterBar, FilterChip, Icon, OrderCardSkeleton, MerchantOrderCard, MerchantStatusBadge, PriceDisplay, Text as UiText } from "@/components/ui";

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
  const { language } = useLanguage();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
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
        busy={access.isFetching}
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
        busy={dashboard.isFetching}
        onAction={() => void dashboard.refetch()}
      />
    );
  }

  const visibleOrders = filter === "all"
    ? dashboard.data.orders
    : dashboard.data.orders.filter((order) => order.status === filter);

  const getFilterCount = (value: OrderFilter) => value === "all"
    ? dashboard.data.orders.length
    : dashboard.data.orders.filter((order) => order.status === value).length;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <RefreshableScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshing={access.isFetching || dashboard.isFetching} onRefresh={() => { void Promise.all([access.refetch(), dashboard.refetch()]); }}>
        <AppHeader
          title={translate("merchantOrdersPageTitle")}
          leading={<Button label={translate("merchantOrdersBack")} onPress={() => router.replace("/merchant")} variant="ghost" size="sm" />}
        />
        <UiText style={[styles.eyebrow, { color: theme.colors.accentMuted }]}>{dashboard.data.store.name}</UiText>
        <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("merchantOrdersPageSubtitle")}</UiText>

        <FilterBar style={styles.filters}>
          {FILTERS.map((item) => (
            <FilterChip
              key={item.value}
              label={`${translate(item.label)} (${formatNumber(getFilterCount(item.value))})`}
              selected={filter === item.value}
              onPress={() => setFilter(item.value)}
            />
          ))}
        </FilterBar>

        <View style={styles.listHeading}>
          <UiText style={[styles.countText, { color: theme.colors.muted }]}>
            {formatNumber(visibleOrders.length)} / {formatNumber(dashboard.data.orders.length)}
          </UiText>
          <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
            {translate("merchantRecentOrdersTitle")}
          </UiText>
        </View>

        {visibleOrders.length === 0 ? (
          <Card contentStyle={styles.emptyCard}>
            <UiText style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
              {filter === "all"
                ? translate("merchantOrdersEmpty")
                : translate("merchantOrdersFilterEmptyHint")}
            </UiText>
            <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>
              {filter === "all" ? translate("merchantOrdersEmptyHint") : translate("merchantOrdersFilterEmpty")}
            </UiText>
          </Card>
        ) : (
          <View style={styles.orderList}>
            {visibleOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                language={language}
                theme={theme}
                onPress={() => {
                  if (storeId) void queryClient.prefetchQuery({ queryKey: ["merchant-order-detail", storeId, order.id], queryFn: () => fetchMerchantOrderDetails(order.id, storeId), staleTime: 15_000 });
                  router.push({ pathname: "/merchant/orders/[orderId]", params: { orderId: order.id } });
                }}
              />
            ))}
          </View>
        )}

        <UiText style={[styles.limitHint, { color: theme.colors.subtle }]}>
          {translate("merchantOrdersListLimitHint")}
        </UiText>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

function OrderCard({ order, language, theme, onPress }: { order: MerchantDashboardOrder; language: Language; theme: AppTheme; onPress: () => void }) {
  const style = createStyles(theme);
  const itemNames = order.productNames.length > 0
    ? order.productNames.slice(0, 3).join("، ")
    : translate("merchantOrderItems");
  const wilayaName = order.wilayaId === null ? order.wilayaName : getLocalizedWilayaLabel(order.wilayaId, order.wilayaName, language, order.wilayaNameFr);
  const location = [order.commune, wilayaName].filter(Boolean).join("، ");

  return (
    <MerchantOrderCard onPress={onPress} accessibilityLabel={translate("merchantOrderNumber") + " " + order.parentOrderId.slice(0, 8)}>
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
        {itemNames}
      </UiText>
      <UiText style={[style.quantityText, { color: theme.colors.subtle }]}>
        {formatNumber(order.totalQuantity)} {translate("merchantOrderQuantity")}
      </UiText>
      {location ? (
        <UiText style={[style.orderMeta, { color: theme.colors.muted }]}>{location}</UiText>
      ) : null}
      <View style={style.orderFooter}>
        <View style={style.priceBlock}>
          <UiText style={[style.metaLabel, { color: theme.colors.subtle }]}>{translate("merchantOrderTotal")}</UiText>
          <PriceDisplay value={formatDZD(order.subtotal + order.shippingFee)} style={style.orderPrice} />
        </View>
        <View style={style.deliveryBlock}>
          <UiText style={[style.metaLabel, { color: theme.colors.subtle }]}>{translate("merchantOrderDeliveryType")}</UiText>
          <UiText style={[style.deliveryType, { color: theme.colors.foreground }]}>
            {order.deliveryType === "desk"
              ? translate("checkoutStorePickup")
              : translate("checkoutHomeDelivery")}
          </UiText>
        </View>
      </View>
      <View style={style.orderAction}>
        <UiText style={{ color: theme.colors.accentMuted, fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" }}>
          {translate("merchantOrderDetailTitle")}
        </UiText>
        <Icon name="chevron-left" size={16} color={theme.colors.accentMuted} />
      </View>
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
    <SafeAreaView edges={["top", "left", "right"]} style={[stylesForScreen.safe, { backgroundColor: theme.colors.background }]}>
      <View accessible accessibilityLabel={label} style={stylesForScreen.center}>
        <View style={stylesForScreen.heading}>
          <UiText accessibilityRole="header" style={[stylesForScreen.headingTitle, { color: theme.colors.foreground }]}>
            {translate("merchantOrdersPageTitle")}
          </UiText>
          <UiText style={[stylesForScreen.headingSubtitle, { color: theme.colors.muted }]}>
            {translate("merchantOrdersPageSubtitle")}
          </UiText>
        </View>
        <View style={{ width: "100%", gap: designTokens.spacing.md }}>
          {[0, 1, 2, 3].map((item) => <OrderCardSkeleton key={item} />)}
        </View>
      </View>
    </SafeAreaView>
  );
}

function MessageScreen({
  theme,
  title,
  actionLabel,
  onAction,
  busy = false
}: {
  theme: AppTheme;
  title: string;
  actionLabel: string;
  onAction: () => void;
  busy?: boolean;
}) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[stylesForScreen.safe, { backgroundColor: theme.colors.background }]}>
      <View style={stylesForScreen.center}>
        <View style={stylesForScreen.heading}>
          <UiText accessibilityRole="header" style={[stylesForScreen.headingTitle, { color: theme.colors.foreground }]}>
            {translate("merchantOrdersPageTitle")}
          </UiText>
          <UiText style={[stylesForScreen.headingSubtitle, { color: theme.colors.muted }]}>
            {translate("merchantOrdersPageSubtitle")}
          </UiText>
        </View>
        <ErrorState title={title} retryLabel={actionLabel} busy={busy} onRetry={onAction} />
      </View>
    </SafeAreaView>
  );
}

const stylesForScreen = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, padding: designTokens.spacing.xxl, alignItems: "center", justifyContent: "center", gap: designTokens.spacing.lg },
  heading: { width: "100%", alignItems: "flex-start", gap: designTokens.spacing.xs },
  headingTitle: { fontSize: designTokens.typography.title, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  headingSubtitle: { fontSize: designTokens.typography.caption + 1, lineHeight: 19, textAlign: "auto" }
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: designTokens.spacing.lg, paddingBottom: designTokens.spacing.xxl, gap: designTokens.spacing.lg },
    eyebrow: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
    subtitle: { fontSize: designTokens.typography.caption + 1, lineHeight: 19, textAlign: "auto" },
    filters: { paddingVertical: designTokens.spacing.xs },
    listHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sectionTitle: { fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    countText: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
    orderList: { gap: designTokens.spacing.md },
    orderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.sm },
    orderCode: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
    customerName: { fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    orderMeta: { fontSize: designTokens.typography.caption, textAlign: "auto", lineHeight: 18 },
    quantityText: { fontSize: designTokens.typography.caption - 1, fontWeight: designTokens.fontWeights.semibold, textAlign: "auto" },
    orderFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: designTokens.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
    priceBlock: { gap: designTokens.spacing.xs, alignItems: "flex-start" },
    deliveryBlock: { gap: designTokens.spacing.xs, alignItems: "flex-end" },
    metaLabel: { fontSize: designTokens.typography.caption - 1, fontWeight: designTokens.fontWeights.medium },
    orderPrice: { alignSelf: "flex-start" },
    deliveryType: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.bold },
    orderAction: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.xs, alignSelf: "flex-start", paddingTop: designTokens.spacing.xs },
    emptyCard: { padding: designTokens.spacing.xl, gap: designTokens.spacing.sm, alignItems: "flex-start" },
    emptyTitle: { fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    limitHint: { fontSize: designTokens.typography.caption - 1, lineHeight: 16, textAlign: "auto", paddingHorizontal: designTokens.spacing.xs }
  });
}
