import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { ActionButton, AuthField, AuthLayout, FormError, SuccessPanel } from "@/components/auth-ui";
import { getSupabaseClient } from "@/lib/supabase";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/auth-validation";
import { translate } from "@/lib/i18n";

type RecoveryState = "loading" | "ready" | "invalid" | "updated";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const code = typeof params.code === "string" ? params.code : undefined;
  const [state, setState] = useState<RecoveryState>("loading");
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" }
  });

  useEffect(() => {
    let active = true;

    if (!code) {
      setState("invalid");
      return () => {
        active = false;
      };
    }

    void getSupabaseClient().auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (active) setState(error ? "invalid" : "ready");
      })
      .catch(() => {
        if (active) setState("invalid");
      });

    return () => {
      active = false;
    };
  }, [code]);

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const { error } = await getSupabaseClient().auth.updateUser({
        password: values.password
      });
      if (error) throw error;
      setState("updated");
    } catch {
      setServerError(translate("genericError"));
    }
  });

  return (
    <AuthLayout title={translate("resetTitle")} subtitle={translate("resetSubtitle")} showBack>
      {state === "loading" ? (
        <View style={{ paddingVertical: 20 }}>
          <FormError message={translate("callbackLoading")} />
        </View>
      ) : state === "invalid" ? (
        <View style={{ gap: 18 }}>
          <FormError message={translate("resetLinkInvalid")} />
          <ActionButton label={translate("backToLogin")} onPress={() => router.replace("/forgot-password")} />
        </View>
      ) : state === "updated" ? (
        <View style={{ gap: 18 }}>
          <SuccessPanel title={translate("resetTitle")} message={translate("resetSuccess")} />
          <ActionButton label={translate("backToLogin")} onPress={() => router.replace("/login")} />
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
            <AuthField
              label={translate("newPassword")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              autoComplete="new-password"
              placeholder={translate("passwordPlaceholder")}
              error={errors.password ? translate("passwordMin") : undefined}
            />
          )} />
          <Controller control={control} name="confirmPassword" render={({ field: { onChange, onBlur, value } }) => (
            <AuthField
              label={translate("confirmPassword")}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              placeholder={translate("confirmPasswordPlaceholder")}
              error={errors.confirmPassword ? translate(errors.confirmPassword.message as "required" | "passwordMismatch") : undefined}
            />
          )} />
          {serverError ? <FormError message={serverError} /> : null}
          <ActionButton
            label={isSubmitting ? translate("resetBusy") : translate("resetTitle")}
            onPress={() => void submit()}
            loading={isSubmitting}
          />
        </View>
      )}
    </AuthLayout>
  );
}