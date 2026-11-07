import type { ReactNode } from "react";
import { CustomerNavigation } from "@/components/customer-navigation";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { translate } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

export function CustomerScreen({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      <CustomerNavigation />
    </SafeAreaView>
  );
}

export function CustomerHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.heading}>
      <Text style={[styles.headingTitle, { color: theme.colors.foreground }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function CustomerSearch({ value, onChangeText, placeholder }: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.search, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.searchIcon, { color: theme.colors.muted }]}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        style={[styles.searchInput, { color: theme.colors.foreground }]}
        textAlign="right"
        returnKeyType="search"
      />
    </View>
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
      <Text style={[styles.sectionText, { color: theme.colors.foreground }]}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: theme.colors.accentMuted }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ProductTile({ name, store, price, oldPrice, imageUrl, onPress }: {
  name: string;
  store: string;
  price: string;
  oldPrice?: string | null;
  imageUrl: string | null;
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}، ${store}، ${price}`}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.productTile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <View style={[styles.productImage, { backgroundColor: theme.colors.surfaceMuted }]}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={[styles.imageFallback, { color: theme.colors.subtle }]}>▧</Text>}
      </View>
      <Text numberOfLines={2} style={[styles.productName, { color: theme.colors.foreground }]}>{name}</Text>
      <Text numberOfLines={1} style={[styles.productStore, { color: theme.colors.muted }]}>{store}</Text>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        {oldPrice ? <Text style={{ color: theme.colors.muted, fontSize: 10, textDecorationLine: "line-through" }}>{oldPrice}</Text> : null}
        <Text style={[styles.productPrice, { color: theme.colors.accentMuted }]}>{price}</Text>
      </View>
    </Pressable>
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}${commune ? `، ${commune}` : ""}${rating != null ? `، ${rating.toFixed(1)}` : ""}${verified ? `، ${translate("storeVerified")}` : ""}`}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.storeTile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <View style={[styles.storeLogo, { backgroundColor: theme.colors.surfaceMuted }]}>
        {logoUrl ? <Image source={{ uri: logoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={[styles.imageFallback, { color: theme.colors.subtle }]}>⌂</Text>}
      </View>
      <View style={styles.storeInfo}>
        <Text numberOfLines={1} style={[styles.storeName, { color: theme.colors.foreground }]}>{name}</Text>
        <Text numberOfLines={1} style={[styles.productStore, { color: theme.colors.muted }]}>{commune || description || " "}</Text>
        {rating != null ? <Text style={[styles.storeRating, { color: theme.colors.warning }]}>★ {rating.toFixed(1)}</Text> : null}
      </View>
      {verified ? <Text accessibilityLabel={translate("storeVerified")} style={[styles.verified, { color: theme.colors.success }]}>✓</Text> : null}
    </Pressable>
  );
}

export function LoadingState({ label }: { label: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.state}>
      <ActivityIndicator color={theme.colors.accentMuted} />
      <Text style={[styles.stateText, { color: theme.colors.muted }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.state}>
      <Text style={[styles.emptyMark, { color: theme.colors.accentMuted }]}>⌕</Text>
      <Text style={[styles.stateTitle, { color: theme.colors.foreground }]}>{title}</Text>
      <Text style={[styles.stateText, { color: theme.colors.muted }]}>{hint}</Text>
    </View>
  );
}

export function ErrorState({ title, retryLabel, onRetry }: {
  title: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.state}>
      <Text style={[styles.stateTitle, { color: theme.colors.foreground }]}>{title}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.retry, { backgroundColor: theme.colors.accent }]}>
        <Text style={[styles.retryText, { color: theme.colors.accentForeground }]}>{retryLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: designTokens.spacing.xl, paddingTop: designTokens.spacing.sm, paddingBottom: designTokens.spacing.xxl, gap: designTokens.spacing.xxl },
  heading: { gap: designTokens.spacing.xs, alignItems: "flex-end" },
  headingTitle: { fontSize: designTokens.typography.title, fontWeight: "900", textAlign: "right" },
  subtitle: { fontSize: designTokens.typography.caption + 1, textAlign: "right", lineHeight: 19 },
  search: { minHeight: 50, borderRadius: designTokens.radius.lg, borderWidth: 1, flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: designTokens.spacing.md, gap: designTokens.spacing.sm },
  searchIcon: { fontSize: 24 },
  searchInput: { flex: 1, minHeight: 48, fontSize: designTokens.typography.body },
  sectionTitle: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: designTokens.spacing.md },
  sectionText: { fontSize: designTokens.typography.subtitle, fontWeight: "900", textAlign: "right" },
  sectionAction: { fontSize: designTokens.typography.caption + 1, fontWeight: "800" },
  productTile: { width: 158, borderRadius: designTokens.radius.lg, borderWidth: 1, padding: designTokens.spacing.sm + 1, gap: designTokens.spacing.xs + 1 },
  productImage: { height: 132, borderRadius: designTokens.radius.md, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  imageFallback: { fontSize: 35 },
  productName: { minHeight: 38, fontSize: 13, fontWeight: "800", textAlign: "right" },
  productStore: { fontSize: designTokens.typography.caption, textAlign: "right" },
  productPrice: { fontSize: designTokens.typography.body, fontWeight: "900", textAlign: "right" },
  storeTile: { minHeight: 82, borderWidth: 1, borderRadius: designTokens.radius.lg - 1, padding: designTokens.spacing.md - 1, flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.md - 1 },
  storeLogo: { width: 54, height: 54, borderRadius: designTokens.radius.md + 2, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  storeInfo: { flex: 1, gap: designTokens.spacing.xs, alignItems: "flex-end" },
  storeName: { fontSize: designTokens.typography.body, fontWeight: "800" },
  storeRating: { fontSize: designTokens.typography.caption, fontWeight: "700" },
  verified: { fontSize: 16, fontWeight: "900" },
  state: { minHeight: 135, alignItems: "center", justifyContent: "center", gap: designTokens.spacing.md, padding: designTokens.spacing.xl },
  stateText: { fontSize: designTokens.typography.caption + 1, textAlign: "center" },
  stateTitle: { fontSize: designTokens.typography.body, fontWeight: "800", textAlign: "center" },
  emptyMark: { fontSize: 30 },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: designTokens.spacing.xl, borderRadius: designTokens.radius.md },
  retryText: { fontSize: designTokens.typography.caption + 1, fontWeight: "800" }
});
