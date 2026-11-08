import React from 'react';
import { View, Text, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme';

/** Flat separator line, themed to the current border color. */
export function Divider({
  style,
  vertical = false,
}: {
  style?: StyleProp<ViewStyle>;
  vertical?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        vertical
          ? { width: StyleSheetHairline, alignSelf: 'stretch' }
          : { height: StyleSheetHairline, alignSelf: 'stretch' },
        { backgroundColor: theme.colors.border },
        style,
      ]}
    />
  );
}
const StyleSheetHairline = 1;

/** A themed card surface: the base for every card-like component in the library. */
export function Surface({
  children,
  style,
  elevated = true,
  radius = 'lg',
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  radius?: 'sm' | 'md' | 'lg' | 'pill';
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius[radius],
          padding: theme.spacing.md,
        },
        elevated && {
          shadowColor: '#000',
          shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Page-level padding wrapper that respects the theme background. */
export function Container({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Thin wrapper so every component in this library references icons the same way.
 * Wire `name` to your icon set of choice (e.g. lucide-react-native, react-native-vector-icons).
 * Ships here as a text fallback so the library has zero hard icon dependency.
 */
export function Icon({
  name,
  glyph,
  size = 20,
  color,
}: {
  name: string;
  glyph?: string;
  size?: number;
  color?: string;
}) {
  const { theme } = useTheme();
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ fontSize: size, color: color ?? theme.colors.text, textAlign: 'center' }}
    >
      {glyph ?? '•'}
    </Text>
  );
}
