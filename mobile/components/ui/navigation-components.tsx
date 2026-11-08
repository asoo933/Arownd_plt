import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { AppHeader } from "./navigation";

export type NavigationItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export function PageHeader({
  title,
  subtitle,
  leading,
  trailing,
  style
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View style={[{ gap: designTokens.spacing.xs }, style]}>
      <AppHeader title={title} leading={leading} trailing={trailing} />
      {subtitle ? <Text style={{ color: theme.colors.muted, fontSize: theme.typography.caption + 1, textAlign: "right" }}>{subtitle}</Text> : null}
    </View>
  );
}

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
      style={({ pressed }) => [{ width: 44, height: 44, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 }, style]}
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
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={[{ flexDirection: "row-reverse", justifyContent: "space-around", paddingVertical: designTokens.spacing.sm, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border }, style]}>
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
            style={({ pressed }) => [{ flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 2, alignItems: "center", justifyContent: "center", gap: 3, opacity: item.disabled ? 0.45 : pressed ? 0.7 : 1 }]}
          >
            {item.icon}
            <Text numberOfLines={1} style={{ color: selected ? theme.colors.accentMuted : theme.colors.muted, fontSize: theme.typography.caption, fontWeight: selected ? "700" : "400" }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TabBar({
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
    <View accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} style={[{ flexDirection: "row-reverse", borderBottomWidth: 1, borderBottomColor: theme.colors.border }, style]}>
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
            style={({ pressed }) => [{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderBottomWidth: selected ? 3 : 0, borderBottomColor: theme.colors.accentMuted, opacity: item.disabled ? 0.45 : pressed ? 0.7 : 1 }]}
          >
            <Text style={{ color: selected ? theme.colors.foreground : theme.colors.muted, fontSize: theme.typography.body, fontWeight: selected ? "700" : "500" }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Breadcrumb({
  items,
  separator,
  style
}: {
  items: Array<{ key: string; label: string; onPress?: () => void }>;
  separator?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View style={[{ flexDirection: "row-reverse", alignItems: "center", flexWrap: "wrap", gap: designTokens.spacing.xs }, style]}>
      {items.map((item, index) => {
        const current = index === items.length - 1;
        return (
          <View key={item.key} style={{ flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.xs }}>
            <Pressable disabled={!item.onPress || current} onPress={item.onPress} accessibilityRole={item.onPress ? "link" : "text"}>
              <Text style={{ color: current ? theme.colors.foreground : theme.colors.muted, fontSize: theme.typography.caption + 1, fontWeight: current ? "700" : "400" }}>{item.label}</Text>
            </Pressable>
            {!current ? separator ?? <Text style={{ color: theme.colors.muted }}>‹</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

export function NavigationMenu({
  items,
  value,
  onChange,
  style
}: {
  items: NavigationItem[];
  value: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View style={[{ gap: designTokens.spacing.xs }, style]}>
      {items.map((item) => {
        const selected = item.key === value;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected, disabled: item.disabled }}
            disabled={item.disabled}
            onPress={() => onChange(item.key)}
            style={({ pressed }) => [{ minHeight: 48, flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.md, paddingHorizontal: designTokens.spacing.md, borderRadius: theme.radius.md, backgroundColor: selected ? theme.colors.surfaceMuted : "transparent", opacity: item.disabled ? 0.45 : pressed ? 0.72 : 1 }]}
          >
            {item.icon}
            <Text style={{ flex: 1, color: selected ? theme.colors.foreground : theme.colors.muted, textAlign: "right", fontSize: theme.typography.body, fontWeight: selected ? "700" : "500" }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Drawer({
  visible,
  onRequestClose,
  children,
  width = "86%",
  closeAccessibilityLabel
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  closeAccessibilityLabel: string;
  width?: ViewStyle["width"];
}) {
  const theme = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={{ flex: 1, flexDirection: "row-reverse", backgroundColor: theme.colors.overlay }}>
        <Pressable onPress={onRequestClose} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={closeAccessibilityLabel} />
        <View style={{ width, maxWidth: "90%", height: "100%", padding: designTokens.spacing.lg, backgroundColor: theme.colors.surface }}>
          <ScrollView>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
