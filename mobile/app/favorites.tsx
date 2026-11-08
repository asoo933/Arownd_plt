import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { FavoriteButton as FavoriteToggle, FAVORITES_QUERY_KEY } from "@/components/favorite-button";
import {
  AppHeader,
  Caption,
  Card,
  Heading,
  Icon,
  IconButton,
  Image,
  PriceText,
  ProductCard,
  SegmentedControl,
  StoreCard,
  Text as UiText
} from "@/components/ui";
import {
  CustomerScreen,
  EmptyState,
  ErrorState,
  LoadingState
} from "@/components/customer-ui";
import { fetchProductOffers, fetchStoreDetails, formatDZD, getPrimaryImage } from "@/lib/catalog";
import { getFavorites } from "@/lib/favorites";
import type { FavoriteKind } from "@/lib/favorites-state";
import { translate } from "@/lib/i18n";

type FavoriteTab = FavoriteKind;

export default function FavoritesScreen() {
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
        leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-left" size={20} />} />}
      />
      <Caption>{translate("favoritesSubtitle")}</Caption>
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
              <ProductCard
                onPress={() => router.push({ pathname: "/product/[productId]", params: { productId: id } })}
                accessibilityLabel={offer.product.name}
                contentStyle={styles.productContent}
                media={
                  <View style={styles.productMedia}>
                    <Image
                      uri={getPrimaryImage(offer) ?? undefined}
                      accessibilityLabel={offer.product.name}
                      aspectRatio={1}
                      style={styles.productImage}
                    />
                    <View style={styles.favoriteOverlay}>
                      <FavoriteToggle kind="products" id={id} />
                    </View>
                  </View>
                }
              >
                <Heading level={3} numberOfLines={2}>{offer.product.name}</Heading>
                <Caption numberOfLines={1}>{offer.store.name}</Caption>
                <PriceText value={formatDZD(offer.price)} tone="accentMuted" />
              </ProductCard>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.storeList}>
          {content.data.stores.map(({ id, store }) => store ? (
            <StoreCard
              key={id}
              onPress={() => router.push({ pathname: "/store/[storeId]", params: { storeId: id } })}
              accessibilityLabel={store.name}
              contentStyle={styles.storeContent}
              media={
                <Image
                  uri={store.logo_url ?? undefined}
                  accessibilityLabel={store.name}
                  aspectRatio={1}
                  style={styles.storeLogo}
                />
              }
              actions={<View style={styles.storeFavorite}><FavoriteToggle kind="stores" id={id} /></View>}
            >
              <Heading level={3}>{store.name}</Heading>
              {store.commune ? <Caption>{store.commune}</Caption> : null}
              {store.description ? <UiText tone="muted" numberOfLines={2}>{store.description}</UiText> : null}
              {store.rating != null ? <UiText tone="warning" weight="700">★ {store.rating.toFixed(1)}</UiText> : null}
            </StoreCard>
          ) : null)}
        </View>
      )}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  productGrid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  productItem: { width: "48%" },
  productContent: { gap: 6, padding: 10 },
  productMedia: { position: "relative" },
  productImage: { borderRadius: 0 },
  favoriteOverlay: { position: "absolute", top: 7, end: 7 },
  storeList: { gap: 12 },
  storeContent: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  storeLogo: { width: 76, aspectRatio: 1, borderRadius: 12 },
  storeFavorite: { alignSelf: "center" }
});
