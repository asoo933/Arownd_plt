import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { ActionButton, AuthLayout, FormError, SuccessPanel } from "@/components/auth-ui";
import { Text as UiText } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";
import { translate } from "@/lib/i18n";

type CallbackState = "loading" | "success" | "error";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const code = typeof params.code === "string" ? params.code : undefined;
  const [state, setState] = useState<CallbackState>("loading");

  useEffect(() => {
    let active = true;

    const exchangeCode = async (): Promise<void> => {
      if (!code) {
        setState("error");
        return;
      }

      try {
        const { error } = await getSupabaseClient().auth.exchangeCodeForSession(code);
        if (active) setState(error ? "error" : "success");
      } catch {
        if (active) setState("error");
      }
    };

    void exchangeCode();

    return () => {
      active = false;
    };
  }, [code]);

  return (
    <AuthLayout title={translate("callbackTitle")} subtitle={translate("callbackLoading")}>
      {state === "loading" ? (
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <UiText tone="muted" style={{ fontSize: 14 }}>{translate("callbackLoading")}</UiText>
        </View>
      ) : state === "success" ? (
        <View style={{ gap: 18 }}>
          <SuccessPanel title={translate("callbackTitle")} message={translate("callbackSuccess")} />
          <ActionButton label={translate("backToLogin")} onPress={() => router.replace("/login")} />
        </View>
      ) : (
        <View style={{ gap: 18 }}>
          <FormError message={translate("callbackError")} />
          <ActionButton label={translate("backToLogin")} onPress={() => router.replace("/login")} />
        </View>
      )}
    </AuthLayout>
  );
}