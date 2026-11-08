import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { CartButton } from "@/components/cart-button";
import { AppHeader, Button, Icon, PressableSurface, Text as UiText } from "@/components/ui";
import {
  CustomerScreen,
  CustomerSearch,
  EmptyState,
  ErrorState,
  LoadingState,
  ProductTile,
  SectionTitle,
  StoreTile
} from "@/components/customer-ui";
import { fetchFeaturedStores, fetchHomeProducts, formatDZD, getPrimaryImage } from "@/lib/catalog";
import { translate } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

const categories = [
  { id: "fashion", icon: "👗", label: "categoryFashion" },
  { id: "electronics", icon: "📱", label: "categoryElectronics" },
  { id: "beauty", icon: "💄", label: "categoryBeauty" },
  { id: "home", icon: "🛋️", label: "categoryHome" },
  { id: "kids", icon: "🧸", label: "categoryKids" },
  { id: "food", icon: "🍰", label: "categoryFood" }
] as const;

export default function CustomerHomeScreen() {
  const theme = useAppTheme();
  const [search, setSearch] = useState("");
  const products = useQuery({ queryKey: ["customer-home-products"], queryFn: fetchHomeProducts, staleTime: 60_000 });
  const stores = useQuery({ queryKey: ["customer-featured-stores"], queryFn: fetchFeaturedStores, staleTime: 120_000 });

  return (
    <CustomerScreen>
      <AppHeader
        title="arownd"
        leading={<CartButton />}
        trailing={
          <PressableSurface
            accessibilityLabel={translate("homeLocation")}
            onPress={() => router.push("/stores")}
            style={[styles.location, { backgroundColor: theme.colors.accent }]}
          >
            <UiText style={[styles.locationText, { color: theme.colors.accentForeground }]}>{translate("homeLocation")}</UiText>
            <Icon name="map-pin" size={17} color={theme.colors.accentForeground} />
          </PressableSurface>
        }
      />

      <View style={[styles.hero, { backgroundColor: theme.colors.surfaceMuted }]}>
        <UiText tone="accentMuted" style={styles.heroEyebrow}>{translate("homeEyebrow")}</UiText>
        <UiText style={[styles.heroTitle, { color: theme.colors.foreground, fontSize: theme.typography.title }]} >{translate("homeTitle")}</UiText>
        <UiText tone="muted" style={styles.heroSubtitle}>{translate("homeSubtitle")}</UiText>
        <CustomerSearch value={search} onChangeText={setSearch} placeholder={translate("homeSearchPlaceholder")} />
        <Button
          label={translate("homeSearchAction")}
          onPress={() => router.push({ pathname: "/explore", params: search.trim() ? { q: search.trim() } : {} })}
          fullWidth
          style={styles.searchButton}
          textStyle={styles.searchButtonText}
        />
      </View>

      <View>
        <SectionTitle title={translate("homeCategories")} action={translate("homeSeeAll")} onAction={() => router.push("/explore")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
          {categories.map((category) => (
            <PressableSurface
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={translate(category.label)}
              onPress={() => router.push({ pathname: "/explore", params: { category: category.id } })}
              style={[styles.category, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
            >
              <UiText style={styles.categoryIcon}>{category.icon}</UiText>
              <UiText style={[styles.categoryLabel, { color: theme.colors.foreground }]}>{translate(category.label)}</UiText>
            </PressableSurface>
          ))}
        </ScrollView>
      </View>

      <View>
        <SectionTitle title={translate("homeNewArrivals")} action={translate("homeSeeAll")} onAction={() => router.push("/explore")} />
        {products.isPending ? <LoadingState label={translate("stateLoading")} /> : products.isError ? (
          <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void products.refetch()} />
        ) : products.data.length === 0 ? (
          <EmptyState title={translate("homeNoProducts")} hint={translate("homeNoProductsHint")} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRail}>
            {products.data.map((item) => (
              <ProductTile key={item.id} name={item.product.name} store={item.store.name} price={formatDZD(item.price)} imageUrl={getPrimaryImage(item)} onPress={() => router.push({ pathname: "/product/[productId]", params: { productId: item.product.id } })} />
            ))}
          </ScrollView>
        )}
      </View>

      <View>
        <SectionTitle title={translate("homeFeaturedStores")} action={translate("homeSeeAll")} onAction={() => router.push("/stores")} />
        {stores.isPending ? <LoadingState label={translate("stateLoading")} /> : stores.isError ? (
          <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void stores.refetch()} />
        ) : stores.data.length === 0 ? (
          <EmptyState title={translate("homeNoStores")} hint={translate("homeNoStoresHint")} />
        ) : (
          <View style={styles.storeList}>
            {stores.data.map((store) => (
              <StoreTile key={store.id} name={store.name} description={store.description} logoUrl={store.logo_url} commune={store.commune} rating={store.rating} onPress={() => router.push({ pathname: "/store/[storeId]", params: { storeId: store.id } })} />
            ))}
          </View>
        )}
      </View>

    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  location: { flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.xs, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.md, minHeight: designTokens.dimensions.controlHeight.sm },
  locationText: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
  hero: { borderRadius: designTokens.radius.xl, padding: designTokens.spacing.xl, gap: designTokens.spacing.md },
  heroEyebrow: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold, textAlign: "right" },
  heroTitle: { lineHeight: 35, fontWeight: designTokens.fontWeights.extrabold, textAlign: "right" },
  heroSubtitle: { fontSize: designTokens.typography.caption + 1, lineHeight: 21, textAlign: "right" },
  searchButton: { minHeight: designTokens.dimensions.controlHeight.lg, borderRadius: designTokens.radius.sm, alignItems: "center", justifyContent: "center" },
  searchButtonText: { fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.extrabold },
  categoryRail: { flexDirection: "row-reverse", gap: designTokens.spacing.sm, paddingBottom: 3 },
  category: { width: 93, minHeight: 94, borderRadius: designTokens.radius.md, alignItems: "center", justifyContent: "center", gap: designTokens.spacing.sm, padding: designTokens.spacing.sm },
  categoryIcon: { fontSize: designTokens.typography.subtitle + 9 },
  categoryLabel: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold, textAlign: "center" },
  productRail: { flexDirection: "row-reverse", gap: designTokens.spacing.md },
  storeList: { gap: designTokens.spacing.sm },
});
