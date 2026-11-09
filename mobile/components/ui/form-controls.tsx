import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import { designTokens, useAppTheme } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";
import { Text as UiText } from "./typography";
import { getQuantityStepState } from "./form-controls-state";

type TextFieldProps = Omit<TextInputProps, "style"> & {
  label?: string | undefined;
  error?: string | undefined;
  style?: StyleProp<TextStyle> | undefined;
  containerStyle?: StyleProp<ViewStyle> | undefined;
};

export function TextField({ label, error, style, containerStyle, accessibilityLabel, ...props }: TextFieldProps) {
  const theme = useAppTheme();
  const { language } = useLanguage();

  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <UiText style={[styles.fieldLabel, { color: theme.colors.foreground }]}>{label}</UiText> : null}
      <TextInput
        {...props}
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor={props.placeholderTextColor ?? theme.colors.placeholder}
        style={[
          styles.textInput,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            color: theme.colors.foreground,
            fontFamily: language === "ar" ? theme.fontFamilies.arabic : theme.fontFamilies.latin
          },
          style
        ]}
      />
      {error ? <UiText accessibilityRole="alert" style={[styles.fieldError, { color: theme.colors.danger }]}>{error}</UiText> : null}
    </View>
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
  const buttonStyle = { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border };

  return (
    <View style={styles.stepper} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={decreaseLabel}
        accessibilityState={{ disabled: disabled || !state.canDecrease }}
        disabled={disabled || !state.canDecrease}
        onPress={() => onChange(value - 1)}
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
        onPress={() => onChange(value + 1)}
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
  fieldLabel: { fontSize: designTokens.typography.caption + 2, fontWeight: designTokens.fontWeights.bold, textAlign: "auto" },
  textInput: { minHeight: designTokens.dimensions.controlHeight.lg, borderWidth: 1, borderRadius: designTokens.radius.lg - 3, paddingHorizontal: designTokens.spacing.lg, fontSize: designTokens.typography.body },
  fieldError: { fontSize: designTokens.typography.caption, textAlign: "auto" },
  stepper: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm },
  stepButton: { width: designTokens.dimensions.controlHeight.md, height: designTokens.dimensions.controlHeight.md, borderWidth: 1, borderRadius: designTokens.radius.md, alignItems: "center", justifyContent: "center" },
  stepSymbol: { fontSize: designTokens.dimensions.iconSize.md, lineHeight: designTokens.dimensions.iconSize.lg - 4, fontWeight: designTokens.fontWeights.bold },
  quantity: { minWidth: 28, textAlign: "center", fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, fontVariant: ["tabular-nums"] }
});
