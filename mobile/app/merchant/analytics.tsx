import { useQuery } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatDZD, formatNumber } from "@/lib/catalog";
import { fetchMerchantAccess } from "@/lib/merchant";
import { fetchMerchantAnalytics } from "@/lib/merchant-analytics";
import { translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { AppHeader, Button, ChartCard, ErrorState, Heading, MetricCardSkeleton, Skeleton, MerchantMetricCard, Text as UiText } from "@/components/ui";

export default function MerchantAnalyticsScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const access = useQuery({ queryKey: ["merchant-access"], queryFn: fetchMerchantAccess, retry: false });
  const storeId = access.data?.store?.id ?? null;
  const ready = access.data?.status === "merchant_ready" && Boolean(storeId);
  const analytics = useQuery({
    queryKey: ["merchant-analytics", storeId],
    queryFn: () => fetchMerchantAnalytics(storeId ?? ""),
    enabled: ready,
    retry: false
  });

  if (access.isPending || (ready && analytics.isPending)) {
    return <Message theme={theme} label={translate("merchantLoading")} loading />;
  }
  if (access.isError) {
    return <Message theme={theme} label={translate("merchantDashboardError")} actionLabel={translate("merchantRetry")} busy={access.isFetching} onAction={() => void access.refetch()} />;
  }
  if (analytics.isError) {
    return <Message theme={theme} label={translate("merchantDashboardError")} actionLabel={translate("merchantRetry")} busy={analytics.isFetching} onAction={() => void analytics.refetch()} />;
  }
  if (!access.data) return <Redirect href="/login" />;
  if (!ready || !analytics.data) return <Redirect href="/merchant" />;

  const data = analytics.data;
  const maxDaily = Math.max(1, ...data.daily_delivered.map((item) => item.amount));
  const orderCards = [
    { label: translate("merchantAnalyticsOrders"), value: formatNumber(data.orders_total), tone: "default" as const },
    { label: translate("merchantAnalyticsDelivered"), value: formatNumber(data.delivered_orders), tone: "success" as const },
    { label: translate("merchantAnalyticsActive"), value: formatNumber(data.active_orders), tone: "warning" as const },
    { label: translate("merchantAnalyticsCancelled"), value: formatNumber(data.cancelled_orders), tone: "danger" as const }
  ];
  const inventoryCards = [
    { label: translate("merchantAnalyticsProducts"), value: formatNumber(data.product_count), tone: "default" as const },
    { label: translate("merchantAnalyticsLowStock"), value: formatNumber(data.low_stock_count), tone: "warning" as const },
    { label: translate("merchantAnalyticsOutOfStock"), value: formatNumber(data.out_of_stock_count), tone: "danger" as const }
  ];

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader
          title={translate("merchantAnalyticsTitle")}
          leading={<Button label={translate("back")} onPress={() => router.back()} variant="ghost" size="sm" />}
        />
        <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("merchantAnalyticsSubtitle")}</UiText>

        <Heading level={3}>{translate("merchantAnalyticsOrders")}</Heading>
        <View style={styles.grid}>
          {orderCards.map((card) => (
            <MerchantMetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              valueTone={card.tone}
              style={styles.metricCard}
            />
          ))}
        </View>

        <Heading level={3}>{translate("merchantAnalyticsRevenue")}</Heading>
        <View style={styles.revenueMetrics}>
          <MerchantMetricCard
            label={translate("merchantAnalyticsRevenue")}
            value={formatDZD(data.delivered_revenue)}
            valueTone="accent"
            style={styles.revenueMetric}
          />
          <View style={[styles.metricDivider, { backgroundColor: theme.colors.border }]} />
          <MerchantMetricCard
            label={translate("merchantAnalyticsAverage")}
            value={formatDZD(data.average_delivered_order)}
            style={styles.revenueMetric}
          />
        </View>

        <Heading level={3}>{translate("merchantAnalyticsLastSevenDays")}</Heading>
        <ChartCard style={styles.chartCard}>
          {data.daily_delivered.every((item) => item.amount === 0) ? (
            <UiText style={[styles.empty, { color: theme.colors.muted }]}>{translate("merchantAnalyticsNoSales")}</UiText>
          ) : data.daily_delivered.map((item) => (
            <View key={item.day} style={styles.dayRow}>
              <UiText style={[styles.dayLabel, { color: theme.colors.muted }]}>{new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "en-DZ", { day: "numeric", month: "short" }).format(new Date(item.day + "T12:00:00"))}</UiText>
              <View style={[styles.track, { backgroundColor: theme.colors.surfaceMuted }]}>
                <View style={[styles.bar, { backgroundColor: theme.colors.accent, width: Math.max(item.amount > 0 ? 3 : 0, item.amount / maxDaily * 100) + "%" }]} />
              </View>
              <UiText numberOfLines={1} adjustsFontSizeToFit style={[styles.amount, { color: theme.colors.foreground }]}>{formatDZD(item.amount)}</UiText>
            </View>
          ))}
        </ChartCard>

        <Heading level={3}>{translate("merchantAnalyticsProducts")}</Heading>
        <View style={styles.inventoryGrid}>
          {inventoryCards.map((card, index) => (
            <MerchantMetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              valueTone={card.tone}
              style={index === 2 ? styles.inventoryWideCard : styles.metricCard}
            />
          ))}
        </View>
        <UiText style={[styles.note, { color: theme.colors.muted }]}>{translate("merchantAnalyticsRevenueNote")}</UiText>
      </ScrollView>
    </SafeAreaView>
  );
}

