import type { ReactNode } from "react";
import {
  Pressable,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { Text as UiText } from "./typography";

export type NavigationItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export function BackButton({
  onPress,
  children,
  accessibilityLabel,
  disabled = false,
  style
}: {
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [{ width: theme.dimensions.controlHeight.md, height: theme.dimensions.controlHeight.md, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

export function BottomNavigation({
  items,
  value,
  onChange,
  accessibilityLabel,
  style
}: {
  items: NavigationItem[];
  value: string;
  onChange: (key: string) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: designTokens.spacing.sm,
          backgroundColor: theme.colors.background
        },
        style
      ]}
    >
      {items.map((item) => {
        const selected = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected, disabled: item.disabled }}
            disabled={item.disabled}
            onPress={() => onChange(item.key)}
            hitSlop={4}
            style={({ pressed }) => [
              {
                flex: 1,
                minWidth: 0,
                minHeight: theme.dimensions.controlHeight.lg,
                paddingHorizontal: designTokens.spacing.xs,
                alignItems: "center",
                justifyContent: "center",
                gap: designTokens.spacing.xs,
                opacity: item.disabled ? 0.45 : pressed ? 0.72 : 1
              }
            ]}
          >
            <View
              style={{
                minWidth: 44,
                minHeight: 32,
                paddingHorizontal: designTokens.spacing.md,
                borderRadius: theme.radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selected ? theme.colors.border : "transparent"
              }}
            >
              {item.icon}
            </View>
            <UiText
              numberOfLines={1}
              style={{
                color: selected ? theme.colors.accentMuted : theme.colors.muted,
                fontSize: theme.typography.caption,
                fontWeight: selected ? theme.fontWeights.bold : theme.fontWeights.regular,
                flexShrink: 1
              }}
            >
              {item.label}
            </UiText>
          </Pressable>
        );
      })}
    </View>
  );
}
