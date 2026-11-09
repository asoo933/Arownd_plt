import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState } from "@/components/customer-ui";
import {
  Alert,
  AppHeader,
  Button,
  Caption,
  NotificationCard,
  OrderCardSkeleton,
  StatusBadge,
  Text as UiText
} from "@/components/ui";
import { countUnreadNotifications, fetchMyNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "@/lib/notifications";
import { getNotificationDestination } from "@/lib/notifications-state";
import { formatOrderCode } from "@/lib/orders-state";
import { getSupabaseClient } from "@/lib/supabase";
import { translate, type Language, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

function typeLabel(type: AppNotification["type"]): string {
  const labels: Record<AppNotification["type"], string> = {
    order: translate("notificationsOrder"),
    offer: translate("notificationsOffer"),
    reservation: translate("notificationsReservation"),
    system: translate("notificationsSystem"),
    info: translate("notificationsInfo")
  };
  return labels[type];
}

function dateLabel(value: string, language: Language): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "en-DZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function NotificationsScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState(false);
  const auth = useQuery({
    queryKey: ["notifications-auth"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().auth.getUser();
      if (error) throw error;
      return data.user;
    },
    retry: false
  });
  const notifications = useQuery({
    queryKey: ["my-notifications", auth.data?.id],
    queryFn: fetchMyNotifications,
    enabled: auth.isSuccess && Boolean(auth.data)
  });

  useEffect(() => {
    const userId = auth.data?.id;
    if (!userId) return;
    const client = getSupabaseClient();
    const channel = client.channel("native-notifications-" + userId).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "notifications",
      filter: "user_id=eq." + userId
    }, () => {
      void queryClient.invalidateQueries({ queryKey: ["my-notifications", userId] });
    }).subscribe();

    return () => { void client.removeChannel(channel); };
  }, [auth.data?.id, queryClient]);

  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      setActionError(false);
      return queryClient.invalidateQueries({ queryKey: ["my-notifications", auth.data?.id] });
    },
    onError: () => setActionError(true)
  });
  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      setActionError(false);
      return queryClient.invalidateQueries({ queryKey: ["my-notifications", auth.data?.id] });
    },
    onError: () => setActionError(true)
  });

  if (auth.isPending || (auth.data && notifications.isPending)) {
    return <CustomerScreen>
      <AppHeader title={translate("notificationsTitle")} />
      {[0, 1, 2, 3].map((item) => <OrderCardSkeleton key={item} />)}
    </CustomerScreen>;
  }
  if (auth.isError || notifications.isError) {
    return (
      <CustomerScreen>
        <AppHeader title={translate("notificationsTitle")} />
        <ErrorState
          title={translate("notificationsLoadError")}
          retryLabel={translate("retry")}
          busy={auth.isFetching || notifications.isFetching}
          onRetry={() => { void auth.refetch(); void notifications.refetch(); }}
        />
      </CustomerScreen>
    );
  }
  if (!auth.data) {
    return (
      <CustomerScreen>
        <AppHeader title={translate("notificationsTitle")} trailing={<Caption>{translate("profileLoginHint")}</Caption>} />
        <Button label={translate("login")} onPress={() => router.push("/login")} fullWidth />
      </CustomerScreen>
    );
  }

  const rows = notifications.data ?? [];
  const unreadCount = countUnreadNotifications(rows);

  return (
    <CustomerScreen>
      <AppHeader
        title={translate("notificationsTitle")}
        trailing={unreadCount > 0 ? <StatusBadge label={String(unreadCount)} tone="accent" /> : undefined}
      />
      <Caption>{translate("notificationsSubtitle")}</Caption>
      {actionError ? <Alert tone="danger" description={translate("notificationsMarkError")} /> : null}
      {unreadCount > 0 ? (
        <Button
          label={translate("notificationsMarkAll") + " · " + unreadCount}
          onPress={() => markAll.mutate()}
          loading={markAll.isPending}
          fullWidth
        />
      ) : null}
      {rows.length === 0 ? (
        <EmptyState icon="bell" title={translate("notificationsEmpty")} hint={translate("notificationsEmptyHint")} />
      ) : rows.map((item) => {
        const destination = getNotificationDestination(item);
        const orderId = typeof item.data.order_id === "string" ? item.data.order_id : null;
        const orderCode = item.type === "order" && orderId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)
          ? formatOrderCode(orderId)
          : null;
        const body = orderCode && item.body && orderId
          ? item.body.replace(new RegExp(orderId.slice(0, 8), "i"), orderCode)
          : item.body;
        return (
          <NotificationCard
            key={item.id}
            style={styles.card}
            contentStyle={styles.cardContent}
            onPress={() => {
              if (!item.read) markOne.mutate(item.id);
              if (destination) router.push(destination as never);
            }}
            accessibilityLabel={item.title}
          >
            <View style={styles.cardHeader}>
              <Caption tone="accentMuted" weight="800">{typeLabel(item.type)}</Caption>
              <Caption>{dateLabel(item.created_at, language)}</Caption>
            </View>
            <UiText weight="800">{item.title}</UiText>
            {orderCode && body === item.body ? <Caption>{translate("ordersCode")}: {orderCode}</Caption> : null}
            {body ? <UiText tone="muted">{body}</UiText> : null}
            {!item.read ? <View style={[styles.unreadDot, { backgroundColor: theme.colors.accentMuted }]} /> : null}
          </NotificationCard>
        );
      })}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    borderRadius: designTokens.radius.lg
  },
  cardContent: {
    gap: designTokens.spacing.md,
    padding: designTokens.spacing.lg
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: designTokens.spacing.sm,
    paddingBottom: designTokens.spacing.xs
  },
  unreadDot: {
    position: "absolute",
    top: designTokens.spacing.lg,
    start: designTokens.spacing.lg,
    width: 8,
    height: 8,
    borderRadius: designTokens.radius.pill
  }
});
