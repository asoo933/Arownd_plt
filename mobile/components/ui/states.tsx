import { ActivityIndicator, StyleSheet, View } from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { Text as UiText } from "./typography";
import { Button } from "./primitives";
import { Icon } from "./icon";

export function LoadingState({ label }: { label: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.state}>
      <ActivityIndicator color={theme.colors.accentMuted} />
      <UiText style={[styles.stateText, { color: theme.colors.muted }]}>{label}</UiText>
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.state}>
      <Icon name="search" size={30} color={theme.colors.accentMuted} accessibilityHidden />
      <UiText style={[styles.stateTitle, { color: theme.colors.foreground }]}>{title}</UiText>
      <UiText style={[styles.stateText, { color: theme.colors.muted }]}>{hint}</UiText>
    </View>
  );
}

export function ErrorState({ title, retryLabel, onRetry }: {
  title: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.state}>
      <UiText style={[styles.stateTitle, { color: theme.colors.foreground }]}>{title}</UiText>
      <Button label={retryLabel} onPress={onRetry} size="md" />
    </View>
  );
}

const styles = StyleSheet.create({
  state: { minHeight: 135, alignItems: "center", justifyContent: "center", gap: designTokens.spacing.md, padding: designTokens.spacing.xl },
  stateText: { fontSize: designTokens.typography.caption + 1, textAlign: "center" },
  stateTitle: { fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, textAlign: "center" }
});
