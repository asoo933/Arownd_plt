import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FavoriteButton, FAVORITES_QUERY_KEY } from "@/components/favorite-button";
import { AppHeader, IconButton, SegmentedControl } from "@/components/ui";
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
import { useAppTheme } from "@/lib/theme";

type FavoriteTab = FavoriteKind;

export default function FavoritesScreen() {
  const theme = useAppTheme();
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
      <AppHeader
        title={translate("favoritesTitle")}
        leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Text style={{ color: theme.colors.foreground, fontSize: 24 }}>‹</Text>} />}
      />
      <CustomerHeading title={translate("favoritesTitle")} subtitle={translate("favoritesSubtitle")} />
      <SegmentedControl
        accessibilityLabel={translate("favoritesTitle")}
        value={tab}
        onChange={(value) => { if (value === "products" || value === "stores") setTab(value); }}
        options={[
          { key: "products", label: `${translate("favoriteProducts")} (${favorites.data.products.length})` },
          { key: "stores", label: `${translate("favoriteStores")} (${favorites.data.stores.length})` }
        ]}
      />

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

const styles = StyleSheet.create({
  productGrid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  productItem: { width: "48%", alignItems: "center", gap: 7 },
  storeList: { gap: 12 },
  storeItem: { gap: 7, alignItems: "flex-end" }
});