function Message({ theme, label, loading = false, actionLabel, onAction, busy = false }: {
  theme: AppTheme; label: string; loading?: boolean; actionLabel?: string; onAction?: () => void; busy?: boolean;
}) {
  const styles = createStyles(theme);
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={styles.message}>
        {loading ? (
          <View style={{ width: "100%", gap: designTokens.spacing.md }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm }}>
            {[0, 1, 2, 3].map((item) => <MetricCardSkeleton key={item} style={{ width: "47%", flex: 0 }} />)}
          </View>
          <View style={{ gap: designTokens.spacing.sm, padding: designTokens.spacing.md }}>
            {[0, 1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} height={9} width={`${55 + item * 5}%`} radius={designTokens.radius.pill} />)}
          </View>
        </View>
        ) : actionLabel && onAction ? (
          <ErrorState title={label} retryLabel={actionLabel} busy={busy} onRetry={onAction} />
        ) : (
          <UiText style={[styles.subtitle, { color: theme.colors.foreground }]}>{label}</UiText>
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: designTokens.spacing.xl, paddingBottom: 36, gap: designTokens.spacing.lg },
    subtitle: { fontSize: designTokens.typography.caption + 1, lineHeight: 20, textAlign: "auto" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm },
    inventoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm },
    metricCard: { width: "48%", flexGrow: 1, minHeight: 96 },
    inventoryWideCard: { width: "100%", flex: 0, flexGrow: 0, alignSelf: "stretch", minHeight: 96 },
    revenueMetrics: { flexDirection: "row", alignItems: "stretch", gap: designTokens.spacing.md },
    revenueMetric: { flex: 1, minWidth: 0, padding: designTokens.spacing.sm, gap: designTokens.spacing.xs },
    metricDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
    chartCard: { gap: designTokens.spacing.md },
    dayRow: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm },
    dayLabel: { width: 48, fontSize: designTokens.typography.caption - 1, textAlign: "auto" },
    track: { flex: 1, minWidth: 0, height: 9, borderRadius: theme.radius.pill, overflow: "hidden" },
    bar: { height: 9, borderRadius: theme.radius.pill },
    amount: { minWidth: 54, maxWidth: 104, flexShrink: 1, fontSize: designTokens.typography.caption - 2, textAlign: "auto" },
    empty: { textAlign: "center", fontSize: designTokens.typography.caption, paddingVertical: designTokens.spacing.md },
    note: { fontSize: designTokens.typography.caption - 1, lineHeight: 17, textAlign: "auto" },
    message: { flex: 1, justifyContent: "center", alignItems: "center", padding: designTokens.spacing.xxl, gap: designTokens.spacing.lg }
  });
}
