import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { Select, type SelectOption } from "./forms";
import { SegmentedControl, type SegmentedOption } from "./navigation";

export function List({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={style}>{children}</View>;
}

export function ListItem({
  children,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  style
}: {
  children: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const content = <View style={[{ minHeight: 56, flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.md, paddingVertical: designTokens.spacing.sm }, style]}>{leading}<View style={{ flex: 1 }}>{children}</View>{trailing}</View>;
  if (!onPress) return content;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => ({ borderBottomWidth: 1, borderBottomColor: theme.colors.border, opacity: pressed ? 0.72 : 1 })}>{content}</Pressable>;
}

export type DataTableColumn<Row extends object> = {
  key: keyof Row;
  header: ReactNode;
  render?: (row: Row) => ReactNode;
  width?: number;
};

export function DataTable<Row extends object>({
  columns,
  rows,
  keyExtractor,
  style
}: {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  keyExtractor: (row: Row, index: number) => string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style}>
      <View>
        <View style={{ flexDirection: "row-reverse", borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
          {columns.map((column) => <View key={String(column.key)} style={{ width: column.width ?? 120, padding: designTokens.spacing.sm }}><View>{typeof column.header === "string" ? <Text style={{ color: theme.colors.muted, fontSize: theme.typography.caption, fontWeight: "700", textAlign: "right" }}>{column.header}</Text> : column.header}</View></View>)}
        </View>
        {rows.map((row, index) => (
          <View key={keyExtractor(row, index)} style={{ flexDirection: "row-reverse", borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            {columns.map((column) => <View key={String(column.key)} style={{ width: column.width ?? 120, minHeight: 44, justifyContent: "center", padding: designTokens.spacing.sm }}>{column.render ? column.render(row) : <Text style={{ color: theme.colors.foreground, fontSize: theme.typography.caption, textAlign: "right" }}>{String(row[column.key] ?? "")}</Text>}</View>)}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function StatCard({ label, value, hint, style }: { label: string; value: string; hint?: string; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return <View style={[{ flex: 1, minWidth: 112, padding: designTokens.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surface, gap: designTokens.spacing.xs }, style]}><Text style={{ color: theme.colors.muted, fontSize: theme.typography.caption, textAlign: "right" }}>{label}</Text><Text adjustsFontSizeToFit numberOfLines={1} style={{ color: theme.colors.foreground, fontSize: theme.typography.title, fontWeight: "800", textAlign: "right" }}>{value}</Text>{hint ? <Text style={{ color: theme.colors.muted, fontSize: theme.typography.caption, textAlign: "right" }}>{hint}</Text> : null}</View>;
}

export function ChartCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return <View style={[{ padding: designTokens.spacing.md, borderRadius: theme.radius.xl, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, gap: designTokens.spacing.md }, style]}>{children}</View>;
}

export function Carousel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ flexDirection: "row-reverse", gap: designTokens.spacing.md }, style]}>{children}</ScrollView>;
}

export function HorizontalList({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Carousel style={style}>{children}</Carousel>;
}

export function FilterChip({
  label,
  selected,
  onPress,
  leading,
  disabled = false
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  leading?: ReactNode;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [{ minHeight: 40, flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.xs, paddingHorizontal: designTokens.spacing.md, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: selected ? theme.colors.accentMuted : theme.colors.border, backgroundColor: selected ? theme.colors.accent : theme.colors.surface, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 }]}>
      {leading}
      <Text style={{ color: selected ? theme.colors.accentForeground : theme.colors.foreground, fontSize: theme.typography.caption + 1 }}>{label}</Text>
    </Pressable>
  );
}

export function FilterBar({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.sm }, style]}>{children}</ScrollView>;
}

export function SortSelector({
  options,
  value,
  onChange,
  placeholder,
  accessibilityLabel,
  style
}: {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  return <Select options={options} value={value} onChange={onChange} placeholder={placeholder} accessibilityLabel={accessibilityLabel} style={style} />;
}

export function ViewToggle({
  options,
  value,
  onChange,
  accessibilityLabel,
  style
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  return <SegmentedControl options={options} value={value} onChange={onChange} accessibilityLabel={accessibilityLabel} style={style} />;
}

export function Pagination({
  page,
  pageCount,
  onChange,
  accessibilityLabel,
  previousLabel,
  nextLabel,
  style
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  accessibilityLabel: string;
  previousLabel: string;
  nextLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const safeCount = Math.max(1, Math.floor(pageCount));
  const safePage = Math.min(safeCount, Math.max(1, Math.floor(page)));
  return (
    <View accessibilityRole="adjustable" accessibilityLabel={accessibilityLabel} style={[{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: designTokens.spacing.sm }, style]}>
      <Pressable accessibilityRole="button" accessibilityLabel={previousLabel} accessibilityState={{ disabled: safePage <= 1 }} disabled={safePage <= 1} onPress={() => onChange(safePage - 1)} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Text style={{ color: theme.colors.foreground }}>‹</Text></Pressable>
      <Text style={{ color: theme.colors.foreground, fontSize: theme.typography.body, fontVariant: ["tabular-nums"] }}>{safePage} / {safeCount}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={nextLabel} accessibilityState={{ disabled: safePage >= safeCount }} disabled={safePage >= safeCount} onPress={() => onChange(safePage + 1)} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Text style={{ color: theme.colors.foreground }}>›</Text></Pressable>
    </View>
  );
}
