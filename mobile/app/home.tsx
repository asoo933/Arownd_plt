import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";

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

const categories = [
  { id: "fashion", icon: "👗", label: "categoryFashion" },
  { id: "electronics", icon: "📱", label: "categoryElectronics" },
  { id: "beauty", icon: "💄", label: "categoryBeauty" },
  { id: "home", icon: "🛋️", label: "categoryHome" },
  { id: "kids", icon: "🧸", label: "categoryKids" },
  { id: "food", icon: "🍰", label: "categoryFood" }
] as const;

export default function CustomerHomeScreen() {
  const dark = useColorScheme() === "dark";
  const [search, setSearch] = useState("");
  const products = useQuery({ queryKey: ["customer-home-products"], queryFn: fetchHomeProducts, staleTime: 60_000 });
  const stores = useQuery({ queryKey: ["customer-featured-stores"], queryFn: fetchFeaturedStores, staleTime: 120_000 });

  return (
    <CustomerScreen>
      <View style={styles.topBar}>
        <View style={styles.brandWrap}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>A</Text></View>
          <Text style={[styles.brand, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}>arownd</Text>
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
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/explore", params: search.trim() ? { q: search.trim() } : {} })} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>{translate("homeSearchAction")}</Text>
        </Pressable>
      </View>

      <View>
        <SectionTitle title={translate("homeCategories")} action={translate("homeSeeAll")} onAction={() => router.push("/explore")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRail}>
          {categories.map((category) => (
            <Pressable key={category.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/explore", params: { category: category.id } })} style={[styles.category, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={[styles.categoryLabel, { color: dark ? "#F5F5F5" : "#0A0A0A" }]}>{translate(category.label)}</Text>
            </Pressable>
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

      <View style={[styles.bottomNav, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
        <NavItem label={translate("navHome")} icon="⌂" active />
        <NavItem label={translate("navExplore")} icon="⌕" onPress={() => router.push("/explore")} />
        <NavItem label={translate("navStores")} icon="▦" onPress={() => router.push("/stores")} />
      </View>
    </CustomerScreen>
  );
}

function NavItem({ label, icon, active = false, onPress }: {
  label: string;
  icon: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.navItem}>
      <Text style={[styles.navIcon, active ? styles.navActive : undefined]}>{icon}</Text>
      <Text style={[styles.navLabel, active ? styles.navActive : undefined]}>{label}</Text>
    </Pressable>
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
  bottomNav: { minHeight: 66, borderRadius: 19, flexDirection: "row-reverse", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 8 },
  navItem: { minWidth: 58, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 3 },
  navIcon: { color: "#858585", fontSize: 19, fontWeight: "800" },
  navLabel: { color: "#858585", fontSize: 10, fontWeight: "700" },
  navActive: { color: "#718B17" }
});
