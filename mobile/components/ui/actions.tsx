import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Text as UiText } from "./typography";

import { designTokens, useAppTheme } from "@/lib/theme";

export type ActionOption = {
  key: string;
  label: string;
  disabled?: boolean;
};

export function ButtonGroup({
  options,
  value,
  onChange,
  accessibilityLabel,
  style
}: {
  options: ActionOption[];
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={[{ flexDirection: "row-reverse", alignSelf: "flex-start", borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.pill, overflow: "hidden" }, style]}>
      {options.map((option, index) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled: option.disabled }}
            disabled={option.disabled}
            onPress={() => onChange(option.key)}
            style={({ pressed }) => [
              { minHeight: 44, minWidth: 48, paddingHorizontal: designTokens.spacing.md, alignItems: "center", justifyContent: "center", backgroundColor: selected ? theme.colors.accent : theme.colors.surface, borderStartWidth: index === 0 ? 0 : 1, borderStartColor: theme.colors.border, opacity: option.disabled ? 0.45 : pressed ? 0.72 : 1 }
            ]}
          >
            <UiText style={{ color: selected ? theme.colors.accentForeground : theme.colors.foreground, fontSize: theme.typography.body, fontWeight: selected ? "700" : "500" }}>{option.label}</UiText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FloatingActionButton({
  children,
  onPress,
  accessibilityLabel,
  disabled = false,
  style
}: {
  children: ReactNode;
  onPress: () => void;
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
      style={({ pressed }) => [
        { width: 56, height: 56, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.accent, opacity: disabled ? 0.45 : pressed ? 0.78 : 1, elevation: 4 },
        style
      ]}
    >
      {children}
    </Pressable>
  );
}

export function LinkButton({
  label,
  onPress,
  disabled = false,
  accessibilityHint,
  style
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [style, { minHeight: 44, justifyContent: "center", opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}
    >
      <UiText style={{ color: theme.colors.accentMuted, fontSize: theme.typography.body, fontWeight: "700", textDecorationLine: "underline" }}>{label}</UiText>
    </Pressable>
  );
}
