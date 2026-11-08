import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import { designTokens, useAppTheme } from "@/lib/theme";
import { getQuantityStepState } from "./form-controls-state";


type TextFieldProps = Omit<TextInputProps, "style"> & {
  label?: string;
  error?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({ label, error, style, containerStyle, accessibilityLabel, ...props }: TextFieldProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text style={[styles.fieldLabel, { color: theme.colors.foreground }]}>{label}</Text> : null}
      <TextInput
        {...props}
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor={props.placeholderTextColor ?? theme.colors.placeholder}
        style={[
          styles.textInput,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            color: theme.colors.foreground
          },
          style
        ]}
      />
      {error ? <Text accessibilityRole="alert" style={[styles.fieldError, { color: theme.colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  testID?: string;
};

export function Checkbox({ label, checked, onChange, disabled = false, testID }: CheckboxProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      testID={testID}
      style={({ pressed }) => [styles.checkboxRow, { opacity: disabled ? 0.5 : pressed ? 0.78 : 1 }]}
      hitSlop={6}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? theme.colors.accent : theme.colors.border,
            backgroundColor: checked ? theme.colors.accent : theme.colors.surface
          }
        ]}
      >
        {checked ? <Text style={[styles.checkmark, { color: theme.colors.accentForeground }]}>✓</Text> : null}
      </View>
      <Text style={[styles.checkboxLabel, { color: theme.colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

type QuantityStepperProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  disabled?: boolean;
  testID?: string;
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
        <Text style={[styles.stepSymbol, { color: theme.colors.foreground }]}>−</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={[styles.quantity, { color: theme.colors.foreground }]}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={increaseLabel}
        accessibilityState={{ disabled: disabled || !state.canIncrease }}
        disabled={disabled || !state.canIncrease}
        onPress={() => onChange(value + 1)}
        hitSlop={6}
        style={({ pressed }) => [styles.stepButton, buttonStyle, { opacity: disabled || !state.canIncrease ? 0.4 : pressed ? 0.7 : 1 }]}
      >
        <Text style={[styles.stepSymbol, { color: theme.colors.foreground }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: designTokens.spacing.xs },
  fieldLabel: { fontSize: 13, fontWeight: "700", textAlign: "right" },
  textInput: { minHeight: 50, borderWidth: 1, borderRadius: designTokens.radius.lg - 3, paddingHorizontal: designTokens.spacing.lg, fontSize: designTokens.typography.body },
  fieldError: { fontSize: 12, textAlign: "right" },
  checkboxRow: { minHeight: 44, flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.md },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderRadius: designTokens.radius.sm - 4, alignItems: "center", justifyContent: "center" },
  checkmark: { fontSize: 15, lineHeight: 18, fontWeight: "900" },
  checkboxLabel: { flex: 1, fontSize: designTokens.typography.body, textAlign: "right" },
  stepper: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm },
  stepButton: { width: 40, height: 40, borderWidth: 1, borderRadius: designTokens.radius.md, alignItems: "center", justifyContent: "center" },
  stepSymbol: { fontSize: 21, lineHeight: 24, fontWeight: "700" },
  quantity: { minWidth: 28, textAlign: "center", fontSize: designTokens.typography.body, fontWeight: "800", fontVariant: ["tabular-nums"] }
});
