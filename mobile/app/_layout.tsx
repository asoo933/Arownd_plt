import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
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
import { useEffect, useState } from "react";

import { ThemeProvider, useAppTheme, useThemePreference } from "@/lib/design-system";
import { getSupabaseClient } from "@/lib/supabase";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
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
  const theme = useAppTheme();
  const { isReady: themeReady } = useThemePreference();

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

  if ((!fontsLoaded && !fontError) || !themeReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: theme.colors.background }
        }}
      />
    </QueryClientProvider>
  );
}
