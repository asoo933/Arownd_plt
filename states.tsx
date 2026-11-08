import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useTheme } from '../theme';
import { Button } from './actions';

/** Pulsing placeholder block used while real content loads. */
export function Skeleton({ width = '100%', height = 16, radius = 8 }: { width?: number | string; height?: number; radius?: number }) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={{ width: width as any, height, borderRadius: radius, backgroundColor: theme.colors.surfaceAlt, opacity }}
    />
  );
}

/** Centered illustration slot + message for "nothing here yet" screens. */
export function EmptyState({
  glyph = '🛍',
  title,
  description,
  actionLabel,
  onAction,
}: {
  glyph?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10, padding: 32 }}>
      <Text style={{ fontSize: 40 }}>{glyph}</Text>
      <Text style={{ fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.semibold, color: theme.colors.text }}>
        {title}
      </Text>
      {!!description && (
        <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>{description}</Text>
      )}
      {!!actionLabel && <Button label={actionLabel} onPress={onAction} />}
    </View>
  );
}

/** Same shape as EmptyState, for request failures — explains what happened and offers retry. */
export function ErrorState({
  title = 'تعذّر تحميل المحتوى',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 10, padding: 32 }}>
      <Text style={{ fontSize: 40 }}>⚠</Text>
      <Text style={{ fontSize: theme.typography.sizes.md, fontWeight: theme.typography.weights.semibold, color: theme.colors.text }}>
        {title}
      </Text>
      {!!description && <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>{description}</Text>}
      {!!onRetry && <Button label="إعادة المحاولة" variant="outline" onPress={onRetry} />}
    </View>
  );
}
