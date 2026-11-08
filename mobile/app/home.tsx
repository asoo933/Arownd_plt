import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CartButton } from "@/components/cart-button";
import { Button, PressableSurface } from "@/components/ui";
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
import { useAppTheme } from "@/lib/theme";

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
      <View style={styles.topBar}>
        <View style={styles.brandWrap}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>A</Text></View>
          <Text style={[styles.brand, { color: theme.colors.foreground }]}>arownd</Text>
          <CartButton />
        </View>
        <Pressable accessibilityRole="button" style={styles.location} onPress={() => router.push("/stores")}>
          <Text style={styles.locationText}>{translate("homeLocation")}</Text>
          <Text style={styles.locationIcon}>⌖</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>{translate("homeEyebrow")}</Text>
        <Text style={styles.heroTitle}>{translate("homeTitle")}</Text>
        <Text style={styles.heroSubtitle}>{translate("homeSubtitle")}</Text>
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
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={[styles.categoryLabel, { color: theme.colors.foreground }]}>{translate(category.label)}</Text>
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
  topBar: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  brandWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMark: { width: 31, height: 31, borderRadius: 11, backgroundColor: "#C6F135", alignItems: "center", justifyContent: "center" },
  brandMarkText: { color: "#0A0A0A", fontWeight: "900", fontSize: 18 },
  brand: { fontSize: 21, fontWeight: "900", letterSpacing: -0.8 },
  location: { flexDirection: "row-reverse", alignItems: "center", gap: 7, backgroundColor: "#C6F135", borderRadius: 12, paddingHorizontal: 11, minHeight: 38 },
  locationText: { color: "#0A0A0A", fontSize: 11, fontWeight: "800" },
  locationIcon: { color: "#0A0A0A", fontSize: 17 },
  hero: { backgroundColor: "#111A0A", borderRadius: 24, padding: 19, gap: 10 },
  heroEyebrow: { color: "#C6F135", fontSize: 11, fontWeight: "800", textAlign: "right" },
  heroTitle: { color: "#FFFFFF", fontSize: 24, lineHeight: 35, fontWeight: "900", textAlign: "right" },
  heroSubtitle: { color: "#D0D7C7", fontSize: 12, lineHeight: 21, textAlign: "right" },
  searchButton: { minHeight: 43, borderRadius: 13, backgroundColor: "#C6F135", alignItems: "center", justifyContent: "center" },
  searchButtonText: { color: "#0A0A0A", fontSize: 13, fontWeight: "900" },
  categoryRail: { flexDirection: "row-reverse", gap: 9, paddingBottom: 3 },
  category: { width: 93, minHeight: 94, borderRadius: 17, alignItems: "center", justifyContent: "center", gap: 8, padding: 9 },
  categoryIcon: { fontSize: 25 },
  categoryLabel: { fontSize: 11, fontWeight: "800", textAlign: "center" },
  productRail: { flexDirection: "row-reverse", gap: 10 },
  storeList: { gap: 9 },
});
