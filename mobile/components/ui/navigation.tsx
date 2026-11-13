import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text as UiText } from "./typography";

import { designTokens, useAppTheme } from "@/lib/theme";

export function AppHeader({
  title,
  leading,
  trailing,
  style
}: {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <View style={[styles.header, { gap: theme.spacing.md }, style]}>
      {leading ? <View style={styles.slot}>{leading}</View> : null}
      <UiText
        accessibilityRole="header"
        numberOfLines={1}
        style={[styles.headerTitle, { color: theme.colors.foreground, fontSize: theme.typography.title }]}
      >
        {title}
      </UiText>
      <View style={[styles.slot, styles.trailing]}>{trailing}</View>
    </View>
  );
}

export type SegmentedOption = {
  key: string;
  label: string;
  accessibilityLabel?: string;
};

export function SegmentedControl({
  options,
  value,
  onChange,
  accessibilityLabel,
  style
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.segmented,
        { backgroundColor: theme.colors.surfaceMuted, borderRadius: theme.radius.pill },
        style
      ]}
    >
      {options.map((option) => {
        const selected = option.key === value;

        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) onChange(option.key);
            }}
            style={({ pressed }) => [
              styles.segment,
              {
                borderRadius: theme.radius.pill,
                backgroundColor: selected && theme.mode === "light" ? theme.colors.accent : "transparent",
                opacity: pressed ? 0.75 : 1
              }
            ]}
          >
            <UiText
              numberOfLines={1}
              style={{
                color: selected ? (theme.mode === "dark" ? theme.colors.accent : theme.colors.accentForeground) : theme.colors.muted,
                fontSize: theme.typography.body,
                fontWeight: selected ? theme.fontWeights.bold : theme.fontWeights.medium
              }}
            >
              {option.label}
            </UiText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: designTokens.dimensions.controlHeight.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  slot: {
    minWidth: designTokens.dimensions.controlHeight.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  trailing: {
    flexDirection: "row",
    gap: designTokens.spacing.sm
  },
  headerTitle: {
    flex: 1,
    textAlign: "auto",
    fontWeight: designTokens.fontWeights.extrabold
  },
  segmented: {
    flexDirection: "row",
    alignItems: "center",
    padding: designTokens.spacing.xs,
    gap: designTokens.spacing.xs
  },
  segment: {
    flex: 1,
    minHeight: designTokens.dimensions.controlHeight.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.sm
  }
});
