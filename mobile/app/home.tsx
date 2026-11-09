import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";

import { Avatar, Icon, PressableSurface, Text as UiText } from "@/components/ui";
import {
  CustomerScreen,
  EmptyState,
  ErrorState,
  LoadingState,
  ProductTile,
  SectionTitle
} from "@/components/customer-ui";
import { fetchFeaturedStores, fetchHomeProducts, formatDZD, getPrimaryImage } from "@/lib/catalog";
import { translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme } from "@/lib/theme";

const STORE_AVATAR_SIZE = 64;
const STORE_TILE_WIDTH = 88;
const STORE_SCROLL_SPEED = 0.45;

export default function CustomerHomeScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const products = useQuery({ queryKey: ["customer-home-products"], queryFn: fetchHomeProducts, staleTime: 60_000 });
  const stores = useQuery({ queryKey: ["customer-featured-stores"], queryFn: fetchFeaturedStores, staleTime: 120_000 });

  const storeScrollRef = useRef<ScrollViewInstance | null>(null);
  const scrollOffsetRef = useRef(0);
  const isDraggingRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [storeViewportWidth, setStoreViewportWidth] = useState(0);
  const [storeCycleWidth, setStoreCycleWidth] = useState(0);

  const orderedStores = language === "ar" && stores.data ? [...stores.data].reverse() : stores.data ?? [];
  const repeatCount = storeCycleWidth > 0 && storeViewportWidth > 0
    ? Math.max(3, Math.ceil(storeViewportWidth / storeCycleWidth) + 2)
    : 3;

  useEffect(() => {
    if (storeCycleWidth <= 0 || storeViewportWidth <= 0 || orderedStores.length === 0) return;

    const interval = setInterval(() => {
      if (isDraggingRef.current) return;

      let nextOffset = scrollOffsetRef.current + STORE_SCROLL_SPEED;
      if (nextOffset >= storeCycleWidth) nextOffset %= storeCycleWidth;

      scrollOffsetRef.current = nextOffset;
      storeScrollRef.current?.scrollTo({ x: nextOffset, animated: false });
    }, 32);

    return () => clearInterval(interval);
  }, [orderedStores.length, storeCycleWidth, storeViewportWidth]);

  useEffect(() => () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, []);

  const pauseStoreMotion = () => {
    isDraggingRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const resumeStoreMotion = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      isDraggingRef.current = false;
    }, 1_200);
  };

  const renderStore = (store: (typeof orderedStores)[number], duplicate: boolean) => (
    <PressableSurface
      key={`${duplicate ? "duplicate" : "primary"}-${store.id}`}
      accessibilityRole="button"
      accessibilityLabel={store.name}
      onPress={() => router.push({ pathname: "/store/[storeId]", params: { storeId: store.id } })}
      style={styles.storeTile}
    >
      <Avatar name={store.name} imageUri={store.logo_url ?? undefined} size={STORE_AVATAR_SIZE} />
      <UiText numberOfLines={1} style={[styles.storeName, { color: theme.colors.foreground }]}>
        {store.name}
      </UiText>
    </PressableSurface>
  );

  return (
    <CustomerScreen>
      <View style={styles.header}>
        <UiText accessibilityRole="header" style={[styles.brand, { color: theme.colors.foreground }]}>
          AROWND
        </UiText>
        <View style={styles.headerActions}>
          <PressableSurface
            accessibilityRole="button"
            accessibilityLabel={translate("notificationsTitle")}
            onPress={() => router.push("/notifications")}
            style={[styles.headerIconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Icon name="bell" size={21} color={theme.colors.foreground} accessibilityHidden />
          </PressableSurface>
          <PressableSurface
            accessibilityRole="button"
            accessibilityLabel={translate("homeLocation")}
            onPress={() => router.push("/stores")}
            style={[styles.headerIconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Icon name="map-pin" size={21} color={theme.colors.foreground} accessibilityHidden />
          </PressableSurface>
        </View>
      </View>

      <View>
        <SectionTitle title={translate("homeFeaturedStores")} />
        {stores.isPending ? <LoadingState label={translate("stateLoading")} /> : stores.isError ? (
          <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} busy={stores.isFetching} onRetry={() => void stores.refetch()} />
        ) : stores.data.length === 0 ? (
          <EmptyState icon="store" title={translate("homeNoStores")} hint={translate("homeNoStoresHint")} />
        ) : (
          <View
            style={styles.storeViewport}
            onLayout={(event) => setStoreViewportWidth(event.nativeEvent.layout.width)}
          >
            <ScrollView
              ref={storeScrollRef}
              horizontal
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(event) => {
                scrollOffsetRef.current = event.nativeEvent.contentOffset.x;
              }}
              onScrollBeginDrag={pauseStoreMotion}
              onScrollEndDrag={resumeStoreMotion}
              onMomentumScrollEnd={resumeStoreMotion}
              contentContainerStyle={styles.storeTrack}
            >
              {Array.from({ length: repeatCount }, (_, groupIndex) => (
                <View
                  key={`store-group-${groupIndex}`}
                  onLayout={groupIndex === 0 ? (event) => {
                    const width = event.nativeEvent.layout.width;
                    setStoreCycleWidth((current) => Math.abs(current - width) > 1 ? width : current);
                  } : undefined}
                  accessibilityElementsHidden={groupIndex > 0}
                  importantForAccessibility={groupIndex > 0 ? "no-hide-descendants" : "auto"}
                  style={styles.storeGroup}
                >
                  {orderedStores.map((store) => renderStore(store, groupIndex > 0))}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View>
        <SectionTitle title={translate("homeNewArrivals")} />
        {products.isPending ? <LoadingState label={translate("stateLoading")} /> : products.isError ? (
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
                price={formatDZD(item.price)}
                imageUrl={getPrimaryImage(item)}
                onPress={() => router.push({ pathname: "/product/[productId]", params: { productId: item.product.id } })}
              />
            ))}
          </ScrollView>
        )}
      </View>
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
  brand: {
    fontSize: designTokens.typography.title,
    fontWeight: designTokens.fontWeights.extrabold,
    letterSpacing: 1.2
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
  storeGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: designTokens.spacing.md,
    paddingEnd: designTokens.spacing.md,
    flexShrink: 0,
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
