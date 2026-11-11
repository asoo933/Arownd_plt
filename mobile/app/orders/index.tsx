import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, I18nManager, PanResponder, StyleSheet, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState } from "@/components/customer-ui";
import { AppHeader, Button, Icon, IconButton, OrderCard, OrderCardSkeleton, OrderStatusBadge, PriceDisplay, PressableSurface, SegmentedControl, Text as UiText } from "@/components/ui";
import { formatMarketPrice, formatNumber } from "@/lib/catalog";
import { fetchCustomerOrderDetails, fetchMyOrders, getOrderStatusTone, type CustomerOrder } from "@/lib/orders";
import { getSupabaseClient } from "@/lib/supabase";
import { translate, type Language, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { formatOrderCode, isHideableOrderStatus } from "@/lib/orders-state";
import { triggerSuccessHaptic } from "@/lib/haptics";

const HIDDEN_ORDER_ROWS_STORAGE_KEY = "arownd:hidden-order-rows:v1:";

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
        itemCount: order.items.reduce((total, item) => total + item.quantity, 0)
      }];
    }
    return order.merchant_orders.map((merchantOrder) => ({
      order,
      merchantOrderId: merchantOrder.id,
      status: merchantOrder.status,
      subtotal: merchantOrder.subtotal,
      shippingFee: merchantOrder.shipping_fee,
      storeName: merchantOrder.store?.name ?? null,
      itemCount: merchantOrder.items.reduce((total, item) => total + item.quantity, 0)
    }));
  });
}

export default function OrdersScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<OrdersTab>("all");
  const [hiddenRowIds, setHiddenRowIds] = useState<string[]>([]);
  const [hiddenRowsReady, setHiddenRowsReady] = useState(false);
  const hiddenRowIdsRef = useRef<string[]>([]);
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
  const hiddenRowsStorageKey = userId ? HIDDEN_ORDER_ROWS_STORAGE_KEY + userId : null;

  useEffect(() => {
    let active = true;
    hiddenRowIdsRef.current = [];
    setHiddenRowIds([]);

    if (!hiddenRowsStorageKey) {
      setHiddenRowsReady(true);
      return () => { active = false; };
    }

    setHiddenRowsReady(false);
    void AsyncStorage.getItem(hiddenRowsStorageKey)
      .then((storedValue) => {
        if (!active) return;
        if (!storedValue) return;
        try {
          const parsed: unknown = JSON.parse(storedValue);
          if (Array.isArray(parsed)) {
            const ids = parsed.filter((value): value is string => typeof value === "string");
            hiddenRowIdsRef.current = ids;
            setHiddenRowIds(ids);
          }
        } catch {
          hiddenRowIdsRef.current = [];
          setHiddenRowIds([]);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setHiddenRowsReady(true);
      });

    return () => { active = false; };
  }, [hiddenRowsStorageKey]);

  const hideOrderRow = useCallback((row: OrderRow) => {
    if (!hiddenRowsStorageKey || !isHideableOrderStatus(row.status)) return;
    const rowId = row.merchantOrderId ?? row.order.id;
    const previousIds = hiddenRowIdsRef.current;
    const nextIds = Array.from(new Set([...previousIds, rowId]));
    hiddenRowIdsRef.current = nextIds;
    setHiddenRowIds(nextIds);
    void AsyncStorage.setItem(hiddenRowsStorageKey, JSON.stringify(nextIds))
      .then(() => triggerSuccessHaptic())
      .catch(() => {
        hiddenRowIdsRef.current = previousIds;
        setHiddenRowIds(previousIds);
      });
  }, [hiddenRowsStorageKey]);

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
    if (hiddenRowIds.includes(row.merchantOrderId ?? row.order.id)) return false;
    if (tab === "all") return true;
    if (tab === "active") return ["pending", "quoted", "confirmed", "shipped"].includes(row.status);
    if (tab === "delivered") return row.status === "delivered";
    return row.status === "cancelled" || row.status === "rejected";
  });

  if (auth.isPending || (auth.data && orders.isPending)) return <CustomerScreen>
    <AppHeader title={translate("ordersTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" size={22} color={theme.colors.foreground} />} />} />
    <UiText style={{ color: theme.colors.muted, fontSize: designTokens.typography.caption + 1, textAlign: "auto" }}>{translate("ordersSubtitle")}</UiText>
    {[0, 1, 2].map((item) => <OrderCardSkeleton key={item} />)}
  </CustomerScreen>;
  if (auth.isError || orders.isError) return <CustomerScreen refreshing={auth.isFetching || (Boolean(auth.data) && orders.isFetching)} onRefresh={() => { void auth.refetch().then((result) => { if (result.isSuccess && result.data) void refetchOrders(); }); }}>
    <AppHeader title={translate("ordersTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" size={22} color={theme.colors.foreground} />} />} />
    <UiText style={{ color: theme.colors.muted, fontSize: designTokens.typography.caption + 1, textAlign: "auto" }}>{translate("ordersSubtitle")}</UiText>
    <ErrorState title={translate("ordersLoadError")} retryLabel={translate("retry")} busy={auth.isFetching || orders.isFetching} onRetry={() => { void auth.refetch(); void refetchOrders(); }} />
  </CustomerScreen>;
  if (!auth.data) return <CustomerScreen>
    <AppHeader title={translate("ordersTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" size={22} color={theme.colors.foreground} />} />} />
    <UiText style={{ color: theme.colors.muted, fontSize: designTokens.typography.caption + 1, textAlign: "auto" }}>{translate("ordersSubtitle")}</UiText>
    <UiText style={{ color: theme.colors.muted, fontSize: designTokens.typography.caption + 1, textAlign: "auto" }}>{translate("ordersLoginHint")}</UiText>
    <PressableSurface accessibilityRole="button" accessibilityLabel={translate("login")} onPress={() => router.push("/login")} style={styles.primary}><UiText style={styles.primaryText}>{translate("login")}</UiText></PressableSurface>
  </CustomerScreen>;

  if (!hiddenRowsReady) return <CustomerScreen>
    <AppHeader title={translate("ordersTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" size={22} color={theme.colors.foreground} />} />} />
    <OrderCardSkeleton />
    <OrderCardSkeleton />
  </CustomerScreen>;

  return <CustomerScreen refreshing={auth.isFetching || (Boolean(auth.data) && orders.isFetching)} onRefresh={() => { void auth.refetch().then((result) => { if (result.isSuccess && result.data) void refetchOrders(); }); }}>
    <AppHeader title={translate("ordersTitle")} leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" size={22} color={theme.colors.foreground} />} />} />
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
    {filtered.length === 0 ? <EmptyState icon="package" title={tab === "all" ? translate("ordersEmpty") : translate("ordersEmptyTab")} hint={translate("ordersEmptyHint")} /> : null}
    {filtered.map((row) => {
      const orderCode = formatOrderCode(row.order.id);
      const tone = getOrderStatusTone(row.status);
      const total = row.status === "cancelled" || row.status === "rejected" ? 0 : row.subtotal + row.shippingFee;
      const rowKey = row.merchantOrderId ?? row.order.id;
      const orderCard = <OrderCard key={rowKey} onPress={() => {
        void queryClient.prefetchQuery({ queryKey: ["customer-order-details", row.order.id], queryFn: () => fetchCustomerOrderDetails(row.order.id), staleTime: 15_000 });
        router.push({ pathname: "/orders/[orderId]", params: { orderId: row.order.id } });
      }} accessibilityLabel={`${translate("ordersCode")} ${orderCode}، ${statusLabel(row.status)}، ${formatMarketPrice(total, row.order.currency_code)}`} style={styles.card} contentStyle={styles.cardContent}>
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
          <PriceDisplay value={formatMarketPrice(total, row.order.currency_code)} style={styles.priceDisplay} />
        </View>
      </OrderCard>;
      return isHideableOrderStatus(row.status)
        ? <SwipeToHide key={rowKey} hideLabel={translate("ordersHide")} onHide={() => hideOrderRow(row)}>{orderCard}</SwipeToHide>
        : orderCard;
    })}
  </CustomerScreen>;
}

