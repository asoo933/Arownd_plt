import { Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useAppTheme } from "@/lib/theme";
import { Surface } from "./primitives";

export type MetricTrend = {
  label: string;
  positive: boolean;
};

export function MerchantMetricCard({
  label,
  value,
  trend,
  valueTone = "default",
  style
}: {
  label: string;
  value: string;
  trend?: MetricTrend;
  valueTone?: "default" | "success" | "warning" | "danger" | "accent";
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
      <Text style={{ color: theme.colors.muted, fontSize: theme.typography.caption + 1, textAlign: "right" }}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ color: valueColor, fontSize: theme.typography.title, fontWeight: "800", textAlign: "right" }}
      >
        {value}
      </Text>
      {trend ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
          <Text style={{ color: trend.positive ? theme.colors.success : theme.colors.danger, fontSize: theme.typography.caption, fontWeight: "700" }}>
            {trend.positive ? "▲" : "▼"}
          </Text>
          <Text style={{ color: trend.positive ? theme.colors.success : theme.colors.danger, fontSize: theme.typography.caption }}>
            {trend.label}
          </Text>
        </View>
      ) : null}
    </Surface>
  );
}
