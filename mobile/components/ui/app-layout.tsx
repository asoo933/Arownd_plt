import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { designTokens, useAppTheme } from "@/lib/theme";

export function AppShell({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return <SafeAreaView edges={["top", "left", "right"]} style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}>{children}</SafeAreaView>;
}

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return <View style={[{ flex: 1, backgroundColor: theme.colors.background }, style]}>{children}</View>;
}

export function Section({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap: designTokens.spacing.md }, style]}>{children}</View>;
}

export function SectionHeader({ title, action, style }: { title: ReactNode; action?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ minHeight: 36, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md }, style]}><View style={{ flex: 1 }}>{title}</View>{action}</View>;
}

export function StickyActionBar({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return <View style={[{ padding: designTokens.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }, style]}>{children}</View>;
}

export function SafeAreaContainer({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <SafeAreaView style={style}>{children}</SafeAreaView>;
}

export function KeyboardAvoidingContainer({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[{ flex: 1 }, style]}>{children}</KeyboardAvoidingView>;
}

export function RefreshContainer({
  children,
  refreshing,
  onRefresh,
  style
}: {
  children: ReactNode;
  refreshing: boolean;
  onRefresh: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return <ScrollView style={style} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accentMuted} colors={[theme.colors.accentMuted]} />} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
}
