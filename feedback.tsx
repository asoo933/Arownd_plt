import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Modal, Pressable } from 'react-native';
import { useTheme } from '../theme';

/** Auto-dismissing toast, anchored to the bottom of the screen. */
export function Toast({
  message,
  visible,
  tone = 'default',
  onHide,
  duration = 2200,
}: {
  message: string;
  visible: boolean;
  tone?: 'default' | 'success' | 'error';
  onHide?: () => void;
  duration?: number;
}) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => onHide?.());
    }, duration);
    return () => clearTimeout(t);
  }, [visible]);
  if (!visible) return null;
  const bg = tone === 'success' ? theme.colors.success : tone === 'error' ? theme.colors.error : theme.colors.surface;
  const fg = tone === 'default' ? theme.colors.text : '#fff';
  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 32,
        alignSelf: 'center',
        backgroundColor: bg,
        borderRadius: theme.radius.pill,
        paddingVertical: 10,
        paddingHorizontal: 20,
        opacity,
      }}
    >
      <Text style={{ color: fg }}>{message}</Text>
    </Animated.View>
  );
}

/** Small status pill — order state, stock state, generic label. */
export function Badge({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'error' | 'primary';
}) {
  const { theme } = useTheme();
  const bg = {
    default: theme.colors.surfaceAlt,
    success: '#DCFCE7',
    warning: '#FEF3C7',
    error: '#FEE2E2',
    primary: theme.colors.primary,
  }[tone];
  const fg = {
    default: theme.colors.textSecondary,
    success: theme.colors.success,
    warning: '#92610A',
    error: theme.colors.error,
    primary: theme.colors.onPrimary,
  }[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: theme.radius.pill, paddingVertical: 3, paddingHorizontal: 10, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: theme.typography.sizes.xs, fontWeight: theme.typography.weights.semibold }}>{label}</Text>
    </View>
  );
}

/** Slim progress bar — delivery %, upload %, goal completion. */
export function ProgressBar({ progress, color }: { progress: number; color?: string }) {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ height: 5, borderRadius: 9, backgroundColor: theme.colors.border, overflow: 'hidden', width: '100%' }}>
      <View style={{ height: '100%', width: `${pct * 100}%`, backgroundColor: color ?? theme.colors.primary }} />
    </View>
  );
}

/** Modal sheet that slides up from the bottom — filters, details, confirmations. */
export function BottomSheet({
  visible,
  onClose,
  children,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  title?: string;
}) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: 20,
          paddingBottom: 32,
          gap: 16,
        }}
      >
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center' }} />
        {!!title && (
          <Text style={{ fontSize: theme.typography.sizes.lg, fontWeight: theme.typography.weights.bold, color: theme.colors.text }}>
            {title}
          </Text>
        )}
        {children}
      </View>
    </Modal>
  );
}
