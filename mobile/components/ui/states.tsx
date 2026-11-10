import { ActivityIndicator, StyleSheet, View } from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { Text as UiText } from "./typography";
import { Button } from "./primitives";
import { Icon, type IconName } from "./icon";

export function LoadingState({ label }: { label: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.state} accessibilityState={{ busy: true }}>
      <ActivityIndicator color={theme.colors.accentMuted} />
      <UiText style={[styles.stateText, { color: theme.colors.muted }]}>{label}</UiText>
    </View>
  );
}

export function EmptyState({
  title,
  hint,
  icon = "search",
  actionLabel,
  onAction
}: {
  title: string;
  hint?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.state}>
      <Icon name={icon} size={30} color={theme.colors.accentMuted} accessibilityHidden />
      <UiText style={[styles.stateTitle, { color: theme.colors.foreground }]}>{title}</UiText>
      {hint ? <UiText style={[styles.stateText, { color: theme.colors.muted }]}>{hint}</UiText> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="sm" style={styles.stateAction} />
      ) : null}
    </View>
  );
}

export function ErrorState({
  title,
  hint,
  retryLabel,
  onRetry,
  busy = false
}: {
  title: string;
  hint?: string;
  retryLabel: string;
  onRetry: () => void;
  busy?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.state}>
      <Icon name="triangle-alert" size={28} color={theme.colors.danger} accessibilityHidden />
      <UiText style={[styles.stateTitle, { color: theme.colors.foreground }]}>{title}</UiText>
      {hint ? <UiText style={[styles.stateText, { color: theme.colors.muted }]}>{hint}</UiText> : null}
      <Button label={retryLabel} onPress={onRetry} size="md" loading={busy} style={styles.stateAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  state: { minHeight: 135, alignItems: "center", justifyContent: "center", gap: designTokens.spacing.md, padding: designTokens.spacing.xl },
  stateText: { fontSize: designTokens.typography.caption + 1, textAlign: "center", lineHeight: designTokens.typography.caption + 7 },
  stateTitle: { fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, textAlign: "center" },
  stateAction: { marginTop: designTokens.spacing.xs }
});
