import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type TextInputProps
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import {
  Alert,
  Button,
  Caption,
  Heading,
  Icon,
  IconButton,
  PressableSurface,
  SuccessState,
  Text as UiText,
  TextField
} from "@/components/ui";
import { translate, type TranslationKey } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  showBack?: boolean;
};

export function AuthLayout({ title, subtitle, children, showBack = false }: AuthLayoutProps) {
  const theme = useAppTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            {showBack ? (
              <IconButton
                accessibilityLabel={translate("back")}
                onPress={() => router.back()}
                icon={<Icon name="chevron-left" color={theme.colors.foreground} size={22} />}
                variant="surface"
                size={44}
              />
            ) : <View style={styles.backPlaceholder} />}
            <UiText weight="900" align="center" style={styles.brand}>arownd</UiText>
            <View style={styles.backPlaceholder} />
          </View>

          <View style={styles.hero}>
            <Caption tone="accentMuted" weight="800" style={styles.eyebrow}>
              {translate("authEyebrow")}
            </Caption>
            <Heading level={1} align="right" style={styles.title}>{title}</Heading>
            <Caption tone="muted" style={styles.subtitle}>{subtitle}</Caption>
          </View>

          <View style={styles.content}>{children}</View>
          <Caption tone="muted" align="center" style={styles.footer}>
            {translate("secureNote")}
          </Caption>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = TextInputProps & { label: string; error?: string | undefined };

export function AuthField({ label, error, style, ...props }: FieldProps) {
  const isEmail = props.keyboardType === "email-address";

  return (
    <TextField
      {...props}
      label={label}
      error={error}
      textAlign={isEmail ? "left" : "right"}
      autoCapitalize={isEmail ? "none" : props.autoCapitalize}
      style={style}
    />
  );
}

type ActionButtonProps = { label: string; onPress: () => void; loading?: boolean; disabled?: boolean };

export function ActionButton({ label, onPress, loading = false, disabled = false }: ActionButtonProps) {
  return (
    <Button
      label={label}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      fullWidth
      size="lg"
    />
  );
}

export function InlineLink({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useAppTheme();

  return (
    <PressableSurface accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <UiText weight="700" tone="accentMuted" style={styles.link}>{label}</UiText>
    </PressableSurface>
  );
}

export function FormError({ message }: { message: string }) {
  return <Alert description={message} tone="danger" />;
}

export function SuccessPanel({ title, message }: { title: string; message: string }) {
  return <SuccessState title={title} description={message} />;
}

export function translateError(key: TranslationKey): string {
  return translate(key);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: designTokens.spacing.xl,
    paddingTop: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.xxl
  },
  header: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 24, letterSpacing: -1 },
  backPlaceholder: { width: 44, height: 44 },
  hero: { marginTop: 38, marginBottom: 28, alignItems: "flex-end" },
  eyebrow: { marginBottom: designTokens.spacing.md },
  title: { lineHeight: 39 },
  subtitle: { lineHeight: 25, textAlign: "right", marginTop: designTokens.spacing.sm },
  content: { gap: 18 },
  link: { fontSize: 13 },
  footer: { marginTop: "auto", paddingTop: 28, lineHeight: 19 }
});
