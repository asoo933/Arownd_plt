import { View, type StyleProp, type ViewStyle } from "react-native";
import { Text as UiText } from "./typography";

import { useAppTheme } from "@/lib/theme";
import { Surface } from "./primitives";
import { Icon } from "./icon";

export type MetricTrend = {
  label: string;
  positive: boolean;
};

export function MerchantMetricCard({
  label,
  value,
  trend,
  valueTone = "default",
  hint,
  style
}: {
  label: string;
  value: string;
  trend?: MetricTrend;
  valueTone?: "default" | "success" | "warning" | "danger" | "accent";
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const valueColor = {
    default: theme.colors.foreground,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
    accent: theme.colors.accentMuted
  }[valueTone];

  return (
    <Surface style={[{ flex: 1, gap: theme.spacing.sm }, style]}>
      <UiText style={{ color: theme.colors.muted, fontSize: theme.typography.caption + 1, textAlign: "auto" }}>
        {label}
      </UiText>
      <UiText
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ color: valueColor, fontSize: theme.typography.title, fontWeight: theme.fontWeights.extrabold, textAlign: "auto" }}
      >
        {value}
      </UiText>
      {hint ? (
        <UiText style={{ color: theme.colors.subtle, fontSize: theme.typography.caption, textAlign: "auto" }}>
          {hint}
        </UiText>
      ) : null}
      {trend ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
          <Icon name={trend.positive ? "arrow-up" : "arrow-down"} size={14} color={trend.positive ? theme.colors.success : theme.colors.danger} accessibilityHidden />
          <UiText style={{ color: trend.positive ? theme.colors.success : theme.colors.danger, fontSize: theme.typography.caption }}>
            {trend.label}
          </UiText>
        </View>
      ) : null}
    </Surface>
  );
}
