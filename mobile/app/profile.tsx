import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { CustomerHeading, CustomerScreen, ErrorState, LoadingState } from "@/components/customer-ui";
import { fetchMyDeliveryProfile } from "@/lib/delivery-profile";
import { getFavorites } from "@/lib/favorites";
import { translate } from "@/lib/i18n";
import { fetchMyOrders } from "@/lib/orders";
import { getProfileDisplayName, getProfileInitial } from "@/lib/profile-state";
import { getSupabaseClient } from "@/lib/supabase";

export default function ProfileScreen() {
  const dark = useColorScheme() === "dark";
  const colors = {
    text: dark ? "#F5F5F5" : "#0A0A0A",
    muted: "#737373",
    card: dark ? "#171717" : "#FFFFFF",
    border: dark ? "#333333" : "#E5E5E5"
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

  if (user.isPending) {
    return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }
  if (!user.data) {
    return (
      <CustomerScreen>
        <CustomerHeading title={translate("profileTitle")} subtitle={translate("profileLoginHint")} />
        <PrimaryAction label={translate("profileLogin")} onPress={() => router.push("/login")} />
      </CustomerScreen>
    );
  }
  if (profile.isError || orders.isError || favorites.isError) {
    return (
      <CustomerScreen>
        <CustomerHeading title={translate("profileTitle")} />
        <ErrorState
          title={translate("profileLoadError")}
          retryLabel={translate("retry")}
          onRetry={() => { void profile.refetch(); void orders.refetch(); void favorites.refetch(); }}
        />
      </CustomerScreen>
    );
  }

  const displayName = getProfileDisplayName(profile.data?.full_name, user.data.email);
  const favoriteCount = (favorites.data?.products.length ?? 0) + (favorites.data?.stores.length ?? 0);

  return (
    <CustomerScreen>
      <CustomerHeading title={translate("profileTitle")} subtitle={translate("profileSubtitle")} />
      {(profile.isPending || orders.isPending || favorites.isPending) ? (
        <LoadingState label={translate("stateLoading")} />
      ) : (
        <>
          <View style={[styles.identity, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{getProfileInitial(displayName)}</Text></View>
            <View style={styles.identityCopy}>
              <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>{displayName}</Text>
              <Text numberOfLines={1} style={[styles.email, { color: colors.muted }]}>{user.data.email ?? ""}</Text>
              {profile.data?.phone ? <Text style={[styles.meta, { color: colors.muted }]}>{profile.data.phone}</Text> : null}
            </View>
          </View>
          <View style={styles.stats}>
            <StatCard label={translate("profileOrders")} value={String(orders.data?.length ?? 0)} colors={colors} />
            <StatCard label={translate("profileFavorites")} value={String(favoriteCount)} colors={colors} />
          </View>
          <View style={styles.menu}>
            <MenuAction label={translate("profileEditDetails")} hint={translate("profileEditDetailsHint")} onPress={() => router.push("/delivery-profile")} colors={colors} />
            <MenuAction label={translate("profileOrders")} hint={translate("profileOrdersHint")} onPress={() => router.push("/orders")} colors={colors} />
            <MenuAction label={translate("profileFavorites")} hint={translate("profileFavoritesHint")} onPress={() => router.push("/favorites")} colors={colors} />
            <MenuAction label={translate("profileSettings")} hint={translate("profileSettingsHint")} onPress={() => router.push("/settings")} colors={colors} />
          </View>
        </>
      )}
    </CustomerScreen>
  );
}

function PrimaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.primary}><Text style={styles.primaryText}>{label}</Text></Pressable>;
}

function StatCard({ label, value, colors }: { label: string; value: string; colors: { text: string; muted: string; card: string; border: string } }) {
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function MenuAction({ label, hint, onPress, colors }: {
  label: string;
  hint: string;
  onPress: () => void;
  colors: { text: string; muted: string; card: string; border: string };
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.menuAction, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.menuCopy}>
        <Text style={[styles.menuTitle, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.menuHint, { color: colors.muted }]}>{hint}</Text>
      </View>
      <Text style={styles.arrow}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  identity: { minHeight: 104, borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: "row-reverse", alignItems: "center", gap: 13 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#C6F135", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#0A0A0A", fontSize: 23, fontWeight: "900" },
  identityCopy: { flex: 1, alignItems: "flex-end", gap: 4 },
  name: { fontSize: 16, fontWeight: "900" },
  email: { fontSize: 12 },
  meta: { fontSize: 11 },
  stats: { flexDirection: "row-reverse", gap: 10 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 17, padding: 15, alignItems: "flex-end", gap: 5 },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: { fontSize: 12, fontWeight: "700" },
  menu: { gap: 9 },
  menuAction: { minHeight: 72, borderWidth: 1, borderRadius: 17, paddingHorizontal: 15, paddingVertical: 12, flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  menuCopy: { flex: 1, alignItems: "flex-end", gap: 4 },
  menuTitle: { fontSize: 14, fontWeight: "800" },
  menuHint: { fontSize: 11, textAlign: "right" },
  arrow: { color: "#7A7A7A", fontSize: 24 },
  primary: { minHeight: 48, borderRadius: 14, backgroundColor: "#C6F135", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#0A0A0A", fontWeight: "900" }
});
