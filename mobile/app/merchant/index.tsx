import { useQuery } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  fetchMerchantAccess,
  fetchMerchantDashboard
} from "@/lib/merchant";
import { formatDZD } from "@/lib/catalog";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";
import type { MerchantDashboardOrder } from "@/lib/merchant-dashboard-state";
import { AppHeader, Button, MerchantMetricCard, PressableSurface, StatusBadge } from "@/components/ui";

export default function MerchantEntryScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  const access = useQuery({
    queryKey: ["merchant-access"],
    queryFn: fetchMerchantAccess,
    retry: false
  });

  const storeId = access.data?.store?.id ?? null;
  const isMerchantReady = access.data?.status === "merchant_ready" && !!storeId;

  const dashboard = useQuery({
    queryKey: ["merchant-dashboard", storeId],
    queryFn: () => fetchMerchantDashboard(storeId ?? ""),
    enabled: isMerchantReady,
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

  if (access.data.status === "personal" || access.data.status === "merchant_setup_required") {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
        <ScrollView contentContainerStyle={styles.entryContent}>
          <Button label={translate("merchantBackToProfile")} onPress={() => router.replace("/profile")} variant="ghost" size="sm" />
          <View style={[styles.entryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.eyebrow, { color: theme.colors.accentMuted }]}>{translate("businessTitle")}</Text>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>
              {translate("merchantEntryTitle")}
            </Text>
            <Text style={[styles.body, { color: theme.colors.muted }]}>
              {access.data.status === "personal"
                ? translate("merchantStatusPersonalHint")
                : translate("merchantStatusSetupHint")}
            </Text>
            <Button label={translate("merchantStartOnboarding")} onPress={() => router.push("/merchant/onboarding")} fullWidth />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (access.data.status !== "merchant_ready" || !storeId) {
    const message = access.data.status === "delivery_company"
      ? translate("merchantStatusDeliveryHint")
      : translate("merchantStatusInconsistentHint");

    return (
      <MessageScreen
        theme={theme}
        title={message}
        actionLabel={translate("merchantBackToProfile")}
        onAction={() => router.replace("/profile")}
      />
    );
  }

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

  const data = dashboard.data;
  const recentOrders = data.orders.slice(0, 5);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader
          title={translate("merchantDashboardTitle")}
          leading={<Button label={translate("merchantBackToProfile")} onPress={() => router.replace("/profile")} variant="ghost" size="sm" />}
        />
        <Text style={[styles.body, { color: theme.colors.muted }]}>{translate("merchantDashboardSubtitle")}</Text>

        <View style={[styles.storeCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.storeHeader}>
            <View style={[styles.storeAvatar, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
              {data.store.logo_url ? (
                <Image source={{ uri: data.store.logo_url }} style={styles.storeImage} resizeMode="cover" />
              ) : (
                <Text style={[styles.storeAvatarText, { color: theme.colors.accentMuted }]}>A</Text>
              )}
            </View>
            <View style={styles.storeInfo}>
              <Text style={[styles.storeName, { color: theme.colors.foreground }]} numberOfLines={2}>
                {data.store.name}
              </Text>
              <Text style={[styles.storeMeta, { color: theme.colors.muted }]} numberOfLines={1}>
                {data.store.commune || translate("merchantStoreLocationMissing")}
              </Text>
              <View style={styles.storeBadges}>
                <StatusBadge label={data.store.is_verified ? translate("merchantStoreVerified") : translate("merchantStoreNotVerified")} tone={data.store.is_verified ? "success" : "warning"} />
                <View style={[styles.statusPill, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Text style={[styles.statusPillText, { color: theme.colors.muted }]}>
                    {translate("merchantStoreRating")}: {data.store.rating == null ? "—" : data.store.rating.toFixed(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <Button label={translate("merchantPreviewStore")} onPress={() => router.push({ pathname: "/store/[storeId]", params: { storeId: data.store.id } })} variant="outline" fullWidth style={{}} />
          <Button label={translate("merchantProductsTitle")} onPress={() => router.push("/merchant/products")} variant="outline" fullWidth style={{marginTop: 9}} />
          <Button label={translate("merchantStoreSettingsTitle")} onPress={() => router.push("/merchant/settings")} variant="outline" fullWidth style={{marginTop: 9}} />
          <Button label={translate("merchantAnalyticsTitle")} onPress={() => router.push("/merchant/analytics")} variant="outline" fullWidth style={{marginTop: 9}} />
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
            {translate("merchantOverviewTitle")}
          </Text>
          <Text style={[styles.sectionHint, { color: theme.colors.muted }]}>
            {translate("merchantOverviewHint")}
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          <MerchantMetricCard label={translate("merchantMetricProducts")} value={String(data.productCount)} hint={translate("merchantMetricProductsHint")} style={{ width: "48%", minHeight: 112, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 13, gap: 5 }} />
          <MerchantMetricCard label={translate("merchantMetricNeedsAction")} value={String(data.pendingOrderCount)} hint={translate("merchantMetricNeedsActionHint")} valueTone="warning" style={{ width: "48%", minHeight: 112, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 13, gap: 5 }} />
          <MerchantMetricCard label={translate("merchantMetricQuoted")} value={String(data.quotedOrderCount)} hint={translate("merchantMetricQuotedHint")} style={{ width: "48%", minHeight: 112, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 13, gap: 5 }} />
          <MerchantMetricCard label={translate("merchantMetricOrders")} value={String(data.orders.length)} hint={translate("merchantMetricOrdersHint")} style={{ width: "48%", minHeight: 112, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 13, gap: 5 }} />
        </View>

        <View style={styles.sectionHeading}>
          <View style={styles.sectionHeadingText}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
              {translate("merchantRecentOrdersTitle")}
            </Text>
            <Text style={[styles.sectionHint, { color: theme.colors.muted }]}>
              {translate("merchantRecentOrdersHint")}
            </Text>
          </View>
          <Button label={translate("merchantViewAllOrders")} onPress={() => router.push("/merchant/orders")} variant="ghost" size="sm" />
        </View>

        {recentOrders.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
              {translate("merchantOrdersEmpty")}
            </Text>
            <Text style={[styles.body, { color: theme.colors.muted }]}>
              {translate("merchantOrdersEmptyHint")}
            </Text>
          </View>
        ) : (
          <View style={[styles.ordersCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {recentOrders.map((order, index) => (
              <PressableSurface
                key={order.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/merchant/orders/[orderId]", params: { orderId: order.id } })}
                style={[
                  styles.orderRow,
                  index < recentOrders.length - 1 && { borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth }
                ]}
              >
                <View style={styles.orderMain}>
                  <View style={styles.orderTopLine}>
                    <Text style={[styles.orderCode, { color: theme.colors.foreground }]}>
                      {`${translate("merchantOrderNumber")} ${order.parentOrderId.slice(0, 8)}`}
                    </Text>
                    <OrderStatus order={order} />
                  </View>
                  <Text style={[styles.orderCustomer, { color: theme.colors.muted }]} numberOfLines={1}>
                    {order.customerName || translate("merchantCustomerUnknown")}
                  </Text>
                  <Text style={[styles.orderItems, { color: theme.colors.muted }]} numberOfLines={2}>
                    {order.productNames.join("، ") || translate("merchantOrderItems")}
                    {" · "}
                    {`${order.totalQuantity} ${translate("merchantOrderQuantity")}`}
                  </Text>
                </View>
                <Text style={[styles.orderAmount, { color: theme.colors.accentMuted }]}>
                  {formatDZD(order.subtotal + order.shippingFee)}
                </Text>
                <Text style={[styles.textButtonLabel, { color: theme.colors.accentMuted }]}>
                  {translate("merchantOrderDetailTitle")} ←
                </Text>
              </PressableSurface>
            ))}
          </View>
        )}

        <Button label={translate("merchantManageOrders")} onPress={() => router.push("/merchant/orders")} fullWidth />

        <Button label={translate("merchantManageProducts")} onPress={() => router.push("/merchant/products")} variant="outline" fullWidth />
      </ScrollView>
    </SafeAreaView>
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

  return <StatusBadge label={translate(key)} tone={tone} />;
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
  actionText: { fontSize: 13, fontWeight: "900" },
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: 17, paddingBottom: 36, gap: 15 },
    entryContent: { flexGrow: 1, padding: 20, gap: 18 },
    header: { alignItems: "flex-end", gap: 7 },
    backButton: { minHeight: 42, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 3 },
    backText: { fontSize: 12, fontWeight: "800" },
    eyebrow: { fontSize: 11, fontWeight: "900" },
    title: { fontSize: 25, lineHeight: 33, fontWeight: "900", textAlign: "right" },
    body: { fontSize: 12, lineHeight: 20, textAlign: "right" },
    entryCard: { borderWidth: 1, borderRadius: 22, padding: 19, gap: 13 },
    storeCard: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 14 },
    storeHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
    storeAvatar: { width: 58, height: 58, borderWidth: 1, borderRadius: 17, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    storeImage: { width: "100%", height: "100%" },
    storeAvatarText: { fontSize: 25, fontWeight: "900" },
    storeInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
    storeName: { fontSize: 17, fontWeight: "900", textAlign: "right" },
    storeMeta: { fontSize: 11, textAlign: "right" },
    storeBadges: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 3 },
    statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
    statusPillText: { fontSize: 10, fontWeight: "900" },
    secondaryButton: { minHeight: 43, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    secondaryButtonText: { fontSize: 12, fontWeight: "800" },
    sectionHeading: { flexDirection: "row-reverse", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginTop: 2 },
    sectionHeadingText: { flex: 1, alignItems: "flex-end", gap: 3 },
    sectionTitle: { fontSize: 15, fontWeight: "900", textAlign: "right" },
    sectionHint: { fontSize: 10, lineHeight: 16, textAlign: "right" },
    metricsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9 },
    textButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 3 },
    textButtonLabel: { fontSize: 11, fontWeight: "900" },
    ordersCard: { borderWidth: 1, borderRadius: 17, overflow: "hidden" },
    orderRow: { paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row-reverse", alignItems: "center", gap: 10 },
    orderMain: { flex: 1, alignItems: "flex-end", gap: 5 },
    orderTopLine: { width: "100%", flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 7 },
    orderCode: { fontSize: 11, fontWeight: "900" },
    orderCustomer: { width: "100%", fontSize: 11, textAlign: "right" },
    orderItems: { width: "100%", fontSize: 10, lineHeight: 15, textAlign: "right" },
    orderAmount: { fontSize: 11, fontWeight: "900" },
    emptyCard: { borderWidth: 1, borderRadius: 17, padding: 17, gap: 7, alignItems: "flex-end" },
    emptyTitle: { fontSize: 13, fontWeight: "900", textAlign: "right" },
    primaryButton: { minHeight: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
    primaryButtonText: { fontSize: 13, fontWeight: "900" }
  });
}
