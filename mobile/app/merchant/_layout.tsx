import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MerchantNavigation } from "@/components/merchant-navigation";
import { useAppTheme } from "@/lib/theme";

export default function MerchantLayout() {
  const theme = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: theme.colors.background }
        }}
      />
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={{ backgroundColor: theme.colors.surface }}
      >
        <MerchantNavigation />
      </SafeAreaView>
    </View>
  );
}
