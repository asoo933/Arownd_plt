import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text as NativeText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle
} from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";

export type TextAreaProps = Omit<TextInputProps, "multiline" | "style"> & {
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  minHeight?: number;
};

export function TextArea({
  style,
  containerStyle,
  minHeight = 112,
  ...props
}: TextAreaProps) {
  const theme = useAppTheme();

  return (
    <View style={containerStyle}>
      <TextInput
        {...props}
        multiline
        textAlignVertical="top"
        placeholderTextColor={props.placeholderTextColor ?? theme.colors.placeholder}
        style={[
          {
            minHeight,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            padding: designTokens.spacing.md,
            color: theme.colors.foreground,
            backgroundColor: theme.colors.surface,
            fontSize: theme.typography.body,
            textAlign: "right"
          },
          style
        ]}
      />
    </View>
  );
}

export type NumberFieldProps = Omit<TextInputProps, "keyboardType"> & {
  min?: number;
  max?: number;
};

export function NumberField({ min, max, onChangeText, ...props }: NumberFieldProps) {
  const handleChange = (raw: string) => {
    const normalized = raw.replace(/[^0-9٠-٩٫.,-]/g, "");
    if (onChangeText) onChangeText(normalized);
  };

  return (
    <TextInput
      {...props}
      keyboardType="numeric"
      onChangeText={handleChange}
      accessibilityRole="none"
    />
  );
}

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  style,
  accessibilityLabel
}: CheckboxProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      hitSlop={6}
      style={({ pressed }) => [
        { minHeight: 44, flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.sm, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
        style
      ]}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: theme.radius.sm - 3,
          borderWidth: checked ? 0 : 1.5,
          borderColor: theme.colors.muted,
          backgroundColor: checked ? theme.colors.accent : "transparent",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {checked ? <NativeText style={{ color: theme.colors.accentForeground, fontWeight: "900" }}>✓</NativeText> : null}
      </View>
      {label ? <NativeText style={{ color: theme.colors.foreground, fontSize: theme.typography.body, flex: 1, textAlign: "right" }}>{label}</NativeText> : null}
    </Pressable>
  );
}

export type RadioOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function RadioGroup({
  options,
  value,
  onChange,
  accessibilityLabel,
  style
}: {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={[{ gap: designTokens.spacing.sm }, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, disabled: option.disabled }}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              { minHeight: 44, flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.sm, opacity: option.disabled ? 0.45 : pressed ? 0.75 : 1 }
            ]}
          >
            <View style={{ width: 22, height: 22, borderRadius: theme.radius.pill, borderWidth: selected ? 6 : 1.5, borderColor: selected ? theme.colors.accent : theme.colors.muted }} />
            <NativeText style={{ color: theme.colors.foreground, fontSize: theme.typography.body, flex: 1, textAlign: "right" }}>{option.label}</NativeText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SwitchControl({
  value,
  onValueChange,
  label,
  disabled = false,
  style
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <View style={[{ minHeight: 48, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md }, style]}>
      {label ? <NativeText style={{ flex: 1, color: theme.colors.foreground, fontSize: theme.typography.body, textAlign: "right" }}>{label}</NativeText> : null}
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.border, true: theme.colors.accentMuted }}
        thumbColor={theme.colors.surface}
        accessibilityLabel={label}
      />
    </View>
  );
}

export type SelectOption = { label: string; value: string; disabled?: boolean };

export function Select({
  options,
  value,
  onChange,
  placeholder,
  accessibilityLabel,
  disabled = false,
  style
}: {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          { minHeight: 48, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.pill, paddingHorizontal: designTokens.spacing.lg, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.colors.surface, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
          style
        ]}
      >
        <NativeText numberOfLines={1} style={{ color: selected ? theme.colors.foreground : theme.colors.placeholder, fontSize: theme.typography.body }}>
          {selected?.label ?? placeholder}
        </NativeText>
        <NativeText style={{ color: theme.colors.muted }}>⌄</NativeText>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, justifyContent: "flex-end", backgroundColor: theme.colors.overlay }} onPress={() => setOpen(false)}>
          <Pressable style={{ maxHeight: "70%", padding: designTokens.spacing.lg, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, backgroundColor: theme.colors.surface }} onPress={() => undefined}>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  disabled={option.disabled}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option.value === value, disabled: option.disabled }}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={{ minHeight: 48, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: theme.colors.border, opacity: option.disabled ? 0.45 : 1 }}
                >
                  <NativeText style={{ color: option.value === value ? theme.colors.accentMuted : theme.colors.foreground, textAlign: "right", fontSize: theme.typography.body, fontWeight: option.value === value ? "700" : "400" }}>
                    {option.label}
                  </NativeText>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function MultiSelect({
  options,
  value,
  onChange,
  style
}: {
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <View style={[{ flexDirection: "row-reverse", flexWrap: "wrap", gap: designTokens.spacing.sm }, style]}>
      {options.map((option) => {
        const selected = value.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="checkbox"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, disabled: option.disabled }}
            disabled={option.disabled}
            onPress={() => onChange(selected ? value.filter((item) => item !== option.value) : [...value, option.value])}
            style={{ minHeight: 40, paddingHorizontal: designTokens.spacing.md, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: selected ? theme.colors.accent : theme.colors.border, backgroundColor: selected ? theme.colors.accent : theme.colors.surface, justifyContent: "center", opacity: option.disabled ? 0.45 : 1 }}
          >
            <NativeText style={{ color: selected ? theme.colors.accentForeground : theme.colors.foreground, fontSize: theme.typography.caption + 1 }}>
              {option.label}
            </NativeText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function InputOTP({
  value,
  onChange,
  length = 6,
  accessibilityLabel,
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  const theme = useAppTheme();

  return (
    <View accessibilityRole="group" accessibilityLabel={accessibilityLabel} style={{ flexDirection: "row", gap: designTokens.spacing.sm }}>
      {Array.from({ length }, (_, index) => (
        <View key={index} style={{ flex: 1, minWidth: 0, height: 54, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
          <NativeText style={{ color: theme.colors.foreground, fontSize: theme.typography.title, fontWeight: "700" }}>
            {value[index] ?? ""}
          </NativeText>
        </View>
      ))}
      <TextInput
        value={value}
        onChangeText={(next) => onChange(next.replace(/\\D/g, "").slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        editable={!disabled}
        accessibilityLabel={accessibilityLabel}
        style={{ position: "absolute", inset: 0, opacity: 0.02 }}
      />
    </View>
  );
}
