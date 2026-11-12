import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { Avatar, Icon, PressableSurface, Skeleton, ProductCardSkeleton, Text as UiText } from "@/components/ui";
import Logo from "@/components/logo";
import { ExternalProductsSection } from "@/components/external-product-card";
import { fetchExternalProducts } from "@/lib/external-products";
import {
  CustomerScreen,
  CustomerHeading,
  EmptyState,
  ErrorState,
  ProductTile,
  SectionTitle
} from "@/components/customer-ui";
import { fetchFeaturedStores, fetchHomeProducts, fetchProductDetails, fetchProductOffers, fetchStoreDetails, fetchStoreOffers, formatMarketPrice, getPrimaryImage } from "@/lib/catalog";
import { fetchBrowsingCurrencyCode, fetchMyBrowsingCountryCode } from "@/lib/country-service";
import { fetchApprovedReviews } from "@/lib/reviews";
import { translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

const STORE_AVATAR_SIZE = 64;
const STORE_TILE_WIDTH = 88;

export default function CustomerHomeScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const browsingCurrency = useQuery({ queryKey: ["browsing-country-currency"], queryFn: fetchBrowsingCurrencyCode, staleTime: 60_000 });
  const browsingCountry = useQuery({ queryKey: ["browsing-country-code"], queryFn: fetchMyBrowsingCountryCode, staleTime: 60_000 });
  const products = useQuery({ queryKey: ["customer-home-products"], queryFn: fetchHomeProducts, staleTime: 60_000 });
  const stores = useQuery({ queryKey: ["customer-featured-stores"], queryFn: fetchFeaturedStores, staleTime: 120_000 });
  const externalProducts = useQuery({
    queryKey: ["external-products", "noon-jumia", browsingCountry.data ?? "unresolved", language],
    queryFn: () => browsingCountry.data
      ? fetchExternalProducts(language, browsingCountry.data)
      : Promise.resolve(null),
    enabled: Boolean(browsingCountry.data),
    staleTime: 15 * 60_000,
    retry: 1,
  });

  const orderedStores = language === "ar" && stores.data ? [...stores.data].reverse() : stores.data ?? [];

  const renderStore = (store: (typeof orderedStores)[number]) => (
    <PressableSurface
      key={store.id}
      accessibilityRole="button"
      accessibilityLabel={store.name}
      onPress={() => {
        void queryClient.prefetchQuery({ queryKey: ["customer-store", store.id], queryFn: () => fetchStoreDetails(store.id), staleTime: 60_000 });
        void queryClient.prefetchQuery({ queryKey: ["customer-store-offers", store.id], queryFn: () => fetchStoreOffers(store.id), staleTime: 30_000 });
        router.push({ pathname: "/store/[storeId]", params: { storeId: store.id } });
      }}
      style={styles.storeTile}
    >
      <Avatar name={store.name} imageUri={store.logo_url ?? undefined} size={STORE_AVATAR_SIZE} />
      <UiText numberOfLines={1} style={[styles.storeName, { color: theme.colors.foreground }]}>
        {store.name}
      </UiText>
    </PressableSurface>
  );

  return (
    <CustomerScreen
      refreshing={stores.isFetching || products.isFetching || externalProducts.isFetching || browsingCountry.isFetching}
      onRefresh={() => { void Promise.all([stores.refetch(), products.refetch(), externalProducts.refetch(), browsingCountry.refetch()]); }}
    >
      <View style={styles.header}>
        <Logo color={theme.colors.foreground} width={148} />
        <View style={styles.headerActions}>
          <PressableSurface
            accessibilityRole="button"
            accessibilityLabel={translate("notificationsTitle")}
            onPress={() => router.push("/notifications")}
            style={[styles.headerIconButton, { backgroundColor: theme.mode === "light" ? theme.colors.surfaceSecondary : theme.colors.surface, borderWidth: theme.mode === "light" ? 0 : 1, borderColor: theme.colors.border }]}
          >
            <Icon name="bell" size={21} color={theme.colors.foreground} accessibilityHidden />
          </PressableSurface>
        </View>
      </View>

      <CustomerHeading
        title={translate("homeTitle")}
        subtitle={translate("homeSubtitle")}
      />

      <View>
        <SectionTitle title={translate("homeFeaturedStores")} />
        {stores.isPending ? (
          <View style={styles.storeTrack}>
            {[0, 1, 2, 3].map((item) => (
              <View key={item} style={styles.storeTile}>
                <Skeleton width={STORE_AVATAR_SIZE} height={STORE_AVATAR_SIZE} radius={designTokens.radius.pill} />
                <Skeleton width={68} height={10} />
              </View>
            ))}
          </View>
        ) : stores.isError ? (
          <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} busy={stores.isFetching} onRetry={() => void stores.refetch()} />
        ) : stores.data.length === 0 ? (
          <EmptyState icon="store" title={translate("homeNoStores")} hint={translate("homeNoStoresHint")} />
        ) : (
          <View
            style={styles.storeViewport}
          >
            <ScrollView
              horizontal
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storeTrack}
            >
              {orderedStores.map((store) => renderStore(store))}
            </ScrollView>
          </View>
        )}
      </View>

      <View>
        <SectionTitle title={translate("homeNewArrivals")} />
        {products.isPending ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productRail}>
            {[0, 1, 2].map((item) => <ProductCardSkeleton key={item} style={{ width: 156, flex: 0 }} />)}
          </ScrollView>
        ) : products.isError ? (
          <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} busy={products.isFetching} onRetry={() => void products.refetch()} />
        ) : products.data.length === 0 ? (
          <EmptyState icon="package" title={translate("homeNoProducts")} hint={translate("homeNoProductsHint")} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productRail}
          >
            {products.data.map((item) => (
              <ProductTile
                key={item.id}
                name={item.product.name}
                store={item.store.name}
                price={browsingCurrency.data ? formatMarketPrice(item.price, browsingCurrency.data) : "—"}
                imageUrl={getPrimaryImage(item)}
                onPress={() => {
                  void queryClient.prefetchQuery({ queryKey: ["customer-product", item.product.id], queryFn: () => fetchProductDetails(item.product.id), staleTime: 60_000 });
                  void queryClient.prefetchQuery({ queryKey: ["customer-product-offers", item.product.id], queryFn: () => fetchProductOffers(item.product.id), staleTime: 30_000 });
                  void queryClient.prefetchQuery({ queryKey: ["approved-reviews", "product", item.product.id], queryFn: () => fetchApprovedReviews("product", item.product.id), staleTime: 60_000 });
                  router.push({ pathname: "/product/[productId]", params: { productId: item.product.id } });
                }}
              />
            ))}
          </ScrollView>
        )}
      </View>
      <ExternalProductsSection products={externalProducts.data ?? null} />
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: designTokens.dimensions.controlHeight.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.sm
  },
  headerIconButton: {
    width: designTokens.dimensions.controlHeight.md,
    height: designTokens.dimensions.controlHeight.md,
    borderRadius: designTokens.radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  storeViewport: {
    overflow: "hidden"
  },
  storeTrack: {
    flexDirection: "row",
    alignItems: "flex-start",
    direction: "ltr"
  },
  storeTile: {
    width: STORE_TILE_WIDTH,
    minHeight: STORE_AVATAR_SIZE + 30,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: designTokens.spacing.xs,
    paddingVertical: designTokens.spacing.xs
  },
  storeName: {
    width: "100%",
    fontSize: designTokens.typography.caption,
    fontWeight: designTokens.fontWeights.semibold,
    textAlign: "center"
  },
  productRail: {
    flexDirection: "row",
    gap: designTokens.spacing.md
  }
});
