import type { ReactNode } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle
} from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";

type SurfaceProps = Pick<ViewProps, "accessibilityLabel" | "accessibilityRole" | "testID"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padding?: number;
  radius?: keyof ReturnType<typeof useAppTheme>["radius"];
};

export function Surface({
  children,
  style,
  elevated = true,
  padding = designTokens.spacing.md,
  radius = "lg",
  accessibilityLabel,
  accessibilityRole,
  testID
}: SurfaceProps) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      testID={testID}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius[radius],
          padding
        },
        elevated
          ? {
              shadowColor: "#000000",
              shadowOpacity: theme.mode === "dark" ? 0.28 : 0.06,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 5 },
              elevation: 2
            }
          : undefined,
        style
      ]}
    >
      {children}
    </View>
  );
}

export function Divider({
  vertical = false,
  style
}: {
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        vertical
          ? { width: StyleSheet.hairlineWidth, alignSelf: "stretch" }
          : { height: StyleSheet.hairlineWidth, alignSelf: "stretch" },
        { backgroundColor: theme.colors.border },
        style
      ]}
    />
  );
}
