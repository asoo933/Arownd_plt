import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle
} from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { BottomSheet } from "./feedback";
import { Icon } from "./icon";
import { Text as UiText } from "./typography";
import { getCalendarDays } from "./forms-state";

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

export type NumberFieldProps = Omit<TextInputProps, "keyboardType">;

export function NumberField({ onChangeText, ...props }: NumberFieldProps) {
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
        { minHeight: theme.dimensions.controlHeight.md, flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.sm, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
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
        {checked ? <Icon name="check" size={theme.dimensions.iconSize.xs} color={theme.colors.accentForeground} accessibilityHidden /> : null}
      </View>
      {label ? <UiText style={{ color: theme.colors.foreground, fontSize: theme.typography.body, flex: 1, textAlign: "right" }}>{label}</UiText> : null}
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
              { minHeight: theme.dimensions.controlHeight.md, flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.sm, opacity: option.disabled ? 0.45 : pressed ? 0.75 : 1 }
            ]}
          >
            <View style={{ width: theme.dimensions.iconSize.md, height: theme.dimensions.iconSize.md, borderRadius: theme.radius.pill, borderWidth: selected ? 6 : 1.5, borderColor: selected ? theme.colors.accent : theme.colors.muted }} />
            <UiText style={{ color: theme.colors.foreground, fontSize: theme.typography.body, flex: 1, textAlign: "right" }}>{option.label}</UiText>
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
    <View style={[{ minHeight: theme.dimensions.controlHeight.lg, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md }, style]}>
      {label ? <UiText style={{ flex: 1, color: theme.colors.foreground, fontSize: theme.typography.body, textAlign: "right" }}>{label}</UiText> : null}
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
          { minHeight: theme.dimensions.controlHeight.lg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.pill, paddingHorizontal: designTokens.spacing.lg, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.colors.surface, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
          style
        ]}
      >
        <UiText numberOfLines={1} style={{ color: selected ? theme.colors.foreground : theme.colors.placeholder, fontSize: theme.typography.body }}>
          {selected?.label ?? placeholder}
        </UiText>
        <Icon name="chevron-down" size={18} color={theme.colors.muted} accessibilityHidden />
      </Pressable>
      <BottomSheet visible={open} onRequestClose={() => setOpen(false)} maxHeight="70%">
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
              style={{ minHeight: theme.dimensions.controlHeight.lg, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: theme.colors.border, opacity: option.disabled ? 0.45 : 1 }}
            >
              <UiText style={{ color: option.value === value ? theme.colors.accentMuted : theme.colors.foreground, textAlign: "right", fontSize: theme.typography.body, fontWeight: option.value === value ? theme.fontWeights.bold : theme.fontWeights.regular }}>
                {option.label}
              </UiText>
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>
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
            style={{ minHeight: theme.dimensions.controlHeight.sm, paddingHorizontal: designTokens.spacing.md, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: selected ? theme.colors.accent : theme.colors.border, backgroundColor: selected ? theme.colors.accent : theme.colors.surface, justifyContent: "center", opacity: option.disabled ? 0.45 : 1 }}
          >
            <UiText style={{ color: selected ? theme.colors.accentForeground : theme.colors.foreground, fontSize: theme.typography.caption + 1 }}>
              {option.label}
            </UiText>
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
        <View key={index} style={{ flex: 1, minWidth: 0, height: theme.dimensions.controlHeight.lg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface }}>
          <UiText style={{ color: theme.colors.foreground, fontSize: theme.typography.title, fontWeight: theme.fontWeights.bold }}>
            {value[index] ?? ""}
          </UiText>
        </View>
      ))}
      <TextInput
        value={value}
        onChangeText={(next) => onChange(next.replace(/\D/g, "").slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        editable={!disabled}
        accessibilityLabel={accessibilityLabel}
        style={{ position: "absolute", inset: 0, opacity: 0.02 }}
      />
    </View>
  );
}


