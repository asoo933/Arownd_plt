import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { CustomerHeading, CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import {
  AppHeader,
  Button,
  Caption,
  Card,
  Icon,
  IdentityRow,
  ListItem,
  StatCard,
  Text
} from "@/components/ui";
import { fetchMyDeliveryProfile } from "@/lib/delivery-profile";
import { getFavorites } from "@/lib/favorites";
import { translate } from "@/lib/i18n";
import { fetchMyOrders } from "@/lib/orders";
import { getProfileDisplayName } from "@/lib/profile-state";
import { getSupabaseClient } from "@/lib/supabase";

export default function ProfileScreen() {
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

  if (user.isPending) {
    return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }
  if (user.isError) {
    return (
      <CustomerScreen>
        <CustomerHeading title={translate("profileTitle")} />
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
        <CustomerHeading title={translate("profileTitle")} subtitle={translate("profileLoginHint")} />
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
      <AppHeader title={translate("profileTitle")} />
      <Caption>{translate("profileSubtitle")}</Caption>

      {profile.isPending ? (
        <LoadingState label={translate("stateLoading")} />
      ) : (
        <>
          <Card>
            <IdentityRow
              name={displayName}
              subtitle={[user.data.email, profile.data?.phone].filter(Boolean).join(" · ")}
              avatarSize={58}
            />
          </Card>

          <View style={styles.stats}>
            <StatCard
              label={translate("profileOrders")}
              value={orders.isPending ? "…" : orders.isError ? "—" : String(orders.data?.length ?? 0)}
              style={styles.stat}
            />
            <StatCard
              label={translate("profileFavorites")}
              value={favorites.isPending ? "…" : favorites.isError ? "—" : String(favoriteCount)}
              style={styles.stat}
            />
          </View>

          {orders.isError || favorites.isError ? (
            <ErrorState
              title={translate("profileStatsLoadError")}
              retryLabel={translate("retry")}
              onRetry={() => { void orders.refetch(); void favorites.refetch(); }}
            />
          ) : null}

          <Card contentStyle={styles.menuContent}>
            <ProfileMenuItem
              label={translate("profileEditDetails")}
              hint={translate("profileEditDetailsHint")}
              onPress={() => router.push("/delivery-profile")}
            />
            <ProfileMenuItem
              label={translate("profileAddresses")}
              hint={translate("profileAddressesHint")}
              onPress={() => router.push("/addresses")}
            />
            <ProfileMenuItem
              label={translate("profileOrders")}
              hint={translate("profileOrdersHint")}
              onPress={() => router.push("/orders")}
            />
            <ProfileMenuItem
              label={translate("profileFavorites")}
              hint={translate("profileFavoritesHint")}
              onPress={() => router.push("/favorites")}
            />
            <ProfileMenuItem
              label={translate("profileNotifications")}
              hint={translate("profileNotificationsHint")}
              onPress={() => router.push("/notifications")}
            />
            <ProfileMenuItem
              label={translate("myReviewsTitle")}
              hint={translate("myReviewsSubtitle")}
              onPress={() => router.push("/my-reviews")}
            />
            <ProfileMenuItem
              label={translate("profileSettings")}
              hint={translate("profileSettingsHint")}
              onPress={() => router.push("/settings")}
            />
            <ProfileMenuItem
              label={translate("profileBusiness")}
              hint={translate("profileBusinessHint")}
              onPress={() => router.push("/merchant")}
            />
          </Card>
        </>
      )}
    </CustomerScreen>
  );
}

function ProfileMenuItem({ label, hint, onPress }: {
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <ListItem
      onPress={onPress}
      accessibilityLabel={label}
      leading={<Icon name="chevron-left" size={20} />}
    >
      <View style={styles.menuCopy}>
        <Text weight="800">{label}</Text>
        <Caption>{hint}</Caption>
      </View>
    </ListItem>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: "row-reverse", gap: 10 },
  stat: { flex: 1 },
  menuContent: { gap: 0, padding: 0 },
  menuCopy: { flex: 1, alignItems: "flex-end", gap: 4 }
});
