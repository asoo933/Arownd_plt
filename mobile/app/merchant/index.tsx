import { useQuery } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchMerchantAccess } from "@/lib/merchant";
import { translate } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";

export default function MerchantEntryScreen() {
  const theme = useAppTheme();
  const access = useQuery({
    queryKey: ["merchant-access"],
    queryFn: fetchMerchantAccess,
    retry: false
  });

  if (access.isPending) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
        <View style={styles.center}>
          <Text style={[styles.body, { color: theme.colors.muted }]}>{translate("merchantLoading")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (access.data === null && !access.isError) return <Redirect href="/login" />;

  const status = access.data?.status;
  const content = status === "merchant_ready"
    ? { title: translate("merchantStatusReadyTitle"), hint: translate("merchantStatusReadyHint"), tone: theme.colors.success }
    : status === "merchant_setup_required"
      ? { title: translate("merchantStatusSetupTitle"), hint: translate("merchantStatusSetupHint"), tone: theme.colors.warning }
      : status === "delivery_company"
        ? { title: translate("merchantStatusDeliveryTitle"), hint: translate("merchantStatusDeliveryHint"), tone: theme.colors.warning }
        : status === "inconsistent"
          ? { title: translate("merchantStatusInconsistentTitle"), hint: translate("merchantStatusInconsistentHint"), tone: theme.colors.danger }
          : { title: translate("merchantStatusPersonalTitle"), hint: translate("merchantStatusPersonalHint"), tone: theme.colors.muted };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={translate("back")}
          onPress={() => router.back()}
          style={styles.back}
        >
          <Text style={[styles.backText, { color: theme.colors.accentMuted }]}>{translate("back")}</Text>
        </Pressable>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.eyebrow, { color: theme.colors.accentMuted }]}>{translate("businessTitle")}</Text>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>{translate("merchantEntryTitle")}</Text>
          <Text style={[styles.body, { color: theme.colors.muted }]}>{translate("merchantEntrySubtitle")}</Text>
          {access.isError ? (
            <View style={[styles.notice, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerBorder }]}>
              <Text style={[styles.noticeTitle, { color: theme.colors.danger }]}>{translate("merchantLoadError")}</Text>
              <Pressable accessibilityRole="button" onPress={() => void access.refetch()} style={styles.retry}>
                <Text style={[styles.retryText, { color: theme.colors.accentMuted }]}>{translate("merchantRetry")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.notice, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
              <Text style={[styles.statusTitle, { color: content.tone }]}>{content.title}</Text>
              <Text style={[styles.body, { color: theme.colors.muted }]}>{content.hint}</Text>
              {access.data?.store ? (
                <Text style={[styles.storeName, { color: theme.colors.foreground }]}>{access.data.store.name}</Text>
              ) : null}
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/profile")}
            style={[styles.action, { backgroundColor: theme.colors.accent }]}
          >
            <Text style={[styles.actionText, { color: theme.colors.accentForeground }]}>{translate("merchantBackToProfile")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, padding: 20, gap: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  back: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 4 },
  backText: { fontSize: 14, fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: 22, padding: 20, gap: 14 },
  eyebrow: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  title: { fontSize: 23, fontWeight: "900", textAlign: "right" },
  body: { fontSize: 13, lineHeight: 21, textAlign: "right" },
  notice: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 8 },
  noticeTitle: { fontSize: 15, fontWeight: "900", textAlign: "right" },
  statusTitle: { fontSize: 16, fontWeight: "900", textAlign: "right" },
  storeName: { fontSize: 14, fontWeight: "800", textAlign: "right" },
  retry: { minHeight: 40, justifyContent: "center", alignSelf: "flex-start" },
  retryText: { fontSize: 13, fontWeight: "800" },
  action: { minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  actionText: { fontSize: 14, fontWeight: "900" }
});
