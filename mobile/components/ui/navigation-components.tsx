import type { ComponentRef, ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { useEffect, useRef, useState } from "react";

import { designTokens, useAppTheme } from "@/lib/theme";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { registerCartFlyTarget } from "@/lib/cart-fly";
import { Text as UiText } from "./typography";

export type NavigationItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export function BackButton({
  onPress,
  children,
  accessibilityLabel,
  disabled = false,
  style
}: {
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [{ width: theme.dimensions.controlHeight.md, height: theme.dimensions.controlHeight.md, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

function NavigationTab({
  item,
  selected,
  onChange
}: {
  item: NavigationItem;
  selected: boolean;
  onChange: (key: string) => void;
}) {
  const theme = useAppTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const cartTargetRef = useRef<ComponentRef<typeof View>>(null);
  const wasSelected = useRef(selected);
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {
        if (active) setReduceMotion(true);
      });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const becameSelected = selected && !wasSelected.current;
    wasSelected.current = selected;
    if (!becameSelected) return;

    if (reduceMotion) {
      scale.setValue(1);
      return;
    }

    scale.setValue(0.88);
    const animation = Animated.spring(scale, {
      toValue: 1,
      damping: 9,
      stiffness: 240,
      mass: 0.65,
      useNativeDriver: true
    });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, scale, selected]);

  useEffect(() => {
    if (item.key !== "cart") return;

    return registerCartFlyTarget({
      measure: (onMeasured) => {
        cartTargetRef.current?.measureInWindow((x, y, width, height) => {
          onMeasured({ x, y, width, height });
        });
      },
      onArrive: () => {
        if (reduceMotion) {
          scale.setValue(1);
          return;
        }
        scale.setValue(1.14);
        Animated.spring(scale, {
          toValue: 1,
          damping: 8,
          stiffness: 260,
          mass: 0.6,
          useNativeDriver: true
        }).start();
      }
    });
  }, [item.key, reduceMotion, scale]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={item.label}
      accessibilityState={{ selected, disabled: item.disabled }}
      disabled={item.disabled}
      onPress={() => { triggerSelectionHaptic(); onChange(item.key); }}
      hitSlop={4}
      style={({ pressed }) => [
        {
          flex: 1,
          minWidth: 0,
          minHeight: theme.dimensions.controlHeight.lg,
          paddingHorizontal: designTokens.spacing.xs,
          alignItems: "center",
          justifyContent: "center",
          gap: designTokens.spacing.xs,
          opacity: item.disabled ? 0.45 : pressed ? 0.72 : 1
        }
      ]}
    >
      <View
        ref={cartTargetRef}
        collapsable={false}
        style={{
          minWidth: 44,
          minHeight: 32,
          paddingHorizontal: designTokens.spacing.md,
          borderRadius: theme.radius.pill,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          {item.icon}
        </Animated.View>
      </View>
      <UiText
        numberOfLines={1}
        style={{
          color: selected ? (theme.mode === "dark" ? theme.colors.accent : theme.colors.accentForeground) : theme.colors.muted,
          fontSize: theme.typography.caption,
          fontWeight: selected ? theme.fontWeights.bold : theme.fontWeights.regular,
          flexShrink: 1
        }}
      >
        {item.label}
      </UiText>
    </Pressable>
  );
}

export function BottomNavigation({
  items,
  value,
  onChange,
  accessibilityLabel,
  style
}: {
  items: NavigationItem[];
  value: string;
  onChange: (key: string) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: "row",
          justifyContent: "space-around",
          paddingVertical: designTokens.spacing.sm,
          backgroundColor: theme.colors.background
        },
        style
      ]}
    >
      {items.map((item) => (
        <NavigationTab
          key={item.key}
          item={item}
          selected={item.key === value}
          onChange={onChange}
        />
      ))}
    </View>
  );
}
