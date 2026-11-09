import type { ReactNode } from "react";
import { Image, Pressable, ScrollView, View, type ImageSourcePropType, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { Text as UiText } from "./typography";

import { designTokens, useAppTheme } from "@/lib/theme";
import { QuantityStepper, TextField } from "./form-controls";
import { Card } from "./cards";
import { RadioGroup, type RadioOption } from "./forms";
import { StatusBadge, type StatusBadgeTone } from "./extended";

export function PriceDisplay({
  value,
  previousValue,
  style
}: {
  value: string;
  previousValue?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View style={[{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: designTokens.spacing.sm }, style]}>
      <UiText style={{ color: theme.colors.foreground, fontSize: theme.typography.title, fontWeight: theme.fontWeights.extrabold, fontVariant: ["tabular-nums"] }}>{value}</UiText>
      {previousValue ? <UiText style={{ color: theme.colors.muted, fontSize: theme.typography.caption, textDecorationLine: "line-through" }}>{previousValue}</UiText> : null}
    </View>
  );
}

export function DiscountBadge({ label }: { label: string }) {
  const theme = useAppTheme();
  return <UiText style={{ alignSelf: "flex-start", overflow: "hidden", paddingHorizontal: designTokens.spacing.sm, paddingVertical: designTokens.spacing.xs, borderRadius: theme.radius.pill, backgroundColor: theme.colors.dangerSurface, color: theme.colors.dangerText, fontSize: theme.typography.caption, fontWeight: theme.fontWeights.bold }}>{label}</UiText>;
}

export function StockBadge({ label, tone = "success" }: { label: string; tone?: Extract<StatusBadgeTone, "success" | "warning" | "danger" | "neutral"> }) {
  return <StatusBadge label={label} tone={tone} />;
}

export function FavoriteButton({
  selected,
  onChange,
  accessibilityLabel,
  children,
  disabled = false
}: {
  selected: boolean;
  onChange: (selected: boolean) => void;
  accessibilityLabel: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => onChange(!selected)} hitSlop={8} style={({ pressed }) => [{ width: 44, height: 44, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: selected ? theme.colors.dangerSurface : theme.colors.surface, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 }]}>
      {children}
    </Pressable>
  );
}

export function CartButton({
  label,
  count,
  onPress,
  children,
  disabled = false
}: {
  label: string;
  count?: number;
  onPress: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [{ minWidth: theme.dimensions.controlHeight.md, minHeight: theme.dimensions.controlHeight.md, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}>
      {children}
      {count !== undefined && count > 0 ? <View style={{ position: "absolute", top: 0, end: 0, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: theme.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.danger }}><UiText style={{ color: theme.colors.surface, fontSize: 10, fontWeight: theme.fontWeights.extrabold }}>{count > 99 ? "99+" : count}</UiText></View> : null}
    </Pressable>
  );
}

export function CartItem({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: designTokens.spacing.md, paddingVertical: designTokens.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border }, style]}>{children}</View>;
}

export function ProductQuantitySelector({
  value,
  min = 1,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
  disabled
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  disabled?: boolean | undefined;
}) {
  return <QuantityStepper value={value} min={min} max={max} onChange={onChange} decreaseLabel={decreaseLabel} increaseLabel={increaseLabel} disabled={disabled} />;
}

export function CartSummary({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Card contentStyle={style}>{children}</Card>;
}

export function CheckoutSummary({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Card contentStyle={style}>{children}</Card>;
}

export function CouponInput({
  value,
  onChangeText,
  onApply,
  placeholder,
  applyLabel,
  disabled = false,
  style
}: {
  value: string;
  onChangeText: (value: string) => void;
  onApply: () => void;
  placeholder: string;
  applyLabel: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm }, style]}>
      <TextField value={value} onChangeText={onChangeText} placeholder={placeholder} editable={!disabled} containerStyle={{ flex: 1 }} />
      <Pressable accessibilityRole="button" accessibilityLabel={applyLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onApply} style={{ minHeight: theme.dimensions.controlHeight.lg, justifyContent: "center", paddingHorizontal: designTokens.spacing.md, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accent, opacity: disabled ? 0.5 : 1 }}>
        <UiText style={{ color: theme.colors.accentForeground, fontWeight: theme.fontWeights.bold }}>{applyLabel}</UiText>
      </Pressable>
    </View>
  );
}

