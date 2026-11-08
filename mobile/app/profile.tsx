import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { designTokens } from "@/lib/theme";
import { CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import {
  AppHeader,
  Button,
  Caption,
  Card,
  Icon,
  IconButton,
  IdentityRow,
  StatCard
} from "@/components/ui";
import { fetchMyDeliveryProfile } from "@/lib/delivery-profile";
import { getFavorites } from "@/lib/favorites";
import { translate } from "@/lib/i18n";
import { fetchMyOrders } from "@/lib/orders";
import { getProfileDisplayName } from "@/lib/profile-state";
import { fetchMyReviews } from "@/lib/reviews";
import { getSupabaseClient } from "@/lib/supabase";

export default function ProfileScreen() {
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
        <CustomerHeading title={translate("profileTitle")} />
        <ErrorState
          title={translate("profileLoadError")}
          retryLabel={translate("retry")}
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
          <IconButton
            icon={<Icon name="settings" size={20} />}
            accessibilityLabel={translate("profileSettings")}
            onPress={() => router.push("/settings")}
          />
        }
      />

      {profile.isPending ? (
        <LoadingState label={translate("stateLoading")} />
      ) : (
        <>
          <Card contentStyle={styles.identityCard}>
            <IdentityRow
              name={displayName}
              subtitle={user.data.email}
              avatarSize={64}
              style={styles.identityRow}
            />
            {profile.data?.phone ? (
              <View style={styles.phoneRow}>
                <Caption>{profile.data.phone}</Caption>
                <Icon name="phone" size={16} />
              </View>
            ) : null}
          </Card>

          <View style={styles.stats}>
            <Card style={styles.statCardOuter} contentStyle={styles.statCard}>
              <View style={styles.statHeader}>
                <Icon name="package" size={19} />
                <StatCard
                  label={translate("profileOrders")}
                  value={orders.isPending ? "…" : orders.isError ? "—" : String(orders.data?.length ?? 0)}
                  style={styles.stat}
                />
              </View>
            </Card>
            <Card style={styles.statCardOuter} contentStyle={styles.statCard}>
              <View style={styles.statHeader}>
                <Icon name="heart" size={19} />
                <StatCard
                  label={translate("profileFavorites")}
                  value={favorites.isPending ? "…" : favorites.isError ? "—" : String(favoriteCount)}
                  style={styles.stat}
                />
              </View>
            </Card>
            <Card style={styles.statCardOuter} contentStyle={styles.statCard}>
              <View style={styles.statHeader}>
                <Icon name="star" size={19} />
                <StatCard
                  label={translate("myReviewsTitle")}
                  value={reviews.isPending ? "…" : reviews.isError ? "—" : String(reviews.data?.length ?? 0)}
                  style={styles.stat}
                />
              </View>
            </Card>
          </View>

          {orders.isError || favorites.isError || reviews.isError ? (
            <ErrorState
              title={translate("profileStatsLoadError")}
              retryLabel={translate("retry")}
              onRetry={() => { void orders.refetch(); void favorites.refetch(); void reviews.refetch(); }}
            />
          ) : null}
        </>
      )}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  identityCard: { padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
  identityRow: { flexDirection: "row-reverse" },
  phoneRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: designTokens.spacing.sm,
    paddingTop: designTokens.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128, 128, 128, 0.25)"
  },
  stats: { flexDirection: "row-reverse", gap: designTokens.spacing.sm },
  statCardOuter: { flex: 1, minWidth: 0 },
  statCard: { padding: designTokens.spacing.md },
  statHeader: { flexDirection: "row-reverse", alignItems: "flex-start", gap: designTokens.spacing.sm },
  stat: { flex: 1, minWidth: 0, padding: 0, backgroundColor: "transparent" },
});
