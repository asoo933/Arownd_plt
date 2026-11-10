import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import {
  AppHeader,
  Button,
  Caption,
  Card,
  Icon,
  IconButton,
  IdentityRow,
  PressableSurface,
  StatCard
} from "@/components/ui";
import { fetchMyDeliveryProfile } from "@/lib/delivery-profile";
import { getFavorites } from "@/lib/favorites";
import { translate, useLanguage } from "@/lib/i18n";
import { fetchMyOrders } from "@/lib/orders";
import { getProfileDisplayName } from "@/lib/profile-state";
import { fetchMyReviews } from "@/lib/reviews";
import { getSupabaseClient } from "@/lib/supabase";

export default function ProfileScreen() {
  useLanguage();
  const theme = useAppTheme();
  const user = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data, error } = await getSupabaseClient().auth.getUser();
      if (error) throw error;
      return data.user;
    },
    retry: false
  });
  const profile = useQuery({
    queryKey: ["my-delivery-profile"],
    queryFn: fetchMyDeliveryProfile,
    enabled: Boolean(user.data)
  });
  const orders = useQuery({
    queryKey: ["my-orders"],
    queryFn: fetchMyOrders,
    enabled: Boolean(user.data)
  });
  const favorites = useQuery({
    queryKey: ["local-favorites"],
    queryFn: getFavorites,
    enabled: Boolean(user.data)
  });
  const reviews = useQuery({
    queryKey: ["my-reviews"],
    queryFn: fetchMyReviews,
    enabled: Boolean(user.data),
    retry: false
  });

  if (user.isPending) {
    return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }
  if (user.isError) {
    return (
      <CustomerScreen>
        <ErrorState
          title={translate("profileLoadError")}
          retryLabel={translate("retry")}
          busy={user.isFetching}
          onRetry={() => void user.refetch()}
        />
      </CustomerScreen>
    );
  }
  if (!user.data) {
    return (
      <CustomerScreen>
        <Caption>{translate("profileLoginHint")}</Caption>
        <Button label={translate("profileLogin")} onPress={() => router.push("/login")} fullWidth />
      </CustomerScreen>
    );
  }
  if (profile.isError) {
    return (
      <CustomerScreen>
        <ErrorState
          title={translate("profileLoadError")}
          retryLabel={translate("retry")}
          busy={profile.isFetching}
          onRetry={() => void profile.refetch()}
        />
      </CustomerScreen>
    );
  }

  const displayName = getProfileDisplayName(profile.data?.full_name, user.data.email);
  const favoriteCount = (favorites.data?.products.length ?? 0) + (favorites.data?.stores.length ?? 0);

  return (
    <CustomerScreen>
      <AppHeader
        title=""
        leading={
          <View style={styles.headerActions}>
            <IconButton
              icon={<Icon name="settings" size={20} />}
              accessibilityLabel={translate("profileSettings")}
              onPress={() => router.push("/settings")}
            />
            <IconButton
              icon={<Icon name="bell" size={20} />}
              accessibilityLabel={translate("notificationsTitle")}
              onPress={() => router.push("/notifications")}
            />
          </View>
        }
      />

      {profile.isPending ? (
        <LoadingState label={translate("stateLoading")} />
      ) : (
        <>
          <Card contentStyle={styles.identityCard}>
            <IdentityRow
              name={displayName}
              {...(user.data.email ? { subtitle: user.data.email } : {})}
              avatarSize={64}
              style={styles.identityRow}
            />
            {profile.data?.phone ? (
              <View style={[styles.phoneRow, { borderTopColor: theme.colors.border }]}>
                <Caption>{profile.data.phone}</Caption>
                <Icon name="phone" size={16} />
              </View>
            ) : null}
          </Card>

          <View style={styles.stats}>
            <PressableSurface
              accessibilityRole="button"
              accessibilityLabel={translate("profileOrders")}
              onPress={() => router.push("/orders")}
              style={styles.statCardOuter}
            >
              <Card contentStyle={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: theme.mode === "dark" ? theme.colors.surfaceSecondary : theme.colors.surfaceMuted }]}>
                  <Icon name="package" size={designTokens.dimensions.iconSize.sm} />
                </View>
                <StatCard
                  label={translate("profileOrders")}
                  value={orders.isPending ? "…" : orders.isError ? "—" : String(orders.data?.length ?? 0)}
                  style={styles.stat}
                />
              </View>
              </Card>
            </PressableSurface>
            <PressableSurface
              accessibilityRole="button"
              accessibilityLabel={translate("profileFavorites")}
              onPress={() => router.push("/favorites")}
              style={styles.statCardOuter}
            >
              <Card contentStyle={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: theme.mode === "dark" ? theme.colors.surfaceSecondary : theme.colors.surfaceMuted }]}>
                  <Icon name="heart" size={designTokens.dimensions.iconSize.sm} />
                </View>
                <StatCard
                  label={translate("profileFavorites")}
                  value={favorites.isPending ? "…" : favorites.isError ? "—" : String(favoriteCount)}
                  style={styles.stat}
                />
              </View>
              </Card>
            </PressableSurface>
            <PressableSurface
              accessibilityRole="button"
              accessibilityLabel={translate("myReviewsTitle")}
              onPress={() => router.push("/my-reviews")}
              style={styles.statCardOuter}
            >
              <Card contentStyle={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: theme.mode === "dark" ? theme.colors.surfaceSecondary : theme.colors.surfaceMuted }]}>
                  <Icon name="star" size={designTokens.dimensions.iconSize.sm} />
                </View>
                <StatCard
                  label={translate("myReviewsTitle")}
                  value={reviews.isPending ? "…" : reviews.isError ? "—" : String(reviews.data?.length ?? 0)}
                  style={styles.stat}
                />
              </View>
              </Card>
            </PressableSurface>
          </View>

          {orders.isError || favorites.isError || reviews.isError ? (
            <ErrorState
              title={translate("profileStatsLoadError")}
              retryLabel={translate("retry")}
              busy={orders.isFetching || favorites.isFetching || reviews.isFetching}
              onRetry={() => { void orders.refetch(); void favorites.refetch(); void reviews.refetch(); }}
            />
          ) : null}
        </>
      )}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm },
  identityCard: { padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
  identityRow: { flexDirection: "row" },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.sm,
    paddingTop: designTokens.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  stats: { flexDirection: "row", gap: designTokens.spacing.sm },
  statCardOuter: { flex: 1, minWidth: 0 },
  statCard: { padding: designTokens.spacing.md },
  statHeader: { flexDirection: "column", alignItems: "flex-start", gap: designTokens.spacing.sm },
  statIcon: { width: 34, height: 34, borderRadius: designTokens.radius.md, alignItems: "center", justifyContent: "center" },
  stat: { width: "100%", minWidth: 0, padding: 0, backgroundColor: "transparent" },
});
