import type { ReactNode } from "react";
import { CustomerNavigation } from "@/components/customer-navigation";
import {
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { translate } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";
import { Button, Caption, Heading, Icon, Image as UiImage, PriceDisplay, ProductCard, PressableSurface, RatingStars, SearchField, Text as UiText } from "@/components/ui";
export { EmptyState, ErrorState, LoadingState } from "@/components/ui";

export function CustomerScreen({ children, footer, showNavigation = true }: { children: ReactNode; footer?: ReactNode; showNavigation?: boolean }) {
  const theme = useAppTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>{footer}</View> : null}
      {showNavigation ? <CustomerNavigation /> : null}
    </SafeAreaView>
  );
}

export function CustomerHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.heading}>
      <Heading level={2}>{title}</Heading>
      {subtitle ? <Caption>{subtitle}</Caption> : null}
    </View>
  );
}

export function CustomerSearch({ value, onChangeText, placeholder }: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <SearchField
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      accessibilityLabel={placeholder}
      style={{ borderRadius: designTokens.radius.lg }}
    />
  );
}

export function SectionTitle({ title, action, onAction }: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.sectionTitle}>
      <Heading level={3}>{title}</Heading>
      {action && onAction ? (
        <Button
          label={action}
          onPress={onAction}
          variant="ghost"
          size="sm"
          textStyle={[styles.sectionAction, { color: theme.colors.accentMuted }]}
          style={{ minHeight: designTokens.dimensions.controlHeight.md, paddingHorizontal: 8 }}
        />
      ) : null}
    </View>
  );
}

export function ProductTile({ name, store, price, imageUrl, onPress, style }: {
  name: string;
  store: string;
  price: string;
  imageUrl: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  return (
    <ProductCard
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={`${name}، ${store}، ${price}`}
      style={[styles.productTile, { backgroundColor: theme.colors.surfaceSecondary }, style]}
      media={
        <View style={[styles.productImage, { backgroundColor: theme.colors.surfaceMuted }]}>
          {imageUrl ? <UiImage uri={imageUrl} accessibilityLabel={name} aspectRatio={1} style={StyleSheet.absoluteFill} /> : <Icon name="image" size={32} color={theme.colors.subtle} accessibilityHidden />}
        </View>
      }
      contentStyle={styles.productContent}
    >
      <UiText numberOfLines={2} weight="700" style={styles.productName}>{name}</UiText>
      <Caption numberOfLines={1}>{store}</Caption>
      <PriceDisplay value={price} />
    </ProductCard>
  );
}

export function StoreTile({ name, description, logoUrl, commune, rating, verified = false, onPress }: {
  name: string;
  description?: string | null | undefined;
  logoUrl?: string | null | undefined;
  commune?: string | null | undefined;
  rating?: number | null | undefined;
  verified?: boolean;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  return (
    <PressableSurface
      accessibilityRole="button"
      accessibilityLabel={`${name}${commune ? `، ${commune}` : ""}${rating != null ? `، ${rating.toFixed(1)}` : ""}${verified ? `، ${translate("storeVerified")}` : ""}`}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.storeTile, { backgroundColor: theme.colors.surfaceSecondary }]}
    >
      <View style={[styles.storeLogo, { backgroundColor: theme.colors.surfaceMuted }]}>
        {logoUrl ? <UiImage uri={logoUrl} accessibilityLabel={name} aspectRatio={1} style={StyleSheet.absoluteFill} /> : <Icon name="store" size={28} color={theme.colors.subtle} accessibilityHidden />}
      </View>
      <View style={styles.storeInfo}>
        <UiText numberOfLines={1} weight="700" >{name}</UiText>
        <Caption numberOfLines={1}>{commune || description || translate("storeNoDescription")}</Caption>
        {rating != null ? <RatingStars value={rating} size={14} showValue /> : null}
      </View>
      {verified ? <Icon name="check" size={18} color={theme.colors.success} accessibilityLabel={translate("storeVerified")} /> : null}
    </PressableSurface>
  );
}


const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  footer: { paddingHorizontal: designTokens.spacing.xl, paddingTop: designTokens.spacing.sm, paddingBottom: designTokens.spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  content: { paddingHorizontal: designTokens.spacing.xl, paddingTop: designTokens.spacing.sm, paddingBottom: designTokens.spacing.xxl, gap: designTokens.spacing.xxl },
  heading: { gap: designTokens.spacing.xs, alignItems: "flex-start" },
  sectionTitle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: designTokens.spacing.md },
  sectionAction: { fontSize: designTokens.typography.caption + 1, fontWeight: "700" },
  productTile: { width: 158 },
  productContent: { padding: designTokens.spacing.sm + 1, gap: designTokens.spacing.xs + 1 },
  productImage: { height: 132, borderRadius: designTokens.radius.md, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  productName: { minHeight: 38 },
  storeTile: { minHeight: 82, borderRadius: designTokens.radius.lg - 1, padding: designTokens.spacing.md - 1, flexDirection: "row", alignItems: "center", gap: designTokens.spacing.md - 1 },
  storeLogo: { width: 54, height: 54, borderRadius: designTokens.radius.md + 2, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  storeInfo: { flex: 1, gap: designTokens.spacing.xs, alignItems: "flex-start" },
});
