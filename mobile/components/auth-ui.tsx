import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInputProps
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { translate, type TranslationKey } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";
import { Button, IconButton, PressableSurface, TextField } from "@/components/ui";

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
                icon={<Text style={{ color: theme.colors.foreground, fontSize: 28, lineHeight: 30 }}>‹</Text>}
                variant="surface"
                size={44}
              />
            ) : <View style={styles.backPlaceholder} />}
            <Text style={[styles.brand, { color: theme.colors.foreground }]}>arownd</Text>
            <View style={styles.backPlaceholder} />
          </View>

          <View style={styles.hero}>
            <Text style={[styles.eyebrow, { color: theme.colors.accentMuted }]}>{translate("authEyebrow")}</Text>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{subtitle}</Text>
          </View>

          <View style={styles.content}>{children}</View>
          <Text style={[styles.footer, { color: theme.colors.muted }]}>{translate("secureNote")}</Text>
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
    <PressableSurface accessibilityRole="link" onPress={onPress}>
      <Text style={[styles.link, { color: theme.colors.accentMuted }]}>{label}</Text>
    </PressableSurface>
  );
}

export function FormError({ message }: { message: string }) {
  const theme = useAppTheme();
  return (
    <View accessibilityRole="alert" style={[styles.errorBox, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerBorder }]}>
      <Text style={[styles.errorBoxText, { color: theme.colors.danger }]}>{message}</Text>
    </View>
  );
}

export function SuccessPanel({ title, message }: { title: string; message: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.successPanel, { backgroundColor: theme.colors.successSurface, borderColor: theme.colors.successBorder }]}>
      <View style={[styles.successMark, { backgroundColor: theme.colors.accent }]}>
        <Text style={[styles.successMarkText, { color: theme.colors.accentForeground }]}>✓</Text>
      </View>
      <Text style={[styles.successTitle, { color: theme.colors.foreground }]}>{title}</Text>
      <Text style={[styles.successMessage, { color: theme.colors.muted }]}>{message}</Text>
    </View>
  );
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
  brand: { fontSize: 24, fontWeight: "900", letterSpacing: -1 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: designTokens.radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  backText: { fontSize: 28, lineHeight: 30 },
  backPlaceholder: { width: 44, height: 44 },
  hero: { marginTop: 38, marginBottom: 28, alignItems: "flex-end" },
  eyebrow: { fontSize: 12, fontWeight: "800", marginBottom: designTokens.spacing.md },
  title: { fontSize: designTokens.typography.display, lineHeight: 39, fontWeight: "800", textAlign: "right" },
  subtitle: { fontSize: designTokens.typography.body, lineHeight: 25, textAlign: "right", marginTop: designTokens.spacing.sm },
  content: { gap: 18 },
  fieldGroup: { gap: designTokens.spacing.sm },
  label: { fontSize: 13, fontWeight: "700", textAlign: "right" },
  input: { minHeight: 54, borderRadius: designTokens.radius.lg - 3, borderWidth: 1, paddingHorizontal: designTokens.spacing.lg, fontSize: 15 },
  errorText: { fontSize: 12, textAlign: "right" },
  primaryButton: { minHeight: 54, borderRadius: designTokens.radius.lg - 3, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryButtonPressed: { opacity: 0.82 },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { fontSize: 15, fontWeight: "800" },
  link: { fontSize: 13, fontWeight: "700" },
  errorBox: { padding: 14, borderRadius: designTokens.radius.md - 1, borderWidth: 1 },
  errorBoxText: { fontSize: 13, textAlign: "right", lineHeight: 21 },
  successPanel: { padding: 22, borderRadius: designTokens.radius.lg, borderWidth: 1, alignItems: "center", gap: 12 },
  successMark: { width: 48, height: 48, borderRadius: designTokens.radius.pill, alignItems: "center", justifyContent: "center" },
  successMarkText: { fontSize: 25, fontWeight: "900" },
  successTitle: { fontSize: 17, fontWeight: "800" },
  successMessage: { fontSize: 13, lineHeight: 23, textAlign: "center" },
  footer: { marginTop: "auto", paddingTop: 28, fontSize: 11, textAlign: "center", lineHeight: 19 }
});
