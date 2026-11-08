import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { Card } from "./cards";
import { StatusBadge, type StatusBadgeTone } from "./extended";
import { Icon } from "./icon";
import { Text as UiText } from "./typography";

export function MerchantProfileCard(props: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Card {...props} />;
}

export function MerchantStoreCard(props: { children: ReactNode; media?: ReactNode; actions?: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  return <Card {...props} />;
}

export function MerchantStatusBadge({ label, tone }: { label: string; tone: StatusBadgeTone }) {
  return <StatusBadge label={label} tone={tone} />;
}

export function MerchantOrderCard(props: { children: ReactNode; actions?: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  return <Card {...props} />;
}

export function MerchantProductRow({ children, leading, trailing, style }: { children: ReactNode; leading?: ReactNode; trailing?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return <View style={[{ minHeight: 72, flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.md, paddingVertical: designTokens.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border }, style]}>{leading}<View style={{ flex: 1 }}>{children}</View>{trailing}</View>;
}

export function MerchantOnboardingStep({
  steps,
  style
}: {
  steps: Array<{ key: string; label: string; description?: string; status: "complete" | "current" | "upcoming"; icon?: ReactNode }>;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View style={[{ gap: designTokens.spacing.md }, style]}>
      {steps.map((step, index) => (
        <View key={step.key} style={{ flexDirection: "row-reverse", alignItems: "flex-start", gap: designTokens.spacing.md }}>
          <View style={{ width: theme.dimensions.avatarSize.md, height: theme.dimensions.avatarSize.md, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: step.status === "complete" ? theme.colors.successSurface : step.status === "current" ? theme.colors.accent : theme.colors.surfaceMuted }}>
            {step.icon ?? (step.status === "complete" ? <Icon name="check" size={theme.dimensions.iconSize.sm} color={theme.colors.success} accessibilityHidden /> : <UiText style={{ color: theme.colors.foreground, fontWeight: theme.fontWeights.extrabold }}>{index + 1}</UiText>)}
          </View>
          <View style={{ flex: 1, paddingTop: designTokens.spacing.xs, gap: designTokens.spacing.xs }}>
            <UiText style={{ color: theme.colors.foreground, fontSize: theme.typography.body, fontWeight: step.status === "current" ? "800" : "600", textAlign: "right" }}>{step.label}</UiText>
            {step.description ? <UiText style={{ color: theme.colors.muted, fontSize: theme.typography.caption, textAlign: "right" }}>{step.description}</UiText> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export function BusinessHours({
  rows,
  style
}: {
  rows: Array<{ key: string; dayLabel: string; hoursLabel: string }>;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View style={[{ gap: designTokens.spacing.sm }, style]}>
      {rows.map((row) => (
        <View key={row.key} style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md, paddingVertical: designTokens.spacing.xs, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
          <UiText style={{ color: theme.colors.foreground, fontSize: theme.typography.body }}>{row.dayLabel}</UiText>
          <UiText style={{ color: theme.colors.muted, fontSize: theme.typography.caption, fontVariant: ["tabular-nums"] }}>{row.hoursLabel}</UiText>
        </View>
      ))}
    </View>
  );
}

export function SalesSummary({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Card style={style}>{children}</Card>;
}