function SwipeToHide({
  children,
  hideLabel,
  onHide
}: {
  children: ReactNode;
  hideLabel: string;
  onHide: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [revealed, setRevealed] = useState(false);
  const direction = I18nManager.isRTL ? 1 : -1;
  const revealDistance = 104;

  const animateTo = useCallback((value: number) => {
    Animated.spring(translateX, {
      toValue: value,
      useNativeDriver: true,
      speed: 22,
      bounciness: 0
    }).start();
  }, [translateX]);

  const panResponder = useMemo(() => {
    const shouldCaptureHorizontalSwipe = (_: unknown, gesture: { dx: number; dy: number }) =>
      Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2;

    return PanResponder.create({
      // Capture horizontal movement before the nested order-card Pressable.
      // Vertical movement remains available to the parent ScrollView.
      onMoveShouldSetPanResponder: shouldCaptureHorizontalSwipe,
      onMoveShouldSetPanResponderCapture: shouldCaptureHorizontalSwipe,
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        const minOffset = direction === 1 ? 0 : -revealDistance;
        const maxOffset = direction === 1 ? revealDistance : 0;
        const next = revealed
          ? Math.min(maxOffset, Math.max(minOffset, direction * revealDistance + gesture.dx))
          : direction * Math.min(revealDistance, Math.max(0, gesture.dx * direction));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldReveal = revealed
          ? direction * gesture.dx < -35
          : direction * gesture.dx > 55;
        setRevealed(shouldReveal);
        animateTo(shouldReveal ? direction * revealDistance : 0);
      },
      onPanResponderTerminate: () => animateTo(revealed ? direction * revealDistance : 0),
      onPanResponderTerminationRequest: () => false
    });
  }, [animateTo, direction, revealed, translateX]);

  return (
    <View style={{ overflow: "hidden", borderRadius: 20 }}>
      <View style={{ position: "absolute", top: 0, bottom: 0, [I18nManager.isRTL ? "left" : "right"]: 0, width: revealDistance, alignItems: "center", justifyContent: "center" }}>
        <Button label={hideLabel} onPress={onHide} variant="outline" size="sm" />
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
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
  primaryText: { color: theme.colors.accentForeground, fontWeight: designTokens.fontWeights.extrabold }
}); }

