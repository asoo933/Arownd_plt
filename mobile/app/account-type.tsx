import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AuthLayout, ActionButton } from "@/components/auth-ui";
import { PressableSurface } from "@/components/ui";
import { translate } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

export default function AccountTypeScreen() {
  const theme = useAppTheme();
  return (
    <AuthLayout
      title={translate("chooseAccountTitle")}
      subtitle={translate("chooseAccountSubtitle")}
      showBack
    >
      <View style={styles.options}>
        <PressableSurface
          accessibilityRole="button"
          onPress={() => router.push("/signup-personal")}
          style={[styles.option, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.icon, { color: theme.colors.foreground }]}>◎</Text>
          </View>
          <View style={styles.copy}>
            <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>{translate("personalTitle")}</Text>
            <Text style={[styles.optionDescription, { color: theme.colors.muted }]}>{translate("personalDescription")}</Text>
          </View>
          <Text style={[styles.arrow, { color: theme.colors.muted }]}>‹</Text>
        </PressableSurface>
        <PressableSurface
          accessibilityRole="button"
          onPress={() => router.push("/signup-business")}
          style={[styles.option, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.icon, { color: theme.colors.foreground }]}>▦</Text>
          </View>
          <View style={styles.copy}>
            <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>{translate("businessTitle")}</Text>
            <Text style={[styles.optionDescription, { color: theme.colors.muted }]}>{translate("businessDescription")}</Text>
          </View>
          <Text style={[styles.arrow, { color: theme.colors.muted }]}>‹</Text>
        </PressableSurface>
        <ActionButton label={translate("backToLogin")} onPress={() => router.replace("/login")} />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  options: { gap: designTokens.spacing.md + 2 },
  option: {
    minHeight: 112,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    padding: designTokens.spacing.lg,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: designTokens.spacing.md
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: designTokens.radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  icon: { fontSize: 25, fontWeight: "800" },
  copy: { flex: 1, gap: designTokens.spacing.xs + 1 },
  optionTitle: { fontSize: 15, fontWeight: "800", textAlign: "right" },
  optionDescription: { fontSize: 12, lineHeight: 20, textAlign: "right" },
  arrow: { fontSize: 25 }
});
