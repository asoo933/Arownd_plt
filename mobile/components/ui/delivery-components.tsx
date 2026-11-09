import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Text as UiText } from "./typography";

import { designTokens, useAppTheme } from "@/lib/theme";
import { Card } from "./cards";
import { StatusBadge, type StatusBadgeTone } from "./extended";
import { Icon } from "./icon";

export function DeliveryOrderCard(props: { children: ReactNode; actions?: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  return <Card {...props} />;
}

export function DeliveryPartnerCard(props: { children: ReactNode; actions?: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  return <Card {...props} />;
}

export function DeliveryStatusBadge({ label, tone }: { label: string; tone: StatusBadgeTone }) {
  return <StatusBadge label={label} tone={tone} />;
}

export function DeliveryMetricCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Card style={style}>{children}</Card>;
}

export type TrackingStepItem = {
  key: string;
  title: string;
  description?: string;
  status: "complete" | "current" | "upcoming";
  icon?: ReactNode;
};

export function TrackingStep({ step, isLast = false }: { step: TrackingStepItem; isLast?: boolean }) {
  const theme = useAppTheme();
  const active = step.status !== "upcoming";
  return (
    <View style={{ flexDirection: "row", gap: designTokens.spacing.md, minHeight: isLast ? 44 : 68 }}>
      <View style={{ alignItems: "center", width: theme.dimensions.avatarSize.md }}>
        <View style={{ width: theme.dimensions.avatarSize.md, height: theme.dimensions.avatarSize.md, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: step.status === "complete" ? theme.colors.successSurface : step.status === "current" ? theme.colors.accent : theme.colors.surfaceMuted }}>
          {step.icon ?? (step.status === "complete" ? <Icon name="check" size={theme.dimensions.iconSize.xs + 2} color={theme.colors.success} accessibilityHidden /> : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: active ? theme.colors.foreground : theme.colors.muted }} />)}
        </View>
        {!isLast ? <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: step.status === "complete" ? theme.colors.success : theme.colors.border }} /> : null}
      </View>
      <View style={{ flex: 1, paddingTop: designTokens.spacing.xs, gap: designTokens.spacing.xs }}>
        <UiText style={{ color: theme.colors.foreground, fontSize: theme.typography.body, fontWeight: step.status === "current" ? "800" : "600", textAlign: "auto" }}>{step.title}</UiText>
        {step.description ? <UiText style={{ color: theme.colors.muted, fontSize: theme.typography.caption, textAlign: "auto" }}>{step.description}</UiText> : null}
      </View>
    </View>
  );
}

export function TrackingTimeline({ steps, style }: { steps: TrackingStepItem[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 0 }, style]}>
      {steps.map((step, index) => <TrackingStep key={step.key} step={step} isLast={index === steps.length - 1} />)}
    </View>
  );
}

export function DeliveryAddressCard(props: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Card {...props} />;
}

export function DeliveryRouteCard(props: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Card {...props} />;
}
