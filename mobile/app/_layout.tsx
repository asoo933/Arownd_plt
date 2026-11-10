import { LocaleProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold
} from "@expo-google-fonts/inter";
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Logo from "@/components/logo";
import { ThemeProvider, useAppTheme, useThemePreference } from "@/lib/design-system";
import { getSupabaseClient } from "@/lib/supabase";
import { LanguageProvider, useLanguage, translate } from "@/lib/i18n";

const SPLASH_DURATION_MS = 2500;

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <RootLayoutContent />
      </ThemeProvider>
    </LanguageProvider>
  );
}

function RootLayoutContent() {
  const [fontsLoaded, fontError] = useFonts([
    {
      fontFamily: "Inter",
      fontDefinitions: [
        { path: Inter_400Regular, weight: 400 },
        { path: Inter_500Medium, weight: 500 },
        { path: Inter_600SemiBold, weight: 600 },
        { path: Inter_700Bold, weight: 700 },
        { path: Inter_800ExtraBold, weight: 800 }
      ]
    },
    {
      fontFamily: "IBMPlexSansArabic",
      fontDefinitions: [
        { path: IBMPlexSansArabic_400Regular, weight: 400 },
        { path: IBMPlexSansArabic_500Medium, weight: 500 },
        { path: IBMPlexSansArabic_600SemiBold, weight: 600 },
        { path: IBMPlexSansArabic_700Bold, weight: 700 }
      ]
    }
  ]);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false
          }
        }
      })
  );
  const [showSplash, setShowSplash] = useState(true);
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { language, isReady: languageReady, restartNoticeVersion } = useLanguage();
  const { isReady: themeReady } = useThemePreference();
  const appReady = (fontsLoaded || Boolean(fontError)) && themeReady && languageReady;

  useEffect(() => {
    if (!appReady) return;

    void SplashScreen.hideAsync().catch(() => undefined);
    const timeout = setTimeout(() => setShowSplash(false), SPLASH_DURATION_MS);

    return () => clearTimeout(timeout);
  }, [appReady]);

  useEffect(() => {
    if (restartNoticeVersion > 0) {
      Alert.alert(translate("settingsLanguageRestartTitle"), translate("settingsLanguageRestartMessage"));
    }
  }, [restartNoticeVersion]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      const { data } = getSupabaseClient().auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          queryClient.clear();
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "SUPABASE_CONFIG_MISSING") {
        throw error;
      }
    }

    return () => unsubscribe?.();
  }, [queryClient]);

  if (!appReady) return null;

  return (
    <View style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
        <LocaleProvider direction={language === "ar" ? "rtl" : "ltr"}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: language === "ar" ? "slide_from_left" : "slide_from_right",
              contentStyle: { backgroundColor: theme.colors.background }
            }}
          />
        </LocaleProvider>
      </QueryClientProvider>

      {showSplash ? (
        <View
          pointerEvents="auto"
          style={[StyleSheet.absoluteFillObject, styles.splash, { backgroundColor: theme.colors.background }]}
        >
          <View style={[styles.logo, { top: insets.top + 32 }]}>
            <Logo color={theme.colors.foreground} width={160} />
          </View>
          <View style={styles.indicator}>
            <ActivityIndicator size="large" color="#FFF01F" />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  splash: {
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 10,
    elevation: 10
  },
  logo: {
    position: "absolute",
    alignItems: "center"
  },
  indicator: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    alignItems: "center",
    justifyContent: "center"
  }
});
