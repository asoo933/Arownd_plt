import { useQuery } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { formatDZD } from "@/lib/catalog";
import { fetchMerchantAccess } from "@/lib/merchant";
import { fetchMerchantAnalytics } from "@/lib/merchant-analytics";
import { translate } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";

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
  const cards = [
    { label: translate("merchantAnalyticsOrders"), value: String(data.orders_total), tone: theme.colors.foreground },
    { label: translate("merchantAnalyticsDelivered"), value: String(data.delivered_orders), tone: theme.colors.success },
    { label: translate("merchantAnalyticsActive"), value: String(data.active_orders), tone: theme.colors.warning },
    { label: translate("merchantAnalyticsCancelled"), value: String(data.cancelled_orders), tone: theme.colors.danger },
    { label: translate("merchantAnalyticsRevenue"), value: formatDZD(data.delivered_revenue), tone: theme.colors.accentMuted },
    { label: translate("merchantAnalyticsAverage"), value: formatDZD(data.average_delivered_order), tone: theme.colors.foreground },
    { label: translate("merchantAnalyticsProducts"), value: String(data.product_count), tone: theme.colors.foreground },
    { label: translate("merchantAnalyticsLowStock"), value: String(data.low_stock_count), tone: theme.colors.warning },
    { label: translate("merchantAnalyticsOutOfStock"), value: String(data.out_of_stock_count), tone: theme.colors.danger },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={[styles.backText, { color: theme.colors.accentMuted }]}>{translate("back")}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{translate("merchantAnalyticsTitle")}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("merchantAnalyticsSubtitle")}</Text>
        <View style={styles.grid}>
          {cards.map((card) => (
            <View key={card.label} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.cardLabel, { color: theme.colors.muted }]}>{card.label}</Text>
              <Text style={[styles.cardValue, { color: card.tone }]} numberOfLines={1}>{card.value}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.chartCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("merchantAnalyticsLastSevenDays")}</Text>
          {data.daily_delivered.every((item) => item.amount === 0) ? (
            <Text style={[styles.empty, { color: theme.colors.muted }]}>{translate("merchantAnalyticsNoSales")}</Text>
          ) : data.daily_delivered.map((item) => (
            <View key={item.day} style={styles.dayRow}>
              <Text style={[styles.dayLabel, { color: theme.colors.muted }]}>{new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "short" }).format(new Date(item.day + "T12:00:00"))}</Text>
              <View style={[styles.track, { backgroundColor: theme.colors.surfaceMuted }]}>
                <View style={[styles.bar, { backgroundColor: theme.colors.accent, width: Math.max(item.amount > 0 ? 3 : 0, item.amount / maxDaily * 100) + "%" }]} />
              </View>
              <Text style={[styles.amount, { color: theme.colors.foreground }]}>{formatDZD(item.amount)}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.note, { color: theme.colors.muted }]}>{translate("merchantAnalyticsRevenueNote")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Message({ theme, label, loading = false, actionLabel, onAction }: {
  theme: AppTheme; label: string; loading?: boolean; actionLabel?: string; onAction?: () => void;
}) {
  const styles = createStyles(theme);
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
    <View style={styles.message}>
      {loading ? <ActivityIndicator color={theme.colors.accentMuted} /> : null}
      <Text style={[styles.subtitle, { color: theme.colors.foreground }]}>{label}</Text>
      {actionLabel && onAction ? <Pressable onPress={onAction} style={[styles.back, { backgroundColor: theme.colors.accent }]}><Text style={styles.retry}>{actionLabel}</Text></Pressable> : null}
    </View>
  </SafeAreaView>;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: 16, paddingBottom: 36, gap: 12 },
    back: { minHeight: 42, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 10, borderRadius: 10 },
    backText: { fontSize: 12, fontWeight: "800" },
    retry: { color: theme.colors.accentForeground, fontSize: 12, fontWeight: "900" },
    title: { fontSize: 24, fontWeight: "900", textAlign: "right" },
    subtitle: { fontSize: 12, lineHeight: 20, textAlign: "right" },
    grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9 },
    card: { width: "48%", flexGrow: 1, minHeight: 88, borderWidth: 1, borderRadius: 15, padding: 12, justifyContent: "space-between", gap: 8 },
    cardLabel: { fontSize: 10, textAlign: "right", fontWeight: "700" },
    cardValue: { fontSize: 18, textAlign: "right", fontWeight: "900" },
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
