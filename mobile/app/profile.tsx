import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import {
  AppHeader,
  Button,
  Caption,
  Card,
  Text as UiText,
  Icon,
  IconButton,
  IdentityRow,
  PressableSurface,
  StatCard
} from "@/components/ui";
import { fetchMyDeliveryProfile } from "@/lib/delivery-profile";
import { removeMyProfileAvatar, uploadMyProfileAvatar } from "@/lib/profile-avatar";
import { getFavorites } from "@/lib/favorites";
import { translate, useLanguage } from "@/lib/i18n";
import { fetchMyOrders } from "@/lib/orders";
import { getProfileDisplayName } from "@/lib/profile-state";
import { fetchMyReviews } from "@/lib/reviews";
import { getSupabaseClient } from "@/lib/supabase";

export default function ProfileScreen() {
  useLanguage();
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const [avatarPickerError, setAvatarPickerError] = useState(false);
  const uploadAvatar = useMutation({
    mutationFn: uploadMyProfileAvatar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-delivery-profile"] })
  });
  const removeAvatar = useMutation({
    mutationFn: removeMyProfileAvatar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-delivery-profile"] })
  });
  const chooseAvatar = async () => {
    setAvatarPickerError(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setAvatarPickerError(true);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85
      });
      if (!result.canceled && result.assets[0]) uploadAvatar.mutate(result.assets[0]);
    } catch {
      setAvatarPickerError(true);
    }
  };
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
    return <CustomerScreen><AppHeader title={translate("profileTitle")} /><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }
  if (user.isError) {
    return (
      <CustomerScreen refreshing={user.isFetching} onRefresh={() => { void user.refetch(); }}>
        <AppHeader title={translate("profileTitle")} />
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
        <AppHeader title={translate("profileTitle")} />
        <Caption>{translate("profileSubtitle")}</Caption>
        <Caption>{translate("profileLoginHint")}</Caption>
        <Button label={translate("profileLogin")} onPress={() => router.push("/login")} fullWidth />
      </CustomerScreen>
    );
  }
  if (profile.isError) {
    return (
      <CustomerScreen refreshing={profile.isFetching} onRefresh={() => { void profile.refetch(); }}>
        <AppHeader title={translate("profileTitle")} />
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
    <CustomerScreen
      refreshing={user.isFetching || (Boolean(user.data) && (profile.isFetching || orders.isFetching || favorites.isFetching || reviews.isFetching))}
      onRefresh={() => {
        void user.refetch().then((result) => {
          if (result.isSuccess && result.data) void Promise.all([profile.refetch(), orders.refetch(), favorites.refetch(), reviews.refetch()]);
        });
      }}
    >
      <AppHeader
        title={translate("profileTitle")}
        leading={
          <View style={styles.headerActions}>
            <IconButton
              icon={<Icon name="settings" size={20} />}
              accessibilityLabel={translate("profileSettings")}
              onPress={() => router.push("/settings")}
            />
          </View>
        }
      />
      <Caption>{translate("profileSubtitle")}</Caption>

      {profile.isPending ? (
        <LoadingState label={translate("stateLoading")} />
      ) : (
        <>
          <Card contentStyle={styles.identityCard}>
            <IdentityRow
              name={displayName}
              {...(user.data.email ? { subtitle: user.data.email } : {})}
              {...(profile.data?.avatar_url ? { imageUri: profile.data.avatar_url } : {})}
              avatarSize={64}
              style={styles.identityRow}
            />
            <Button
              label={translate("profileAvatarChange")}
              onPress={() => { void chooseAvatar(); }}
              loading={uploadAvatar.isPending}
              disabled={removeAvatar.isPending}
              fullWidth
            />
            {profile.data?.avatar_url ? (
              <Button
                label={translate("profileAvatarRemove")}
                variant="outline"
                onPress={() => removeAvatar.mutate()}
                loading={removeAvatar.isPending}
                disabled={uploadAvatar.isPending}
                fullWidth
              />
            ) : null}
            {avatarPickerError || uploadAvatar.isError || removeAvatar.isError ? (
              <Caption>{translate("profileAvatarError")}</Caption>
            ) : null}
            {profile.data?.phone ? (
              <View style={[styles.phoneRow, { borderTopColor: theme.colors.border }]}>
                <Caption>{profile.data.phone}</Caption>
                <Icon name="phone" size={16} />
              </View>
            ) : null}
          </Card>

          <View style={styles.accountLinks}>
            <PressableSurface accessibilityRole="button" accessibilityLabel={translate("profileEditDetails")} onPress={() => router.push("/delivery-profile")} style={styles.accountLinkOuter}>
              <Card contentStyle={styles.accountLinkCard}>
                <View style={[styles.accountLinkIcon, { backgroundColor: theme.colors.surfaceSecondary }]}><Icon name="user" size={20} color={theme.colors.accent} /></View>
                <View style={styles.accountLinkText}>
                  <UiText weight="700">{translate("profileEditDetails")}</UiText>
                  <Caption>{translate("profileEditDetailsHint")}</Caption>
                </View>
                <Icon name="chevron-left" size={18} color={theme.colors.subtle} />
              </Card>
            </PressableSurface>
            <PressableSurface accessibilityRole="button" accessibilityLabel={translate("profileAddresses")} onPress={() => router.push("/addresses")} style={styles.accountLinkOuter}>
              <Card contentStyle={styles.accountLinkCard}>
                <View style={[styles.accountLinkIcon, { backgroundColor: theme.colors.surfaceSecondary }]}><Icon name="map-pin" size={20} color={theme.colors.accent} /></View>
                <View style={styles.accountLinkText}>
                  <UiText weight="700">{translate("profileAddresses")}</UiText>
                  <Caption>{translate("profileAddressesHint")}</Caption>
                </View>
                <Icon name="chevron-left" size={18} color={theme.colors.subtle} />
              </Card>
            </PressableSurface>
          </View>

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
  accountLinks: { gap: designTokens.spacing.sm },
  accountLinkOuter: { width: "100%" },
  accountLinkCard: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.md, padding: designTokens.spacing.md },
  accountLinkIcon: { width: 42, height: 42, borderRadius: designTokens.radius.md, alignItems: "center", justifyContent: "center" },
  accountLinkText: { flex: 1, minWidth: 0, gap: 2 },
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
