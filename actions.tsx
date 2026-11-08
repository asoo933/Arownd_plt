import React, { useState } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

/** The one button every screen should reach for first. Pill-shaped, brand-led. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const pad = { sm: 10, md: 14, lg: 18 }[size];
  const font = { sm: theme.typography.sizes.sm, md: theme.typography.sizes.base, lg: theme.typography.sizes.md }[size];

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.colors.primary, fg: theme.colors.onPrimary },
    outline: { bg: 'transparent', fg: theme.colors.text, border: theme.colors.primary },
    ghost: { bg: 'transparent', fg: theme.colors.text },
    danger: { bg: theme.colors.error, fg: '#FFFFFF' },
  };
  const p = palette[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? 1.5 : 0,
          borderRadius: theme.radius.pill,
          paddingVertical: pad,
          paddingHorizontal: pad * 2,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <Text style={{ color: p.fg, fontSize: font, fontWeight: theme.typography.weights.semibold }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Circular icon-only button, used for back/close/share/cart glyphs in headers. */
export function IconButton({
  glyph,
  onPress,
  accessibilityLabel,
  variant = 'default',
  badge,
  size = 38,
}: {
  glyph: string;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: 'default' | 'primary' | 'selected';
  badge?: number;
  size?: number;
}) {
  const { theme } = useTheme();
  const bg =
    variant === 'primary' ? theme.colors.primary : variant === 'selected' ? '#FACAFF' : theme.colors.surface;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        borderWidth: variant === 'default' ? 1 : 0,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ fontSize: size * 0.42, color: theme.colors.text }}>{glyph}</Text>
      {!!badge && badge > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -4,
            end: -4,
            minWidth: 17,
            height: 17,
            borderRadius: 9,
            backgroundColor: theme.colors.error,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 10, fontWeight: theme.typography.weights.bold }}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Bottom-corner action, e.g. "scan to pay" or "chat with store" while browsing. */
export function FloatingActionButton({
  glyph,
  onPress,
  accessibilityLabel,
}: {
  glyph: string;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        bottom: 24,
        end: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Text style={{ fontSize: 22, color: theme.colors.onPrimary }}>{glyph}</Text>
    </Pressable>
  );
}

/** A labelled toggle — on/off state with a check mark, used for filters and pick lists. */
export function ToggleButton({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: (next: boolean) => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={() => onToggle(!selected)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: selected ? '#FACAFF' : theme.colors.border,
        backgroundColor: selected ? '#FACAFF' : 'transparent',
        borderRadius: theme.radius.pill,
        paddingVertical: 10,
        paddingHorizontal: 14,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: selected ? '#111' : theme.colors.border,
          backgroundColor: selected ? '#111' : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text>}
      </View>
      <Text style={{ color: theme.colors.text, fontSize: theme.typography.sizes.base }}>{label}</Text>
    </Pressable>
  );
}

/** Segmented group of equal-weight buttons, e.g. confirm/cancel pairs. */
export function ButtonGroup({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', gap, flexWrap: 'wrap' }}>{children}</View>;
}
