import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppHeader, Icon, PressableSurface, Text as UiText } from "@/components/ui";
import {
  CustomerScreen,
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


export default function CustomerHomeScreen() {
  const theme = useAppTheme();
  const products = useQuery({ queryKey: ["customer-home-products"], queryFn: fetchHomeProducts, staleTime: 60_000 });
  const stores = useQuery({ queryKey: ["customer-featured-stores"], queryFn: fetchFeaturedStores, staleTime: 120_000 });

  return (
    <CustomerScreen>
      <AppHeader
        title="arownd"
        leading={
          <View
            accessibilityRole="button"
            accessibilityLabel={translate("notificationsTitle")}
            accessibilityState={{ disabled: true }}
            style={[
              styles.notificationButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border
              }
            ]}
          >
            <Icon name="bell" size={21} color={theme.colors.foreground} accessibilityHidden />
          </View>
        }
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
  notificationButton: {
    width: designTokens.dimensions.controlHeight.md,
    height: designTokens.dimensions.controlHeight.md,
    borderRadius: designTokens.radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  location: { flexDirection: "row-reverse", alignItems: "center", gap: designTokens.spacing.xs, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.md, minHeight: designTokens.dimensions.controlHeight.sm },
  locationText: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
  productRail: { flexDirection: "row-reverse", gap: designTokens.spacing.md },
  storeList: { gap: designTokens.spacing.sm }
});
