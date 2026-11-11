import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import {
  ActionButton,
  AuthLayout,
  FormError,
  SuccessPanel
} from "@/components/auth-ui";
import { Text as UiText } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";
import { translate, useLanguage } from "@/lib/i18n";
import { designTokens } from "@/lib/theme";

type CallbackState = "loading" | "success" | "error";

export default function AuthCallbackScreen() {
  useLanguage();

  const params = useLocalSearchParams<{ code?: string }>();
  const code = typeof params.code === "string" ? params.code : undefined;
  const [state, setState] = useState<CallbackState>("loading");

  useEffect(() => {
    let active = true;

    const exchangeCode = async (): Promise<void> => {
      if (!code) {
        if (active) setState("error");
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

  const subtitleKey = state === "loading"
    ? "callbackLoading"
    : state === "success"
      ? "callbackSuccess"
      : "callbackError";

  return (
    <AuthLayout
      title={translate("callbackTitle")}
      subtitle={translate(subtitleKey)}
    >
      {state === "loading" ? (
        <View style={styles.loadingContent}>
          <UiText tone="muted" style={styles.loadingText}>
            {translate("callbackLoading")}
          </UiText>
        </View>
      ) : state === "success" ? (
        <View style={styles.stateContent}>
          <SuccessPanel
            title={translate("callbackTitle")}
            message={translate("callbackSuccess")}
          />
          <ActionButton
            label={translate("backToLogin")}
            onPress={() => router.replace("/login")}
          />
        </View>
      ) : (
        <View style={styles.stateContent}>
          <FormError message={translate("callbackError")} />
          <ActionButton
            label={translate("backToLogin")}
            onPress={() => router.replace("/login")}
          />
        </View>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  loadingContent: {
    alignItems: "center",
    paddingVertical: designTokens.spacing.xl
  },
  loadingText: {
    fontSize: designTokens.typography.body
  },
  stateContent: {
    gap: designTokens.spacing.xl
  }
});