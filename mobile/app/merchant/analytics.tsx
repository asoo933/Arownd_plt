import { useQuery } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatDZD } from "@/lib/catalog";
import { fetchMerchantAccess } from "@/lib/merchant";
import { fetchMerchantAnalytics } from "@/lib/merchant-analytics";
import { translate } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";
import { AppHeader, Button, ChartCard, ErrorState, LoadingState, MerchantMetricCard, Text as UiText } from "@/components/ui";

export default function MerchantAnalyticsScreen() {
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
  if (access.isError || analytics.isError) {
    return <Message theme={theme} label={translate("merchantDashboardError")} actionLabel={translate("merchantRetry")} onAction={() => { void access.refetch(); void analytics.refetch(); }} />;
  }
  if (!access.data) return <Redirect href="/login" />;
  if (!ready || !analytics.data) return <Redirect href="/merchant" />;

  const data = analytics.data;
  const maxDaily = Math.max(1, ...data.daily_delivered.map((item) => item.amount));
  const cards: { label: string; value: string; tone: "default" | "success" | "warning" | "danger" | "accent" }[] = [
    { label: translate("merchantAnalyticsOrders"), value: String(data.orders_total), tone: "default" },
    { label: translate("merchantAnalyticsDelivered"), value: String(data.delivered_orders), tone: "success" },
    { label: translate("merchantAnalyticsActive"), value: String(data.active_orders), tone: "warning" },
    { label: translate("merchantAnalyticsCancelled"), value: String(data.cancelled_orders), tone: "danger" },
    { label: translate("merchantAnalyticsRevenue"), value: formatDZD(data.delivered_revenue), tone: "accent" },
    { label: translate("merchantAnalyticsAverage"), value: formatDZD(data.average_delivered_order), tone: "default" },
    { label: translate("merchantAnalyticsProducts"), value: String(data.product_count), tone: "default" },
    { label: translate("merchantAnalyticsLowStock"), value: String(data.low_stock_count), tone: "warning" },
    { label: translate("merchantAnalyticsOutOfStock"), value: String(data.out_of_stock_count), tone: "danger" },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppHeader
          title={translate("merchantAnalyticsTitle")}
          leading={<Button label={translate("back")} onPress={() => router.back()} variant="ghost" size="sm" />}
        />
        <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("merchantAnalyticsSubtitle")}</UiText>
        <View style={styles.grid}>
          {cards.map((card) => (
            <MerchantMetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              valueTone={card.tone}
              style={styles.metricCard}
            />
          ))}
        </View>
        <ChartCard style={styles.chartCard}>
          <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantAnalyticsLastSevenDays")}</UiText>
          {data.daily_delivered.every((item) => item.amount === 0) ? (
            <UiText style={[styles.empty, { color: theme.colors.muted }]}>{translate("merchantAnalyticsNoSales")}</UiText>
          ) : data.daily_delivered.map((item) => (
            <View key={item.day} style={styles.dayRow}>
              <UiText style={[styles.dayLabel, { color: theme.colors.muted }]}>{new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "short" }).format(new Date(item.day + "T12:00:00"))}</UiText>
              <View style={[styles.track, { backgroundColor: theme.colors.surfaceMuted }]}>
                <View style={[styles.bar, { backgroundColor: theme.colors.accent, width: Math.max(item.amount > 0 ? 3 : 0, item.amount / maxDaily * 100) + "%" }]} />
              </View>
              <UiText style={[styles.amount, { color: theme.colors.foreground }]}>{formatDZD(item.amount)}</UiText>
            </View>
          ))}
        </ChartCard>
        <UiText style={[styles.note, { color: theme.colors.muted }]}>{translate("merchantAnalyticsRevenueNote")}</UiText>
      </ScrollView>
    </SafeAreaView>
  );
}

function Message({ theme, label, loading = false, actionLabel, onAction }: {
  theme: AppTheme; label: string; loading?: boolean; actionLabel?: string; onAction?: () => void;
}) {
  const styles = createStyles(theme);
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={styles.message}>
        {loading ? (
          <LoadingState label={label} />
        ) : actionLabel && onAction ? (
          <ErrorState title={label} retryLabel={actionLabel} onRetry={onAction} />
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
    content: { padding: 16, paddingBottom: 36, gap: 12 },
    subtitle: { fontSize: 12, lineHeight: 20, textAlign: "right" },
    grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9 },
    metricCard: { width: "48%", flexGrow: 1, minHeight: 88 },
    chartCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 15 },
    sectionTitle: { fontSize: 13, fontWeight: "900", textAlign: "right" },
    dayRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
    dayLabel: { width: 48, fontSize: 10, textAlign: "right" },
    track: { flex: 1, height: 9, borderRadius: 6, overflow: "hidden" },
    bar: { height: 9, borderRadius: 6 },
    amount: { width: 90, fontSize: 9, textAlign: "right" },
    empty: { textAlign: "center", fontSize: 11, paddingVertical: 12 },
    note: { fontSize: 10, lineHeight: 17, textAlign: "right" },
    message: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 14 }
  });
}
