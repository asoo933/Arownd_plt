import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle
} from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { getButtonPalette, type ButtonVariant } from "./palette";

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

type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = Pick<PressableProps, "accessibilityHint" | "testID"> & {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
};

const buttonMetrics: Record<ButtonSize, { minHeight: number; paddingX: number; fontSize: number }> = {
  sm: { minHeight: 40, paddingX: 14, fontSize: 12 },
  md: { minHeight: 48, paddingX: 18, fontSize: 14 },
  lg: { minHeight: 54, paddingX: 22, fontSize: 16 }
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  startIcon,
  endIcon,
  textStyle,
  style,
  accessibilityHint,
  testID
}: ButtonProps) {
  const theme = useAppTheme();
  const palette = getButtonPalette(theme, variant);
  const metrics = buttonMetrics[size];
  const unavailable = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      disabled={unavailable}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        {
          minHeight: metrics.minHeight,
          paddingHorizontal: metrics.paddingX,
          borderRadius: theme.radius.md,
          borderWidth: palette.borderColor ? 1 : 0,
          borderColor: palette.borderColor ?? "transparent",
          backgroundColor: palette.backgroundColor,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: designTokens.spacing.sm,
          alignSelf: fullWidth ? "stretch" : "auto",
          opacity: unavailable ? 0.55 : pressed ? 0.82 : 1
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foregroundColor} />
      ) : (
        <>
          {startIcon}
          <Text
            numberOfLines={1}
            style={[
              {
                color: palette.foregroundColor,
                fontSize: metrics.fontSize,
                fontWeight: "700",
                includeFontPadding: false
              },
              textStyle
            ]}
          >
            {label}
          </Text>
          {endIcon}
        </>
      )}
    </Pressable>
  );
}
