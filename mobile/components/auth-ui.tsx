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

import Logo from "@/components/logo";
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

  const handleBack = (): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/login");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            {showBack ? (
              <IconButton
                accessibilityLabel={translate("back")}
                onPress={handleBack}
                icon={<Icon name="chevron-right" color={theme.colors.foreground} size={designTokens.dimensions.iconSize.md} />}
                variant="surface"
                size={designTokens.dimensions.controlHeight.md}
              />
            ) : <View style={styles.backPlaceholder} />}
            <Logo color={theme.colors.foreground} width={160} />
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
      textAlign={isEmail ? "left" : "auto"}
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
  return (
    <PressableSurface accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <UiText weight="700" tone="accentMuted" style={styles.link}>{label}</UiText>
    </PressableSurface>
  );
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const theme = useAppTheme();
  if (!password) return null;

  const score = [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\\d/.test(password) && /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length;
  const labelKey = score <= 1
    ? "passwordStrengthWeak"
    : score === 2
      ? "passwordStrengthFair"
      : score === 3
        ? "passwordStrengthGood"
        : "passwordStrengthStrong";
  const strengthColor = score <= 1
    ? theme.colors.danger
    : score === 2
      ? theme.colors.warning
      : score === 3
        ? theme.colors.accent
        : theme.colors.success;

  return (
    <View accessibilityLabel={`${translate("passwordStrength")}: ${translate(labelKey)}`} style={styles.passwordStrength}>
      <View style={styles.passwordStrengthHeader}>
        <Caption tone="muted">{translate("passwordStrength")}</Caption>
        <Caption style={{ color: strengthColor }} weight="700">{translate(labelKey)}</Caption>
      </View>
      <View style={styles.passwordStrengthBars}>
        {[1, 2, 3, 4].map((segment) => (
          <View
            key={segment}
            style={[
              styles.passwordStrengthBar,
              { backgroundColor: segment <= score ? strengthColor : theme.colors.border }
            ]}
          />
        ))}
      </View>
    </View>
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
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backPlaceholder: {
    width: designTokens.dimensions.controlHeight.md,
    height: designTokens.dimensions.controlHeight.md
  },
  hero: {
    marginTop: designTokens.spacing.xxl + designTokens.spacing.sm,
    marginBottom: designTokens.spacing.xxl,
    alignItems: "flex-start"
  },
  eyebrow: { marginBottom: designTokens.spacing.md },
  title: { textAlign: "auto" },
  subtitle: { textAlign: "auto", marginTop: designTokens.spacing.sm },
  content: { gap: designTokens.spacing.lg },
  link: { fontSize: designTokens.typography.caption + 2 },
  passwordStrength: { gap: designTokens.spacing.xs, marginTop: -designTokens.spacing.sm },
  passwordStrengthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  passwordStrengthBars: { flexDirection: "row", gap: designTokens.spacing.xs },
  passwordStrengthBar: { flex: 1, height: 4, borderRadius: designTokens.radius.pill },
  footer: { marginTop: "auto", paddingTop: designTokens.spacing.xxl }
});
