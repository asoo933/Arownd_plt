import Constants from "expo-constants";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import Logo from "@/components/logo";
import { CustomerScreen } from "@/components/customer-ui";
import { AppHeader, Caption, Heading, Icon, PressableSurface, Text as UiText } from "@/components/ui";
import { designTokens, useAppTheme } from "@/lib/theme";
import { translate } from "@/lib/i18n";

export default function AboutScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const version = Constants.expoConfig?.version ?? "—";

  return (
    <CustomerScreen showNavigation={false}>
      <PressableSurface
        accessibilityRole="button"
        accessibilityLabel={translate("back")}
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Icon name="chevron-right" size={22} color={theme.colors.foreground} />
      </PressableSurface>

      <AppHeader title={translate("aboutTitle")} />

      <View style={styles.brandBlock}>
        <Logo color={theme.colors.foreground} width={220} />
        <View style={styles.brandAccent} />
        <Heading level={2}>{translate("aboutTagline")}</Heading>
      </View>

      <View style={styles.descriptionBlock}>
        <Heading level={3}>{translate("settingsAboutTitle")}</Heading>
        <UiText style={styles.description}>{translate("aboutDescription")}</UiText>
      </View>

      <View style={styles.versionRow}>
        <Caption>{translate("aboutVersion")}</Caption>
        <UiText weight="700">{version}</UiText>
      </View>

      <View style={styles.footer}>
        <UiText weight="700">Arownd</UiText>
        <Caption>© Arownd · {translate("aboutCopyright")}</Caption>
      </View>
    </CustomerScreen>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    backButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
      borderRadius: designTokens.radius.md
    },
    brandBlock: {
      alignItems: "flex-start",
      gap: designTokens.spacing.lg,
      paddingTop: designTokens.spacing.xl,
      paddingBottom: designTokens.spacing.xl
    },
    brandAccent: {
      width: 48,
      height: 5,
      borderRadius: designTokens.radius.pill,
      backgroundColor: theme.colors.accent
    },
    descriptionBlock: {
      alignItems: "flex-start",
      gap: designTokens.spacing.md
    },
    description: {
      color: theme.colors.foregroundSecondary,
      lineHeight: 28,
      textAlign: "auto"
    },
    versionRow: {
      minHeight: 56,
      marginTop: designTokens.spacing.md,
      paddingVertical: designTokens.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    footer: {
      alignItems: "center",
      gap: designTokens.spacing.xs,
      paddingTop: designTokens.spacing.xl
    }
  });
}
