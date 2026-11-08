import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme';
import { IconButton } from './actions';

/** Standard screen header: back/menu on one side, title centered, actions on the other. */
export function AppHeader({
  title,
  onBack,
  trailing,
}: {
  title: string;
  onBack?: () => void;
  trailing?: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {onBack ? (
          <IconButton glyph="→" accessibilityLabel="رجوع" onPress={onBack} />
        ) : (
          <View style={{ width: 38 }} />
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>{trailing}</View>
      </View>
      <Text style={{ fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.bold, color: theme.colors.text }}>
        {title}
      </Text>
    </View>
  );
}

export type TabItem = { key: string; glyph: string; label: string; badge?: number };

/** Fixed bottom navigation bar with a lime active indicator. */
export function BottomTabs({
  items,
  activeKey,
  onChange,
}: {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.key)}
            style={{ alignItems: 'center', gap: 4, minWidth: 54 }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: active ? theme.colors.primary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 18, color: active ? theme.colors.onPrimary : theme.colors.textSecondary }}>
                {item.glyph}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 11,
                color: active ? theme.colors.text : theme.colors.textSecondary,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Two-to-four way switch, e.g. "المتجر / المراجعات / الأسئلة". */
export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.pill,
        padding: 4,
      }}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: theme.radius.pill,
              backgroundColor: active ? theme.colors.surface : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: active ? '600' : '400', fontSize: theme.typography.sizes.sm }}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
