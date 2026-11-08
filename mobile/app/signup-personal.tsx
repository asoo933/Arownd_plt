import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { ActionButton, AuthField, AuthLayout, FormError, SuccessPanel } from "@/components/auth-ui";
import { Text as UiText } from "@/components/ui";
import { signUpPersonal } from "@/lib/auth-service";
import { personalSignupSchema, type PersonalSignupInput } from "@/lib/auth-validation";
import { translate } from "@/lib/i18n";

export default function PersonalSignupScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<PersonalSignupInput>({
    resolver: zodResolver(personalSignupSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" }
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const sessionCreated = await signUpPersonal(values);
      setHasSession(sessionCreated);
      setCreated(true);
    } catch (error) {
      setServerError(error instanceof Error && error.message === "SUPABASE_CONFIG_MISSING"
        ? translate("configError")
        : translate("genericError"));
    }
  });

  return (
    <AuthLayout title={translate("personalSignupTitle")} subtitle={translate("personalSignupSubtitle")} showBack>
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
            <UiText style={styles.secondaryText}>{translate("alreadyHaveAccount")}</UiText>
            <Link href="/login" style={styles.link}>{translate("login")}</Link>
          </View>
        </View>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  loginRow: { flexDirection: "row-reverse", justifyContent: "center", gap: 6, marginTop: 2 },
  secondaryText: { color: "#737373", fontSize: 13 },
  link: { color: "#536719", fontSize: 13, fontWeight: "800" }
});