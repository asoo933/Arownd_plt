import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AuthLayout, ActionButton } from "@/components/auth-ui";
import { Icon, PressableSurface, Text as UiText } from "@/components/ui";
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
          accessibilityLabel={translate("personalTitle")}
          onPress={() => router.push("/signup-personal")}
          style={[styles.option, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Icon name="user" color={theme.colors.foreground} size={23} />
          </View>
          <View style={styles.copy}>
            <UiText weight="800" style={styles.optionTitle}>{translate("personalTitle")}</UiText>
            <UiText tone="muted" style={styles.optionDescription}>{translate("personalDescription")}</UiText>
          </View>
          <Icon name="chevron-left" color={theme.colors.muted} size={22} />
        </PressableSurface>

        <PressableSurface
          accessibilityRole="button"
          accessibilityLabel={translate("businessTitle")}
          onPress={() => router.push("/signup-business")}
          style={[styles.option, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Icon name="store" color={theme.colors.foreground} size={23} />
          </View>
          <View style={styles.copy}>
            <UiText weight="800" style={styles.optionTitle}>{translate("businessTitle")}</UiText>
            <UiText tone="muted" style={styles.optionDescription}>{translate("businessDescription")}</UiText>
          </View>
          <Icon name="chevron-left" color={theme.colors.muted} size={22} />
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
  copy: { flex: 1, gap: designTokens.spacing.xs + 1 },
  optionTitle: { fontSize: 15, textAlign: "right" },
  optionDescription: { fontSize: 12, lineHeight: 20, textAlign: "right" }
});
