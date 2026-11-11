import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import { designTokens, useAppTheme } from "@/lib/theme";
import { triggerSelectionHaptic } from "@/lib/haptics";
import { useLanguage } from "@/lib/i18n";
import { Icon as UiIcon } from "./icon";
import { Text as UiText } from "./typography";
import { getQuantityStepState } from "./form-controls-state";

type TextFieldProps = Omit<TextInputProps, "style" | "textAlign"> & {
  textAlign?: TextInputProps["textAlign"] | "auto" | undefined;
  label?: string | undefined;
  error?: string | undefined;
  style?: StyleProp<TextStyle> | undefined;
  containerStyle?: StyleProp<ViewStyle> | undefined;
};

export function TextField({ label, error, style, containerStyle, accessibilityLabel, textAlign, onFocus, onBlur, secureTextEntry, editable = true, ...props }: TextFieldProps) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const shake = useRef(new Animated.Value(0)).current;
  const labelProgress = useRef(new Animated.Value(props.value || props.defaultValue ? 1 : 0)).current;
  const hasValue = String(props.value ?? props.defaultValue ?? "").length > 0;
  const isLabelFloating = focused || hasValue;
  const previousError = useRef<string | undefined>(undefined);
  const shakeAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const { language } = useLanguage();

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
    const animation = Animated.timing(labelProgress, {
      toValue: isLabelFloating ? 1 : 0,
      duration: reduceMotion ? 0 : 150,
      useNativeDriver: false
    });
    animation.start();
    return () => animation.stop();
  }, [isLabelFloating, labelProgress, reduceMotion]);

  useEffect(() => {
    const hasNewError = Boolean(error) && error !== previousError.current;
    previousError.current = error;
    if (!hasNewError) return;

    shakeAnimation.current?.stop();
    shake.setValue(0);
    if (reduceMotion) return;

    shakeAnimation.current = Animated.sequence([
      Animated.timing(shake, { toValue: -5, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 5, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -3, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 3, duration: 40, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 35, useNativeDriver: true })
    ]);
    shakeAnimation.current.start();
    return () => shakeAnimation.current?.stop();
  }, [error, reduceMotion, shake]);

  return (
    <Animated.View style={[styles.field, containerStyle, { transform: [{ translateX: shake }] }]}>
      <View style={styles.inputContainer}>
        {label ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.floatingLabel,
              {
                backgroundColor: theme.colors.surface,
                transform: [
                  { translateY: labelProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -designTokens.spacing.lg] }) },
                  { scale: labelProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }) }
                ],
                opacity: labelProgress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })
              }
            ]}
          >
            <UiText numberOfLines={1} style={[styles.fieldLabel, { color: error ? theme.colors.danger : focused ? theme.colors.focus : theme.colors.muted }]}>{label}</UiText>
          </Animated.View>
        ) : null}
        <TextInput
          {...props}
          editable={editable}
          secureTextEntry={Boolean(secureTextEntry) && !passwordVisible}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          textAlign={textAlign === "auto" ? "start" : textAlign}
          accessibilityLabel={accessibilityLabel ?? label}
          placeholder={label && !isLabelFloating ? undefined : props.placeholder}
          placeholderTextColor={props.placeholderTextColor ?? theme.colors.placeholder}
          style={[
            styles.textInput,
            label ? styles.textInputWithLabel : null,
            {
              backgroundColor: theme.colors.surface,
              borderColor: error ? theme.colors.danger : focused ? theme.colors.focus : theme.colors.inputBorder,
              color: theme.colors.foreground,
              fontFamily: language === "ar" ? theme.fontFamilies.arabic : theme.fontFamilies.latin
            },
            style,
            secureTextEntry ? styles.textInputWithPasswordToggle : null
          ]}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === "ar" ? (passwordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور") : (passwordVisible ? "Hide password" : "Show password")}
            accessibilityState={{ disabled: !editable, selected: passwordVisible }}
            disabled={!editable}
            hitSlop={10}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.passwordVisibilityToggle}
          >
            <UiIcon
              name={passwordVisible ? "eye-off" : "eye"}
              size={designTokens.dimensions.iconSize.md}
              color={theme.colors.muted}
              accessibilityHidden
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <UiText accessibilityRole="alert" style={[styles.fieldError, { color: theme.mode === "light" ? theme.colors.dangerText : theme.colors.danger }]}>{error}</UiText> : null}
    </Animated.View>
  );
}

type QuantityStepperProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  disabled?: boolean | undefined;
  testID?: string | undefined;
};

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
  disabled = false,
  testID
}: QuantityStepperProps) {
  const theme = useAppTheme();
  const state = getQuantityStepState(value, min, max);
  const buttonStyle = { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.inputBorder };

  return (
    <View style={styles.stepper} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel}
        accessibilityState={{ disabled: disabled || !state.canDecrease }}
        disabled={disabled || !state.canDecrease}
        onPress={() => { triggerSelectionHaptic(); onChange(value - 1); }}
        hitSlop={6}
        style={({ pressed }) => [styles.stepButton, buttonStyle, { opacity: disabled || !state.canDecrease ? 0.4 : pressed ? 0.7 : 1 }]}
      >
        <UiText style={[styles.stepSymbol, { color: theme.colors.foreground }]}>−</UiText>
      </Pressable>
      <UiText accessibilityLiveRegion="polite" style={[styles.quantity, { color: theme.colors.foreground }]}>{value}</UiText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={increaseLabel}
        accessibilityState={{ disabled: disabled || !state.canIncrease }}
        disabled={disabled || !state.canIncrease}
        onPress={() => { triggerSelectionHaptic(); onChange(value + 1); }}
        hitSlop={6}
        style={({ pressed }) => [styles.stepButton, buttonStyle, { opacity: disabled || !state.canIncrease ? 0.4 : pressed ? 0.7 : 1 }]}
      >
        <UiText style={[styles.stepSymbol, { color: theme.colors.foreground }]}>+</UiText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: designTokens.spacing.xs },
  inputContainer: { position: "relative", justifyContent: "center" },
  floatingLabel: { position: "absolute", zIndex: 1, start: designTokens.spacing.lg, top: designTokens.spacing.lg, maxWidth: "82%", paddingHorizontal: 3 },
  fieldLabel: { fontSize: designTokens.typography.caption + 2, fontWeight: designTokens.fontWeights.bold, textAlign: "auto" },
  textInput: { minHeight: designTokens.dimensions.controlHeight.lg, borderWidth: 1, borderRadius: designTokens.radius.lg - 3, paddingHorizontal: designTokens.spacing.lg, fontSize: designTokens.typography.body },
  textInputWithLabel: { paddingTop: designTokens.spacing.lg + 2 },
  textInputWithPasswordToggle: { paddingEnd: designTokens.spacing.xxl + designTokens.spacing.md },
  passwordVisibilityToggle: { position: "absolute", end: designTokens.spacing.md, minWidth: designTokens.dimensions.controlHeight.md, height: designTokens.dimensions.controlHeight.md, alignItems: "center", justifyContent: "center" },
  fieldError: { fontSize: designTokens.typography.caption, textAlign: "auto" },
  stepper: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm },
  stepButton: { width: designTokens.dimensions.controlHeight.md, height: designTokens.dimensions.controlHeight.md, borderWidth: 1, borderRadius: designTokens.radius.md, alignItems: "center", justifyContent: "center" },
  stepSymbol: { fontSize: designTokens.dimensions.iconSize.md, lineHeight: designTokens.dimensions.iconSize.lg - 4, fontWeight: designTokens.fontWeights.bold },
  quantity: { minWidth: 28, textAlign: "center", fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, fontVariant: ["tabular-nums"] }
});