export function FormLabel({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  const theme = useAppTheme();
  return <UiText style={[{ color: theme.colors.foreground, fontSize: theme.typography.caption + 2, fontWeight: theme.fontWeights.bold, textAlign: "right" }, style]}>{children}</UiText>;
}

export function FormError({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  const theme = useAppTheme();
  return <UiText accessibilityRole="alert" style={[{ color: theme.colors.danger, fontSize: theme.typography.caption, textAlign: "right" }, style]}>{children}</UiText>;
}

export function FormField({
  label,
  hint,
  error,
  children,
  style
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View style={[{ gap: designTokens.spacing.xs }, style]}>
      {label ? <FormLabel>{label}</FormLabel> : null}
      {children}
      {error ? <FormError>{error}</FormError> : hint ? <UiText style={{ color: theme.colors.muted, fontSize: theme.typography.caption, textAlign: "right" }}>{hint}</UiText> : null}
    </View>
  );
}

export function Radio({
  selected,
  onPress,
  label,
  disabled = false
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [{ minHeight: theme.dimensions.controlHeight.md, flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.sm, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}>
      <View style={{ width: 22, height: 22, borderRadius: theme.radius.pill, borderWidth: selected ? 6 : 1.5, borderColor: selected ? theme.colors.accent : theme.colors.muted }} />
      <UiText style={{ color: theme.colors.foreground, fontSize: theme.typography.body, textAlign: "right" }}>{label}</UiText>
    </Pressable>
  );
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePicker({
  value,
  onChange,
  accessibilityLabel,
  monthLabel,
  weekdayLabels,
  previousMonthLabel,
  nextMonthLabel,
  minDate,
  maxDate,
  weekStartsOn = 0,
  disabled = false,
  style
}: {
  value?: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  monthLabel: (year: number, month: number) => string;
  weekdayLabels: string[];
  previousMonthLabel: string;
  nextMonthLabel: string;
  minDate?: string;
  maxDate?: string;
  weekStartsOn?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
    const initial = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  useEffect(() => {
    if (!value) return;
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) setVisibleMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  }, [value]);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const days = useMemo(() => getCalendarDays(year, month, weekStartsOn), [month, weekStartsOn, year]);

  return (
    <View accessibilityLabel={accessibilityLabel} style={[{ gap: designTokens.spacing.md }, style]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable accessibilityRole="button" accessibilityLabel={previousMonthLabel} disabled={disabled} onPress={() => setVisibleMonth(new Date(year, month - 1, 1))} hitSlop={8} style={{ minWidth: theme.dimensions.controlHeight.md, minHeight: theme.dimensions.controlHeight.md, alignItems: "center", justifyContent: "center" }}>
          <UiText style={{ color: theme.colors.foreground }}>‹</UiText>
        </Pressable>
        <UiText style={{ color: theme.colors.foreground, fontSize: theme.typography.body, fontWeight: theme.fontWeights.bold }}>{monthLabel(year, month)}</UiText>
        <Pressable accessibilityRole="button" accessibilityLabel={nextMonthLabel} disabled={disabled} onPress={() => setVisibleMonth(new Date(year, month + 1, 1))} hitSlop={8} style={{ minWidth: theme.dimensions.controlHeight.md, minHeight: theme.dimensions.controlHeight.md, alignItems: "center", justifyContent: "center" }}>
          <UiText style={{ color: theme.colors.foreground }}>›</UiText>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row-reverse", flexWrap: "wrap" }}>
        {weekdayLabels.map((label, index) => <View key={`${label}-${index}`} style={{ width: "14.2857%", minHeight: theme.dimensions.avatarSize.sm, alignItems: "center", justifyContent: "center" }}><UiText style={{ color: theme.colors.muted, fontSize: theme.typography.caption }}>{label}</UiText></View>)}
        {days.map((day, index) => {
          if (day === null) return <View key={`empty-${index}`} style={{ width: "14.2857%", aspectRatio: 1 }} />;
          const dateKey = toDateKey(new Date(year, month, day));
          const selected = value === dateKey;
          const unavailable = disabled || (minDate !== undefined && dateKey < minDate) || (maxDate !== undefined && dateKey > maxDate);
          return (
            <Pressable key={dateKey} accessibilityRole="button" accessibilityLabel={dateKey} accessibilityState={{ selected, disabled: unavailable }} disabled={unavailable} onPress={() => onChange(dateKey)} style={({ pressed }) => [{ width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: theme.radius.pill, backgroundColor: selected ? theme.colors.accent : "transparent", opacity: unavailable ? 0.35 : pressed ? 0.7 : 1 }]}>
              <UiText style={{ color: selected ? theme.colors.accentForeground : theme.colors.foreground, fontSize: theme.typography.caption + 1, fontWeight: selected ? theme.fontWeights.extrabold : theme.fontWeights.regular }}>{day}</UiText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
