import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { Icon } from "./icon";
import { Text as UiText } from "./typography";

export type FeedbackTone = "info" | "success" | "warning" | "danger";

export function Alert({
  title,
  description,
  tone = "info",
  style
}: {
  title?: string;
  description: string;
  tone?: FeedbackTone;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const palette = {
    info: { foreground: theme.colors.accentMuted, background: theme.colors.surfaceMuted, border: theme.colors.border },
    success: { foreground: theme.colors.success, background: theme.colors.successSurface, border: theme.colors.successBorder },
    warning: { foreground: theme.colors.warning, background: theme.colors.warningSurface, border: theme.colors.warningBorder },
    danger: { foreground: theme.colors.danger, background: theme.colors.dangerSurface, border: theme.colors.dangerBorder }
  } satisfies Record<FeedbackTone, { foreground: string; background: string; border: string }>;
  const colors = palette[tone];

  return (
    <View accessibilityRole="alert" style={[{ padding: designTokens.spacing.md, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, gap: designTokens.spacing.xs }, style]}>
      {title ? <UiText style={{ color: colors.foreground, fontWeight: theme.fontWeights.bold, fontSize: theme.typography.body, textAlign: "right" }}>{title}</UiText> : null}
      <UiText style={{ color: theme.colors.foreground, fontSize: theme.typography.body, textAlign: "right" }}>{description}</UiText>
    </View>
  );
}

export function Banner({
  children,
  action,
  style
}: {
  children: ReactNode;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View style={[{ flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.md, padding: designTokens.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.accent }, style]}>
      <View style={{ flex: 1 }}>{children}</View>
      {action}
    </View>
  );
}

export function ProgressBar({
  value,
  max = 100,
  accessibilityLabel,
  style
}: {
  value: number;
  max?: number;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const progress = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max, now: Math.min(max, Math.max(0, value)) }}
      style={[{ height: 8, overflow: "hidden", borderRadius: theme.radius.pill, backgroundColor: theme.colors.border }, style]}
    >
      <View style={{ width: `${progress * 100}%`, height: "100%", borderRadius: theme.radius.pill, backgroundColor: theme.colors.accentMuted }} />
    </View>
  );
}

export function Spinner({ size = "small", color }: { size?: "small" | "large"; color?: string }) {
  const theme = useAppTheme();
  return <ActivityIndicator size={size} color={color ?? theme.colors.accentMuted} />;
}

export function Skeleton({
  width = "100%",
  height = 16,
  radius,
  style
}: {
  width?: ViewStyle["width"];
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return <View accessibilityElementsHidden style={[{ width, height, borderRadius: radius ?? theme.radius.sm, backgroundColor: theme.colors.surfaceMuted }, style]} />;
}

export function SuccessState({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ minHeight: 144, alignItems: "center", justifyContent: "center", gap: designTokens.spacing.md, padding: designTokens.spacing.xl }}>
      <View style={{ width: theme.dimensions.avatarSize.md, height: theme.dimensions.avatarSize.md, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.successSurface }}>
        <Icon name="check" size={24} color={theme.colors.success} accessibilityHidden />
      </View>
      <UiText accessibilityRole="header" style={{ color: theme.colors.foreground, fontSize: theme.typography.subtitle, fontWeight: theme.fontWeights.extrabold, textAlign: "center" }}>{title}</UiText>
      {description ? <UiText style={{ color: theme.colors.muted, fontSize: theme.typography.body, textAlign: "center" }}>{description}</UiText> : null}
      {action}
    </View>
  );
}

export function Dialog({
  visible,
  onRequestClose,
  title,
  description,
  children
}: {
  visible: boolean;
  onRequestClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={{ flex: 1, justifyContent: "center", padding: designTokens.spacing.lg }}>
        <Pressable accessible={false} onPress={onRequestClose} style={{ position: "absolute", top: 0, bottom: 0, start: 0, end: 0, backgroundColor: theme.colors.overlay }} />
        <View accessibilityViewIsModal style={{ padding: designTokens.spacing.lg, borderRadius: theme.radius.xl, backgroundColor: theme.colors.surface, gap: designTokens.spacing.md }}>
          {title ? <UiText accessibilityRole="header" style={{ color: theme.colors.foreground, fontSize: theme.typography.subtitle, fontWeight: theme.fontWeights.extrabold, textAlign: "right" }}>{title}</UiText> : null}
          {description ? <UiText style={{ color: theme.colors.muted, fontSize: theme.typography.body, textAlign: "right" }}>{description}</UiText> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function BottomSheet({
  visible,
  onRequestClose,
  children,
  maxHeight = "85%"
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
  maxHeight?: ViewStyle["maxHeight"];
}) {
  const theme = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onRequestClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable accessible={false} onPress={onRequestClose} style={{ position: "absolute", top: 0, bottom: 0, start: 0, end: 0, backgroundColor: theme.colors.overlay }} />
        <View accessibilityViewIsModal style={{ maxHeight, padding: designTokens.spacing.lg, paddingBottom: designTokens.spacing.xxl, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, backgroundColor: theme.colors.surface, gap: designTokens.spacing.md }}>
          <View style={{ width: theme.dimensions.avatarSize.md, height: 4, borderRadius: theme.radius.pill, backgroundColor: theme.colors.border, alignSelf: "center" }} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function Toast({
  visible,
  message,
  action
}: {
  visible: boolean;
  message: string;
  action?: ReactNode;
}) {
  const theme = useAppTheme();
  if (!visible) return null;

  return (
    <View accessibilityRole="alert" pointerEvents="box-none" style={{ position: "absolute", start: designTokens.spacing.md, end: designTokens.spacing.md, bottom: designTokens.spacing.xl, alignItems: "center" }}>
      <View style={{ minHeight: theme.dimensions.controlHeight.lg, maxWidth: "100%", flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.sm, paddingHorizontal: designTokens.spacing.lg, paddingVertical: designTokens.spacing.sm, borderRadius: theme.radius.pill, backgroundColor: theme.colors.foreground }}>
        <UiText style={{ color: theme.colors.surface, flex: 1, textAlign: "right" }}>{message}</UiText>
        {action}
      </View>
    </View>
  );
}


export function ConfirmDialog({
  visible,
  onRequestClose,
  onConfirm,
  title,
  description,
  cancelLabel,
  confirmLabel,
  busy = false,
  destructive = false
}: {
  visible: boolean;
  onRequestClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  cancelLabel: string;
  confirmLabel: string;
  busy?: boolean;
  destructive?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Dialog visible={visible} onRequestClose={onRequestClose} title={title} description={description}>
      <View style={{ flexDirection: "row-reverse", gap: designTokens.spacing.sm }}>
        <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel} disabled={busy} onPress={onRequestClose} style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.border, opacity: busy ? 0.5 : 1 }}>
          <UiText style={{ color: theme.colors.foreground, fontWeight: theme.fontWeights.bold }}>{cancelLabel}</UiText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={confirmLabel} accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onConfirm} style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.pill, backgroundColor: destructive ? theme.colors.danger : theme.colors.accent, opacity: busy ? 0.5 : 1 }}>
          {busy ? <ActivityIndicator color={destructive ? (theme.mode === "dark" ? theme.colors.accentForeground : theme.colors.surface) : theme.colors.accentForeground} /> : <UiText style={{ color: destructive ? (theme.mode === "dark" ? theme.colors.accentForeground : theme.colors.surface) : theme.colors.accentForeground, fontWeight: theme.fontWeights.bold }}>{confirmLabel}</UiText>}
        </Pressable>
      </View>
    </Dialog>
  );
}
