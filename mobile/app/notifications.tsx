import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerHeading, CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import {
  AppHeader,
  Button,
  Caption,
  NotificationCard,
  StatusBadge,
  Text as UiText
} from "@/components/ui";
import { countUnreadNotifications, fetchMyNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "@/lib/notifications";
import { getNotificationDestination } from "@/lib/notifications-state";
import { getSupabaseClient } from "@/lib/supabase";
import { translate } from "@/lib/i18n";

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

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-DZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function NotificationsScreen() {
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
    return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }
  if (auth.isError || notifications.isError) {
    return (
      <CustomerScreen>
        <CustomerHeading title={translate("notificationsTitle")} />
        <ErrorState
          title={translate("notificationsLoadError")}
          retryLabel={translate("retry")}
          onRetry={() => { void auth.refetch(); void notifications.refetch(); }}
        />
      </CustomerScreen>
    );
  }
  if (!auth.data) {
    return (
      <CustomerScreen>
        <CustomerHeading title={translate("notificationsTitle")} subtitle={translate("profileLoginHint")} />
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
      {actionError ? <UiText tone="danger">{translate("notificationsMarkError")}</UiText> : null}
      {unreadCount > 0 ? (
        <Button
          label={translate("notificationsMarkAll") + " · " + unreadCount}
          onPress={() => markAll.mutate()}
          loading={markAll.isPending}
          fullWidth
        />
      ) : null}
      {rows.length === 0 ? (
        <EmptyState title={translate("notificationsEmpty")} hint={translate("notificationsEmptyHint")} />
      ) : rows.map((item) => {
        const destination = getNotificationDestination(item);
        return (
          <View key={item.id} style={styles.cardWrapper}>
            <NotificationCard
              onPress={() => {
                if (!item.read) markOne.mutate(item.id);
                if (destination) router.push(destination as never);
              }}
              accessibilityLabel={item.title}
              style={{ opacity: item.read ? 0.78 : 1 }}
              contentStyle={styles.cardContent}
            >
              <View style={styles.cardHeader}>
                <Caption tone="accentMuted" weight="800">{typeLabel(item.type)}</Caption>
                <Caption>{dateLabel(item.created_at)}</Caption>
              </View>
              <UiText weight="800">{item.title}</UiText>
              {item.body ? <UiText tone="muted">{item.body}</UiText> : null}
              {!item.read ? (
                <View style={styles.unreadDot} />
              ) : null}
            </NotificationCard>
          </View>
        );
      })}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  cardWrapper: { position: "relative" },
  cardContent: { gap: 8, padding: 14 },
  cardHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  unreadDot: { position: "absolute", top: 12, start: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: "#C6F135" }
});
