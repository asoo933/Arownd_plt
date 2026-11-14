import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { CustomerScreen } from "@/components/customer-ui";
import { AppHeader, Caption, Heading, Icon, PressableSurface, Text as UiText } from "@/components/ui";
import { getLegalDocument } from "@/lib/legal-content";
import { useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

export function LegalDocumentScreen({ document }: { document: "privacy" | "terms" }) {
  const theme = useAppTheme();
  const { language } = useLanguage();
  const content = getLegalDocument(document, language);

  return (
    <CustomerScreen showNavigation={false} contentStyle={styles.content}>
      <PressableSurface
        accessibilityRole="button"
        accessibilityLabel={language === "ar" ? "رجوع" : "Back"}
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Icon name="chevron-right" size={22} color={theme.colors.foreground} />
      </PressableSurface>
      <AppHeader title={content.title} />
      <Caption>{content.updatedAt}</Caption>
      {content.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Heading level={3}>{section.title}</Heading>
          <UiText style={[styles.body, { color: theme.colors.foregroundSecondary }]}>{section.body}</UiText>
        </View>
      ))}
      <View style={[styles.contact, { borderColor: theme.colors.border }]}>
        <UiText weight="700">Team Arownd</UiText>
        <UiText style={{ color: theme.colors.accentMuted }}>arownddz@gmail.com</UiText>
      </View>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: designTokens.spacing.lg },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    borderRadius: designTokens.radius.md
  },
  section: { gap: designTokens.spacing.sm },
  body: { lineHeight: 27, textAlign: "auto" },
  contact: { borderTopWidth: 1, paddingTop: designTokens.spacing.md, gap: designTokens.spacing.xs }
});
