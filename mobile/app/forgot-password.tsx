import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { designTokens } from "@/lib/theme";
import { ActionButton, AuthField, AuthLayout, FormError, InlineLink, SuccessPanel } from "@/components/auth-ui";
import { requestPasswordRecovery } from "@/lib/auth-service";
import { recoverySchema, type RecoveryInput } from "@/lib/auth-validation";
import { translate, useLanguage } from "@/lib/i18n";

export default function ForgotPasswordScreen() {
  useLanguage();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RecoveryInput>({
    resolver: zodResolver(recoverySchema),
    defaultValues: { email: "" }
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await requestPasswordRecovery(values);
      setSent(true);
    } catch (error) {
      if (error instanceof Error && error.message === "SUPABASE_CONFIG_MISSING") {
        setServerError(translate("configError"));
      } else {
        // Generic feedback prevents account enumeration.
        setSent(true);
      }
    }
  });

  return (
    <AuthLayout title={translate("forgotTitle")} subtitle={translate("forgotSubtitle")} showBack>
      {sent ? (
        <View style={{ gap: designTokens.spacing.xl }}>
          <SuccessPanel title={translate("forgotTitle")} message={translate("recoverySuccess")} />
          <ActionButton label={translate("backToLogin")} onPress={() => router.replace("/login")} />
        </View>
      ) : (
        <View style={{ gap: designTokens.spacing.xl }}>
          <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
            <AuthField label={translate("email")} value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoComplete="email" placeholder={translate("emailPlaceholder")} error={errors.email ? translate(errors.email.message as "required" | "invalidEmail") : undefined} />
          )} />
          {serverError ? <FormError message={serverError} /> : null}
          <ActionButton label={isSubmitting ? translate("recoveryBusy") : translate("sendRecovery")} onPress={() => void submit()} loading={isSubmitting} />
          <InlineLink label={translate("backToLogin")} onPress={() => router.replace("/login")} />
        </View>
      )}
    </AuthLayout>
  );
}