export function ProductVariantSelector({
  options,
  value,
  onChange,
  accessibilityLabel,
  display = "radio",
  style
}: {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  display?: "radio" | "chips";
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  if (display === "radio") {
    return <RadioGroup options={options} value={value} onChange={onChange} accessibilityLabel={accessibilityLabel} style={style} />;
  }

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={[{ flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm }, style]}>
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
            style={({ pressed }) => [{
              minWidth: theme.dimensions.controlHeight.md,
              minHeight: theme.dimensions.controlHeight.md,
              paddingHorizontal: designTokens.spacing.md,
              borderWidth: 1,
              borderRadius: theme.radius.md,
              borderColor: selected ? theme.colors.accentMuted : theme.colors.border,
              backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
              alignItems: "center",
              justifyContent: "center",
              opacity: option.disabled ? 0.45 : pressed ? 0.75 : 1
            }]}
          >
            <UiText style={{ color: selected ? theme.colors.accentForeground : theme.colors.foreground, fontSize: theme.typography.caption + 1, fontWeight: selected ? theme.fontWeights.bold : theme.fontWeights.medium }}>
              {option.label}
            </UiText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProductImageGallery({
  images,
  selectedIndex = 0,
  onSelect,
  accessibilityLabel,
  imageStyle
}: {
  images: string[];
  selectedIndex?: number;
  onSelect: (index: number) => void;
  accessibilityLabel: string;
  imageStyle?: StyleProp<ImageStyle>;
}) {
  const theme = useAppTheme();
  const selected = images[selectedIndex];
  const selectedSource: ImageSourcePropType | undefined = selected ? { uri: selected } : undefined;

  return (
    <View accessibilityLabel={accessibilityLabel} style={{ gap: designTokens.spacing.sm }}>
      {selectedSource ? <Image source={selectedSource} resizeMode="cover" style={[{ width: "100%", aspectRatio: 1, borderRadius: theme.radius.xl, backgroundColor: theme.colors.surfaceMuted }, imageStyle]} /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", gap: designTokens.spacing.sm }}>
        {images.map((uri, index) => (
          <Pressable key={uri + index} accessibilityRole="button" accessibilityLabel={`${accessibilityLabel} ${index + 1}`} accessibilityState={{ selected: index === selectedIndex }} onPress={() => onSelect(index)} style={{ borderRadius: theme.radius.md, borderWidth: index === selectedIndex ? 2 : 1, borderColor: index === selectedIndex ? theme.colors.accentMuted : theme.colors.border, overflow: "hidden" }}>
            <Image source={{ uri }} resizeMode="cover" style={{ width: 64, height: 64 }} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function OfferSelector({
  options,
  value,
  onChange,
  accessibilityLabel
}: {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
}) {
  return <RadioGroup options={options} value={value} onChange={onChange} accessibilityLabel={accessibilityLabel} />;
}

export function PaymentMethodCard({
  selected,
  onPress,
  accessibilityLabel,
  children,
  style
}: {
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityLabel={accessibilityLabel} accessibilityState={{ checked: selected }} onPress={onPress} style={[{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: designTokens.spacing.md, padding: designTokens.spacing.md, borderRadius: theme.radius.lg, borderWidth: selected ? 2 : 1, borderColor: selected ? theme.colors.accentMuted : theme.colors.border, backgroundColor: theme.colors.surface }, style]}>
      {children}
    </Pressable>
  );
}

export function OrderStatusBadge({ label, tone }: { label: string; tone: StatusBadgeTone }) {
  return <StatusBadge label={label} tone={tone} />;
}
