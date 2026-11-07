import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { FavoriteButton, FAVORITES_QUERY_KEY } from "@/components/favorite-button";
import {
  CustomerHeading,
  CustomerScreen,
  EmptyState,
  ErrorState,
  LoadingState,
  ProductTile,
  StoreTile
} from "@/components/customer-ui";
import { fetchProductOffers, fetchStoreDetails, formatDZD, getPrimaryImage } from "@/lib/catalog";
import { getFavorites } from "@/lib/favorites";
import type { FavoriteKind } from "@/lib/favorites-state";
import { translate } from "@/lib/i18n";

type FavoriteTab = FavoriteKind;

export default function FavoritesScreen() {
  const dark = useColorScheme() === "dark";
  const [tab, setTab] = useState<FavoriteTab>("products");
  const favorites = useQuery({ queryKey: FAVORITES_QUERY_KEY, queryFn: getFavorites });
  const content = useQuery({
    queryKey: ["customer-favorites-content", favorites.data?.products, favorites.data?.stores],
    enabled: Boolean(favorites.data),
    queryFn: async () => {
      const ids = favorites.data;
      if (!ids) return { products: [], stores: [] };
      const [productResults, storeResults] = await Promise.all([
        Promise.all(ids.products.map(async (id) => {
          const offers = await fetchProductOffers(id);
          const available = offers.filter((offer) => offer.is_available && offer.stock_quantity > 0);
          const best = (available.length ? available : offers).reduce(
            (current, offer) => !current || offer.price < current.price ? offer : current,
            null as (typeof offers)[number] | null
          );
          return best ? { id, offer: best } : null;
        })),
        Promise.all(ids.stores.map(async (id) => ({ id, store: await fetchStoreDetails(id) })))
      ]);
      return {
        products: productResults.flatMap((item) => item === null ? [] : [item]),
        stores: storeResults.flatMap((item) => item.store === null ? [] : [item])
      };
    }
  });

  if (favorites.isPending) {
    return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  }
  if (favorites.isError) {
    return <CustomerScreen><ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void favorites.refetch()} /></CustomerScreen>;
  }

  const count = tab === "products" ? favorites.data.products.length : favorites.data.stores.length;
  const visibleCount = content.data
    ? tab === "products" ? content.data.products.length : content.data.stores.length
    : count;
  return (
    <CustomerScreen>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>{translate("back")}</Text>
      </Pressable>
      <CustomerHeading title={translate("favoritesTitle")} subtitle={translate("favoritesSubtitle")} />
      <View style={[styles.tabs, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
        <TabButton label={`${translate("favoriteProducts")} (${favorites.data.products.length})`} active={tab === "products"} onPress={() => setTab("products")} />
        <TabButton label={`${translate("favoriteStores")} (${favorites.data.stores.length})`} active={tab === "stores"} onPress={() => setTab("stores")} />
      </View>

      {content.isPending ? <LoadingState label={translate("stateLoading")} /> : content.isError ? (
        <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void content.refetch()} />
      ) : visibleCount === 0 ? (
        <EmptyState
          title={translate(tab === "products" ? "favoriteProductsEmpty" : "favoriteStoresEmpty")}
          hint={translate("favoritesEmptyHint")}
        />
      ) : tab === "products" ? (
        <View style={styles.productGrid}>
          {content.data.products.map(({ id, offer }) => (
            <View key={id} style={styles.productItem}>
              <ProductTile
                name={offer.product.name}
                store={offer.store.name}
                price={formatDZD(offer.price)}
                imageUrl={getPrimaryImage(offer)}
                onPress={() => router.push({ pathname: "/product/[productId]", params: { productId: id } })}
              />
              <FavoriteButton kind="products" id={id} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.storeList}>
          {content.data.stores.map(({ id, store }) => store ? (
            <View key={id} style={styles.storeItem}>
              <StoreTile
                name={store.name}
                description={store.description}
                logoUrl={store.logo_url}
                commune={store.commune}
                rating={store.rating}
                onPress={() => router.push({ pathname: "/store/[storeId]", params: { storeId: id } })}
              />
              <FavoriteButton kind="stores" id={id} />
            </View>
          ) : null)}
        </View>
      )}
    </CustomerScreen>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.tab, active && styles.activeTab]}>
      <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 38, justifyContent: "center", alignItems: "flex-end" },
  backText: { color: "#647D13", fontSize: 13, fontWeight: "800" },
  tabs: { flexDirection: "row-reverse", borderRadius: 14, padding: 4 },
  tab: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 11 },
  activeTab: { backgroundColor: "#C6F135" },
  tabText: { color: "#737373", fontSize: 11, fontWeight: "800" },
  activeTabText: { color: "#0A0A0A" },
  productGrid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  productItem: { width: "48%", alignItems: "center", gap: 7 },
  storeList: { gap: 12 },
  storeItem: { gap: 7, alignItems: "flex-end" }
});
