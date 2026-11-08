import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/lib/theme";

export type ToastTone = "neutral" | "success" | "danger";

export function Toast({
  message,
  visible,
  tone = "neutral",
  duration = 2200,
  onHide
}: {
  message: string;
  visible: boolean;
  tone?: ToastTone;
  duration?: number;
  onHide: () => void;
}) {
  const theme = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      return;
    }

    const showAnimation = Animated.timing(opacity, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true
    });
    showAnimation.start();

    const timeout = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true
      }).start(({ finished }) => {
        if (finished) onHide();
      });
    }, Math.max(0, duration));

    return () => {
      clearTimeout(timeout);
      showAnimation.stop();
      opacity.stopAnimation();
    };
  }, [duration, onHide, opacity, visible]);

  if (!visible) return null;

  const palette = {
    neutral: { backgroundColor: theme.colors.foreground, color: theme.colors.background },
    success: { backgroundColor: theme.colors.successSurface, color: theme.colors.success },
    danger: { backgroundColor: theme.colors.dangerSurface, color: theme.colors.danger }
  } satisfies Record<ToastTone, { backgroundColor: string; color: string }>;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        {
          bottom: theme.spacing.xl,
          backgroundColor: palette[tone].backgroundColor,
          opacity
        }
      ]}
    >
      <Text style={{ color: palette[tone].color, fontSize: theme.typography.body, fontWeight: "600", textAlign: "center" }}>
        {message}
      </Text>
    </Animated.View>
  );
}

export function BottomSheet({
  visible,
  title,
  onClose,
  children
}: {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const theme = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.sheetRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay }]}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              padding: theme.spacing.lg,
              paddingBottom: theme.spacing.xxl
            }
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          {title ? (
            <Text style={{ color: theme.colors.foreground, fontSize: theme.typography.title, fontWeight: "700", textAlign: "right" }}>
              {title}
            </Text>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "90%",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    elevation: 6
  },
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  sheet: {
    width: "100%",
    gap: 16
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: "center"
  }
});
