import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { ActionButton, AuthField, AuthLayout, FormError, SuccessPanel } from "@/components/auth-ui";
import { Text as UiText } from "@/components/ui";
import { designTokens, useAppTheme } from "@/lib/theme";
import { signUpBusiness } from "@/lib/auth-service";
import { businessSignupSchema, type BusinessSignupInput } from "@/lib/auth-validation";
import { translate, useLanguage } from "@/lib/i18n";

export default function BusinessSignupScreen() {
  useLanguage();
  const theme = useAppTheme();
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<BusinessSignupInput>({
    resolver: zodResolver(businessSignupSchema),
    defaultValues: { fullName: "", businessName: "", email: "", password: "", confirmPassword: "" }
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const sessionCreated = await signUpBusiness(values);
      setHasSession(sessionCreated);
      setCreated(true);
    } catch (error) {
      setServerError(error instanceof Error && error.message === "SUPABASE_CONFIG_MISSING"
        ? translate("configError")
        : translate("genericError"));
    }
  });

  return (
    <AuthLayout title={translate("businessSignupTitle")} subtitle={translate("businessSignupSubtitle")} showBack>
      {created ? (
        <View style={styles.form}>
          <SuccessPanel
            title={translate(hasSession ? "accountCreatedTitle" : "signupSuccessTitle")}
            message={translate(hasSession ? "accountCreatedMessage" : "signupSuccess")}
          />
          <ActionButton label={translate("backToLogin")} onPress={() => router.replace("/login")} />
        </View>
      ) : (
        <View style={styles.form}>
          <Controller control={control} name="fullName" render={({ field: { onChange, onBlur, value } }) => (
            <AuthField label={translate("fullName")} value={value} onChangeText={onChange} onBlur={onBlur} placeholder={translate("fullNamePlaceholder")} error={errors.fullName ? translate("required") : undefined} />
          )} />
          <Controller control={control} name="businessName" render={({ field: { onChange, onBlur, value } }) => (
            <AuthField label={translate("businessName")} value={value} onChangeText={onChange} onBlur={onBlur} placeholder={translate("businessNamePlaceholder")} error={errors.businessName ? translate("businessNameRequired") : undefined} />
          )} />
          <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
            <AuthField label={translate("email")} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoComplete="email" placeholder={translate("emailPlaceholder")} error={errors.email ? translate(errors.email.message as "required" | "invalidEmail") : undefined} />
          )} />
          <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
            <AuthField label={translate("password")} value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry autoComplete="new-password" placeholder={translate("passwordPlaceholder")} error={errors.password ? translate("passwordMin") : undefined} />
          )} />
          <Controller control={control} name="confirmPassword" render={({ field: { onChange, onBlur, value } }) => (
            <AuthField label={translate("confirmPassword")} value={value} onChangeText={onChange} onBlur={onBlur} secureTextEntry placeholder={translate("confirmPasswordPlaceholder")} error={errors.confirmPassword ? translate(errors.confirmPassword.message as "required" | "passwordMismatch") : undefined} />
          )} />
          {serverError ? <FormError message={serverError} /> : null}
          <ActionButton label={isSubmitting ? translate("signupBusy") : translate("signup")} onPress={() => void submit()} loading={isSubmitting} />
          <View style={styles.loginRow}>
            <UiText tone="muted" style={styles.secondaryText}>{translate("alreadyHaveAccount")}</UiText>
            <Link href="/login" style={[styles.link, { color: theme.colors.accentMuted }]}>{translate("login")}</Link>
          </View>
        </View>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: designTokens.spacing.lg },
  loginRow: { flexDirection: "row", justifyContent: "center", gap: designTokens.spacing.xs, marginTop: 2 },
  secondaryText: { fontSize: designTokens.typography.body - 1 },
  link: { fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.extrabold }
});