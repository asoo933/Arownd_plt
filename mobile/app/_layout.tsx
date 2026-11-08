import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ThemeProvider, useAppTheme } from "@/lib/design-system";
import { getSupabaseClient } from "@/lib/supabase";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}

function RootLayoutContent() {
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
