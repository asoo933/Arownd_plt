import type { ComponentProps, ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { Dialog } from "./feedback";
import { RadioGroup, type RadioOption, Select, type SelectOption } from "./forms";
import { TextField } from "./form-controls";

export function MapView({
  children,
  style,
  accessibilityLabel
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}) {
  const theme = useAppTheme();
  return <View accessibilityLabel={accessibilityLabel} style={[{ minHeight: 180, width: "100%", overflow: "hidden", borderRadius: theme.radius.xl, backgroundColor: theme.colors.surfaceMuted, position: "relative" }, style]}>{children}</View>;
}

export function MapMarker({
  children,
  x,
  y,
  style,
  accessibilityLabel
}: {
  children: ReactNode;
  x: number;
  y: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}) {
  const theme = useAppTheme();
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={[{ position: "absolute", left: `${Math.min(100, Math.max(0, x))}%`, top: `${Math.min(100, Math.max(0, y))}%`, minWidth: 36, minHeight: 36, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.accent, borderWidth: 2, borderColor: theme.colors.surface, transform: [{ translateX: -18 }, { translateY: -18 }] }, style]}>
      {children}
    </View>
  );
}

export function LocationPicker({
  map,
  value,
  onConfirm,
  confirmLabel,
  style
}: {
  map: ReactNode;
  value: ReactNode;
  onConfirm: () => void;
  confirmLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return <View style={[{ gap: designTokens.spacing.md }, style]}>{map}<View style={{ padding: designTokens.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, gap: designTokens.spacing.md }}>{value}<Pressable accessibilityRole="button" accessibilityLabel={confirmLabel} onPress={onConfirm} style={{ minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent }}><Text style={{ color: theme.colors.accentForeground, fontSize: theme.typography.body, fontWeight: "700" }}>{confirmLabel}</Text></Pressable></View></View>;
}

export function DirectionsButton({
  label,
  onPress,
  children,
  disabled = false,
  style
}: {
  label: string;
  onPress: () => void;
  children?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [ { minHeight: 44, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: designTokens.spacing.sm, paddingHorizontal: designTokens.spacing.md, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 }, style]}>{children}</Pressable>;
}

export function LocationSearch(props: ComponentProps<typeof TextField>) {
  return <TextField {...props} />;
}

export function AddressPicker({
  options,
  value,
  onChange,
  accessibilityLabel,
  style
}: {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  return <RadioGroup options={options} value={value} onChange={onChange} accessibilityLabel={accessibilityLabel} style={style} />;
}

export function WilayaSelect(props: ComponentProps<typeof Select>) {
  return <Select {...props} />;
}

export function CommuneSelect(props: ComponentProps<typeof Select>) {
  return <Select {...props} />;
}

export function LocationPermissionPrompt({
  visible,
  onRequestClose,
  title,
  description,
  children
}: {
  visible: boolean;
  onRequestClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return <Dialog visible={visible} onRequestClose={onRequestClose} title={title} description={description}>{children}</Dialog>;
}
