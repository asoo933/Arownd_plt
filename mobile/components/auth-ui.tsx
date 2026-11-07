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
  return (
    <SafeAreaView style={styles.safeArea}>
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
                style={styles.backButton}
              >
                <Text style={styles.backText}>‹</Text>
              </Pressable>
            ) : <View style={styles.backPlaceholder} />}
            <Text style={styles.brand}>arownd</Text>
            <View style={styles.backPlaceholder} />
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>{translate("authEyebrow")}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={styles.content}>{children}</View>
          <Text style={styles.footer}>{translate("secureNote")}</Text>
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
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        textAlign={isEmail ? "left" : "right"}
        style={[styles.input, error ? styles.inputError : undefined, style]}
        placeholderTextColor="#A3A3A3"
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
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <Text style={styles.link}>{label}</Text>
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
  return (
    <View accessibilityRole="summary" style={styles.successPanel}>
      <View style={styles.successMark}>
        <Text style={styles.successMarkText}>✓</Text>
      </View>
      <Text style={styles.successTitle}>{title}</Text>
      <Text style={styles.successMessage}>{message}</Text>
    </View>
  );
}

export function translateError(key: TranslationKey): string {
  return translate(key);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
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
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -1
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  backText: { color: colors.foreground, fontSize: 28, lineHeight: 30 },
  backPlaceholder: { width: 42, height: 42 },
  hero: { marginTop: 38, marginBottom: 28, alignItems: "flex-end" },
  eyebrow: {
    color: "#667A18",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 12
  },
  title: {
    color: colors.foreground,
    fontSize: 29,
    lineHeight: 39,
    fontWeight: "800",
    textAlign: "right"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 25,
    textAlign: "right",
    marginTop: 8
  },
  content: { gap: 18 },
  fieldGroup: { gap: 8 },
  label: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right"
  },
  input: {
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.foreground,
    paddingHorizontal: 16,
    fontSize: 15
  },
  inputError: { borderColor: colors.danger },
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
  link: { color: "#536719", fontSize: 13, fontWeight: "700" },
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
    borderColor: "#D7E9A1",
    backgroundColor: "#F7FBEA",
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
  successTitle: { color: colors.foreground, fontSize: 17, fontWeight: "800" },
  successMessage: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 23,
    textAlign: "center"
  },
  footer: {
    marginTop: "auto",
    paddingTop: 28,
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 19
  }
});