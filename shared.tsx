import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../theme';

/** Generic row: leading element, title/subtitle, trailing element. Base for settings & lists. */
export function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {leading}
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontSize: theme.typography.sizes.base }}>{title}</Text>
        {!!subtitle && <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.xs }}>{subtitle}</Text>}
      </View>
      {trailing}
    </Pressable>
  );
}

/** Title + optional "see all" action, used above horizontal rails and lists. */
export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.bold, color: theme.colors.text }}>
        {title}
      </Text>
      {!!actionLabel && (
        <Text onPress={onAction} style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sizes.sm }}>
          {actionLabel}
        </Text>
      )}
    </View>
  );
}

/** Horizontally scrollable, single-select filter row (categories, sort options). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress?: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: selected ? '#FACAFF' : theme.colors.border,
        backgroundColor: selected ? '#FACAFF' : 'transparent',
        borderRadius: theme.radius.pill,
        paddingVertical: 8,
        paddingHorizontal: 16,
      }}
    >
      <Text style={{ color: selected ? '#111' : theme.colors.text, fontSize: theme.typography.sizes.sm }}>{label}</Text>
    </Pressable>
  );
}

/** Small static label, e.g. "جديد" or a category name on a card. */
export function Tag({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: theme.radius.pill,
        paddingVertical: 3,
        paddingHorizontal: 10,
        backgroundColor: theme.colors.primary,
      }}
    >
      <Text style={{ fontSize: 11, color: theme.colors.onPrimary, fontWeight: theme.typography.weights.semibold }}>{label}</Text>
    </View>
  );
}

/** Numeric page control for long product/order lists. */
export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <Pressable disabled={page <= 1} onPress={() => onChange(page - 1)}>
        <Text style={{ color: page <= 1 ? theme.colors.border : theme.colors.text }}>⟨</Text>
      </Pressable>
      {Array.from({ length: pageCount }, (_, i) => i + 1)
        .filter((n) => Math.abs(n - page) <= 1 || n === 1 || n === pageCount)
        .map((n) => (
          <Pressable key={n} onPress={() => onChange(n)}>
            <Text
              style={{
                color: n === page ? theme.colors.onPrimary : theme.colors.text,
                backgroundColor: n === page ? theme.colors.primary : 'transparent',
                borderRadius: 999,
                width: 26,
                height: 26,
                textAlign: 'center',
                lineHeight: 26,
                overflow: 'hidden',
                fontSize: 13,
              }}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      <Pressable disabled={page >= pageCount} onPress={() => onChange(page + 1)}>
        <Text style={{ color: page >= pageCount ? theme.colors.border : theme.colors.text }}>⟩</Text>
      </Pressable>
    </View>
  );
}
