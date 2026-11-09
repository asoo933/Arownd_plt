import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AuthLayout, ActionButton } from "@/components/auth-ui";
import { Icon, PressableSurface, Text as UiText } from "@/components/ui";
import { translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

export default function AccountTypeScreen() {
  useLanguage();
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
          style={[
            styles.option,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Icon
              name="user"
              color={theme.colors.foreground}
              size={designTokens.dimensions.iconSize.md}
            />
          </View>
          <View style={styles.copy}>
            <UiText weight={designTokens.fontWeights.extrabold} style={styles.optionTitle}>
              {translate("personalTitle")}
            </UiText>
            <UiText tone="muted" style={styles.optionDescription}>
              {translate("personalDescription")}
            </UiText>
          </View>
          <Icon
            name="chevron-left"
            color={theme.colors.muted}
            size={designTokens.dimensions.iconSize.md}
          />
        </PressableSurface>

        <PressableSurface
          accessibilityRole="button"
          accessibilityLabel={translate("businessTitle")}
          onPress={() => router.push("/signup-business")}
          style={[
            styles.option,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Icon
              name="store"
              color={theme.colors.foreground}
              size={designTokens.dimensions.iconSize.md}
            />
          </View>
          <View style={styles.copy}>
            <UiText weight={designTokens.fontWeights.extrabold} style={styles.optionTitle}>
              {translate("businessTitle")}
            </UiText>
            <UiText tone="muted" style={styles.optionDescription}>
              {translate("businessDescription")}
            </UiText>
          </View>
          <Icon
            name="chevron-left"
            color={theme.colors.muted}
            size={designTokens.dimensions.iconSize.md}
          />
        </PressableSurface>

        <ActionButton
          label={translate("backToLogin")}
          onPress={() => router.replace("/login")}
        />
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  options: { gap: designTokens.spacing.md + designTokens.spacing.xs / 2 },
  option: {
    minHeight: designTokens.dimensions.controlHeight.lg * 2 + designTokens.spacing.xs,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    padding: designTokens.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.md
  },
  iconCircle: {
    width: designTokens.dimensions.controlHeight.lg,
    height: designTokens.dimensions.controlHeight.lg,
    borderRadius: designTokens.radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { flex: 1, gap: designTokens.spacing.xs },
  optionTitle: {
    fontSize: designTokens.typography.subtitle - 1,
    textAlign: "auto"
  },
  optionDescription: {
    fontSize: designTokens.typography.caption + 1,
    lineHeight: designTokens.typography.body + designTokens.spacing.sm / 2,
    textAlign: "auto"
  }
});
