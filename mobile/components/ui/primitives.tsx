import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle
} from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { Text as UiText } from "./typography";
import { getButtonPalette, type ButtonVariant } from "./palette";

type SurfaceProps = Pick<ViewProps, "accessibilityHint" | "accessibilityLabel" | "accessibilityRole" | "testID"> & {
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
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole,
  testID
}: SurfaceProps) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityHint={accessibilityHint}
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

type PressableSurfaceProps = Pick<PressableProps, "accessibilityHint" | "accessibilityLabel" | "accessibilityRole" | "accessibilityState" | "hitSlop" | "onPress" | "testID"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function PressableSurface({
  children,
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole = "button",
  accessibilityState,
  onPress,
  testID,
  hitSlop,
  style,
  disabled = false
}: PressableSurfaceProps) {
  const unavailable = disabled || !onPress || accessibilityState?.disabled === true;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled: unavailable }}
      onPress={onPress}
      testID={testID}
      hitSlop={hitSlop}
      disabled={unavailable}
      style={({ pressed }) => [style, { opacity: unavailable ? 0.5 : pressed ? 0.82 : 1 }]}
    >
      {children}
    </Pressable>
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
  sm: { minHeight: designTokens.dimensions.controlHeight.sm, paddingX: designTokens.spacing.sm, fontSize: designTokens.typography.caption },
  md: { minHeight: designTokens.dimensions.controlHeight.md, paddingX: designTokens.spacing.md, fontSize: designTokens.typography.body },
  lg: { minHeight: designTokens.dimensions.controlHeight.lg, paddingX: designTokens.spacing.lg, fontSize: designTokens.typography.subtitle }
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
          <UiText
            numberOfLines={1}
            style={[
              {
                color: palette.foregroundColor,
                fontSize: metrics.fontSize,
                fontWeight: designTokens.fontWeights.bold,
                includeFontPadding: false
              },
              textStyle
            ]}
          >
            {label}
          </UiText>
          {endIcon}
        </>
      )}
    </Pressable>
  );
}

type IconButtonProps = Pick<PressableProps, "accessibilityHint" | "testID"> & {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: "surface" | "accent" | "ghost";
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = "surface",
  size = designTokens.dimensions.controlHeight.md,
  disabled = false,
  style,
  accessibilityHint,
  testID
}: IconButtonProps) {
  const theme = useAppTheme();
  const backgroundColor =
    variant === "accent"
      ? theme.colors.accent
      : variant === "surface"
        ? theme.colors.surface
        : "transparent";
  const borderColor = variant === "surface" ? theme.colors.border : "transparent";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      testID={testID}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: theme.radius.pill,
          borderWidth: variant === "surface" ? 1 : 0,
          borderColor,
          backgroundColor,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : pressed ? 0.78 : 1
        },
        style
      ]}
    >
      {icon}
    </Pressable>
  );
}
