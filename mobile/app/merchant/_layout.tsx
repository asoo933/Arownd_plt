import { Stack } from "expo-router";

import { useAppTheme } from "@/lib/theme";

export default function MerchantLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: theme.colors.background }
      }}
    />
  );
}
