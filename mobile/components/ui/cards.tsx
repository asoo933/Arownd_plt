import type { ReactNode } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

import { designTokens, useAppTheme } from "@/lib/theme";
import { Icon, type IconName } from "./icon";
import { Text as UiText } from "./typography";
import { Surface } from "./primitives";

export type CardProps = {
  children: ReactNode;
  media?: ReactNode;
  actions?: ReactNode;
  onPress?: (() => void) | undefined;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Card({
  children,
  media,
  actions,
  onPress,
  disabled = false,
  style,
  contentStyle,
  accessibilityLabel
}: CardProps) {
  const theme = useAppTheme();
  const content = (
    <Surface
      elevated={false}
      style={[
        { overflow: "hidden", borderRadius: theme.radius.xl, padding: 0 },
        style
      ]}
    >
      {media}
      <View style={[{ padding: designTokens.spacing.md, gap: designTokens.spacing.md }, contentStyle]}>
        {children}
        {actions}
      </View>
    </Surface>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: disabled ? 0.5 : pressed ? 0.82 : 1 })}
    >
      {content}
    </Pressable>
  );
}

type ComposedCardProps = CardProps & { compact?: boolean };

function ComposedCard({ compact = false, contentStyle, ...props }: ComposedCardProps) {
  return (
    <Card
      {...props}
      contentStyle={[
        { gap: compact ? designTokens.spacing.sm : designTokens.spacing.md, padding: compact ? designTokens.spacing.sm : designTokens.spacing.md },
        contentStyle
      ]}
    />
  );
}

export function ProductCard(props: ComposedCardProps) {
  return <ComposedCard {...props} />;
}


export function StoreCard(props: ComposedCardProps) {
  return <ComposedCard {...props} />;
}


export function OfferCard(props: ComposedCardProps) {
  return <ComposedCard {...props} />;
}


export type CategorySelectorTileProps = {
  label: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
};

export function CategorySelectorTile({
  label,
  icon,
  selected,
  onPress,
  accessibilityLabel
}: CategorySelectorTileProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 112,
        minHeight: 88,
        borderRadius: theme.radius.lg,
        backgroundColor: selected && theme.mode === "light" ? theme.colors.accent : theme.colors.surface,
        alignItems: "center",
        justifyContent: "center",
        gap: designTokens.spacing.sm,
        padding: designTokens.spacing.sm,
        opacity: pressed ? 0.82 : 1
      })}
    >
      <Icon
        name={icon}
        size={theme.dimensions.iconSize.lg}
        color={selected ? (theme.mode === "dark" ? theme.colors.accent : theme.colors.accentForeground) : theme.colors.muted}
        accessibilityHidden
      />
      <UiText
        style={{
          color: selected ? (theme.mode === "dark" ? theme.colors.accent : theme.colors.accentForeground) : theme.colors.foreground,
          fontSize: theme.typography.caption,
          fontWeight: theme.fontWeights.extrabold,
          textAlign: "center"
        }}
      >
        {label}
      </UiText>
    </Pressable>
  );
}

export function CategoryCard(props: ComposedCardProps) {
  return <ComposedCard {...props} />;
}

export function CategoryTile(props: ComposedCardProps) {
  return <ComposedCard {...props} compact />;
}

export function MerchantCard(props: ComposedCardProps) {
  return <ComposedCard {...props} />;
}

export function DeliveryCard(props: ComposedCardProps) {
  return <ComposedCard {...props} />;
}

export function OrderCard(props: ComposedCardProps) {
  return <ComposedCard {...props} />;
}

export function AddressCard(props: ComposedCardProps) {
  return <ComposedCard {...props} compact />;
}

export function NotificationCard(props: ComposedCardProps) {
  return <ComposedCard {...props} compact />;
}

