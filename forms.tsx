import React, { useState } from 'react';
import { View, TextInput, Text, Pressable, Animated } from 'react-native';
import { useTheme } from '../theme';

/** Pill text field with an optional leading glyph, used for every plain text entry. */
export function Input({
  placeholder,
  value,
  onChangeText,
  glyph,
  secureTextEntry,
  keyboardType,
  error,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  glyph?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  error?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ width: '100%', gap: 6 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderWidth: 1,
          borderColor: error ? theme.colors.error : theme.colors.border,
          borderRadius: theme.radius.pill,
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: theme.colors.surface,
        }}
      >
        {glyph && <Text style={{ color: theme.colors.textSecondary }}>{glyph}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          style={{ flex: 1, color: theme.colors.text, fontSize: theme.typography.sizes.base, textAlign: 'right' }}
        />
      </View>
      {!!error && <Text style={{ color: theme.colors.error, fontSize: theme.typography.sizes.xs }}>{error}</Text>}
    </View>
  );
}

/** Search field for products or stores. */
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'ابحث عن منتج أو متجر',
  onSubmit,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.pill,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Text style={{ color: theme.colors.textSecondary }}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        style={{ flex: 1, color: theme.colors.text, fontSize: theme.typography.sizes.base, textAlign: 'right' }}
      />
    </View>
  );
}

/** Square checkbox with brand-colored checked state. */
export function Checkbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: (next: boolean) => void;
  label?: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onToggle(!checked)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: checked ? theme.colors.primary : theme.colors.border,
          backgroundColor: checked ? theme.colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Text style={{ color: theme.colors.onPrimary, fontSize: 12, fontWeight: '700' }}>✓</Text>}
      </View>
      {!!label && <Text style={{ color: theme.colors.text, fontSize: theme.typography.sizes.base }}>{label}</Text>}
    </Pressable>
  );
}

/** Brand-colored toggle switch (settings, notification preferences). */
export function Switch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const { theme } = useTheme();
  const anim = React.useRef(new Animated.Value(value ? 1 : 0)).current;
  React.useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 150, useNativeDriver: false }).start();
  }, [value]);
  const translate = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 20] });
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        padding: 2,
        backgroundColor: value ? theme.colors.primary : theme.colors.border,
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: '#fff',
          transform: [{ translateX: translate }],
        }}
      />
    </Pressable>
  );
}

/** Stepper for cart line-item quantity. */
export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  const { theme } = useTheme();
  const btn = (glyph: string, onPress: () => void, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text style={{ fontSize: 16, color: theme.colors.text }}>{glyph}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {btn('−', () => onChange(Math.max(min, value - 1)), value <= min)}
      <Text style={{ minWidth: 20, textAlign: 'center', fontSize: theme.typography.sizes.base, color: theme.colors.text }}>
        {value}
      </Text>
      {btn('+', () => onChange(Math.min(max, value + 1)), value >= max)}
    </View>
  );
}
