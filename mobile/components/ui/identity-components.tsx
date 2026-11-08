import type { ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { Avatar, type AvatarProps } from "./identity";

export function AvatarGroup({
  people,
  max = 4,
  size = 36,
  style
}: {
  people: AvatarProps[];
  max?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const visible = people.slice(0, max);
  const remaining = Math.max(0, people.length - visible.length);

  return (
    <View style={[{ flexDirection: "row-reverse", alignItems: "center" }, style]}>
      {visible.map((person, index) => (
        <Avatar key={person.imageUri ?? person.name + index} {...person} size={size} style={{ marginStart: index === 0 ? 0 : -size * 0.22, borderWidth: 2, borderColor: theme.colors.surface }} />
      ))}
      {remaining > 0 ? (
        <View style={{ width: size, height: size, marginStart: -size * 0.22, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceMuted, borderWidth: 2, borderColor: theme.colors.surface }}>
          <Text style={{ color: theme.colors.foreground, fontSize: theme.typography.caption, fontWeight: "700" }}>+{remaining}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function VerifiedBadge({ label, children }: { label: string; children?: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View accessibilityRole="text" accessibilityLabel={label} style={{ minHeight: 20, flexDirection: "row-reverse", alignItems: "center", gap: 4 }}>
      <View style={{ width: 16, height: 16, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: theme.colors.accentForeground, fontSize: 10, fontWeight: "900" }}>✓</Text>
      </View>
      {children}
    </View>
  );
}

export function RatingStars({
  value,
  count = 5,
  size = 18,
  showValue = false,
  style
}: {
  value: number;
  count?: number;
  size?: number;
  showValue?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const normalized = Math.min(count, Math.max(0, value));
  return (
    <View accessibilityRole="image" accessibilityLabel={String(value)} style={[{ flexDirection: "row", alignItems: "center", gap: 2 }, style]}>
      {Array.from({ length: count }, (_, index) => (
        <Text key={index} style={{ fontSize: size, color: index < Math.round(normalized) ? theme.colors.warning : theme.colors.border }}>★</Text>
      ))}
      {showValue ? <Text style={{ marginStart: designTokens.spacing.xs, color: theme.colors.muted, fontSize: theme.typography.caption }}>{value.toFixed(1)}</Text> : null}
    </View>
  );
}

export function RatingSelector({
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
  size = 36
}: {
  value: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  size?: number;
}) {
  const theme = useAppTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={{ flexDirection: "row", gap: designTokens.spacing.xs }}>
      {Array.from({ length: 5 }, (_, index) => {
        const rating = index + 1;
        const selected = rating <= value;
        return (
          <Pressable key={rating} accessibilityRole="radio" accessibilityLabel={String(rating)} accessibilityState={{ checked: value === rating, disabled }} disabled={disabled} onPress={() => onChange(rating)} hitSlop={4} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: size * 0.72, color: selected ? theme.colors.warning : theme.colors.border }}>★</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ReviewCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return <View style={[{ padding: designTokens.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: designTokens.spacing.sm }, style]}>{children}</View>;
}

export function ReviewList({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap: 0 }, style]}>{children}</View>;
}

export function UserProfileCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return <View style={[{ padding: designTokens.spacing.lg, borderRadius: theme.radius.xl, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: designTokens.spacing.md }, style]}>{children}</View>;
}
