import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { ActionButton, AuthField, AuthLayout, FormError, InlineLink } from "@/components/auth-ui";
import { Text as UiText } from "@/components/ui";
import { designTokens } from "@/lib/theme";
import { signIn } from "@/lib/auth-service";
import { loginSchema, type LoginInput } from "@/lib/auth-validation";
import { translate, useLanguage } from "@/lib/i18n";

export default function LoginScreen() {
  useLanguage();
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signIn(values);
      router.replace("/home");
    } catch (error) {
      setServerError(error instanceof Error && error.message === "SUPABASE_CONFIG_MISSING"
        ? translate("configError")
        : translate("genericError"));
    }
  });

  return (
    <AuthLayout title={translate("loginTitle")} subtitle={translate("loginSubtitle")}>
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthField
              label={translate("email")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoComplete="email"
              placeholder={translate("emailPlaceholder")}
              error={errors.email ? translate(errors.email.message as "required" | "invalidEmail") : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <AuthField
              label={translate("password")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              autoComplete="current-password"
              placeholder={translate("passwordPlaceholder")}
              error={errors.password ? translate("required") : undefined}
            />
          )}
        />
        <View style={styles.forgotRow}>
          <InlineLink label={translate("forgotPassword")} onPress={() => router.push("/forgot-password")} />
        </View>
        {serverError ? <FormError message={serverError} /> : null}
        <ActionButton
          label={isSubmitting ? translate("loginBusy") : translate("login")}
          onPress={() => void submit()}
          loading={isSubmitting}
        />
        <View style={styles.signupRow}>
          <UiText tone="muted" style={styles.secondaryText}>{translate("noAccount")}</UiText>
          <InlineLink label={translate("createAccount")} onPress={() => router.push("/account-type")} />
        </View>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: designTokens.spacing.lg },
  forgotRow: { alignItems: "flex-start" },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: designTokens.spacing.xs,
    marginTop: designTokens.spacing.xs
  },
  secondaryText: { fontSize: designTokens.typography.caption + 2 }
});