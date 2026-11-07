import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
  type TextInputProps
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { translate, type TranslationKey } from "@/lib/i18n";

const colors = {
  background: "#F5F5F5",
  surface: "#FFFFFF",
  foreground: "#0A0A0A",
  muted: "#737373",
  border: "#E5E5E5",
  accent: "#C6F135",
  danger: "#B42318"
};

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  showBack?: boolean;
};

export function AuthLayout({
  title,
  subtitle,
  children,
  showBack = false
}: AuthLayoutProps) {
  const isDark = useColorScheme() === "dark";
  const foreground = isDark ? "#F5F5F5" : colors.foreground;
  const muted = isDark ? "#A3A3A3" : colors.muted;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? "#0A0A0A" : colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            {showBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={translate("back")}
                onPress={() => router.back()}
                style={[styles.backButton, { backgroundColor: isDark ? "#171717" : colors.surface, borderColor: isDark ? "#333333" : colors.border }]}
              >
                <Text style={[styles.backText, { color: foreground }]}>‹</Text>
              </Pressable>
            ) : <View style={styles.backPlaceholder} />}
            <Text style={[styles.brand, { color: foreground }]}>arownd</Text>
            <View style={styles.backPlaceholder} />
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{translate("authEyebrow")}</Text>
            <Text style={[styles.title, { color: foreground }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: muted }]}>{subtitle}</Text>
          </View>

          <View style={styles.content}>{children}</View>
          <Text style={[styles.footer, { color: muted }]}>{translate("secureNote")}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthField({ label, error, style, ...props }: FieldProps) {
  const isEmail = props.keyboardType === "email-address";
  const isDark = useColorScheme() === "dark";
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: isDark ? "#F5F5F5" : colors.foreground }]}>{label}</Text>
      <TextInput
        {...props}
        textAlign={isEmail ? "left" : "right"}
        style={[
          styles.input,
          {
            backgroundColor: isDark ? "#171717" : colors.surface,
            borderColor: error ? colors.danger : isDark ? "#333333" : colors.border,
            color: isDark ? "#F5F5F5" : colors.foreground
          },
          style
        ]}
        placeholderTextColor={isDark ? "#737373" : "#A3A3A3"}
        autoCapitalize={isEmail ? "none" : props.autoCapitalize}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function ActionButton({
  label,
  onPress,
  loading = false,
  disabled = false
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed ? styles.primaryButtonPressed : undefined,
        disabled || loading ? styles.primaryButtonDisabled : undefined
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.foreground} />
      ) : (
        <Text style={styles.primaryButtonText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function InlineLink({
  label,
  onPress
}: {
  label: string;
  onPress: () => void;
}) {
  const isDark = useColorScheme() === "dark";
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <Text style={[styles.link, { color: isDark ? colors.accent : "#536719" }]}>{label}</Text>
    </Pressable>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" style={styles.errorBox}>
      <Text style={styles.errorBoxText}>{message}</Text>
    </View>
  );
}

export function SuccessPanel({
  title,
  message
}: {
  title: string;
  message: string;
}) {
  const isDark = useColorScheme() === "dark";
  return (
    <View style={[styles.successPanel, {
      backgroundColor: isDark ? "#1C2410" : "#F7FBEA",
      borderColor: isDark ? "#4B5C20" : "#D7E9A1"
    }]}>
      <View style={styles.successMark}>
        <Text style={styles.successMarkText}>✓</Text>
      </View>
      <Text style={[styles.successTitle, { color: isDark ? "#F5F5F5" : colors.foreground }]}>{title}</Text>
      <Text style={[styles.successMessage, { color: isDark ? "#C4C4C4" : colors.muted }]}>{message}</Text>
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
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  brand: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -1
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  backText: { fontSize: 28, lineHeight: 30 },
  backPlaceholder: { width: 42, height: 42 },
  hero: { marginTop: 38, marginBottom: 28, alignItems: "flex-end" },
  eyebrow: {
    color: "#A0BD2B",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 12
  },
  title: {
    fontSize: 29,
    lineHeight: 39,
    fontWeight: "800",
    textAlign: "right"
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 25,
    textAlign: "right",
    marginTop: 8
  },
  content: { gap: 18 },
  fieldGroup: { gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right"
  },
  input: {
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15
  },
  errorText: { color: colors.danger, fontSize: 12, textAlign: "right" },
  primaryButton: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4
  },
  primaryButtonPressed: { opacity: 0.82 },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "800"
  },
  link: { fontSize: 13, fontWeight: "700" },
  errorBox: {
    padding: 14,
    borderRadius: 13,
    backgroundColor: "#FEECEB",
    borderWidth: 1,
    borderColor: "#F7C8C4"
  },
  errorBoxText: { color: colors.danger, fontSize: 13, textAlign: "right", lineHeight: 21 },
  successPanel: {
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    gap: 12
  },
  successMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  successMarkText: { fontSize: 25, fontWeight: "900", color: colors.foreground },
  successTitle: { fontSize: 17, fontWeight: "800" },
  successMessage: {
    fontSize: 13,
    lineHeight: 23,
    textAlign: "center"
  },
  footer: {
    marginTop: "auto",
    paddingTop: 28,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 19
  }
});