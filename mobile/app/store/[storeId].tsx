import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, ProductTile } from "@/components/customer-ui";
import { FavoriteButton } from "@/components/favorite-button";
import { fetchProductDetails, fetchProductOffers, fetchStoreDetails, fetchStoreOffers, formatDZD, getPrimaryImage } from "@/lib/catalog";
import { fetchApprovedReviews } from "@/lib/reviews";
import { translate, useLanguage } from "@/lib/i18n";
import { ReviewPanel } from "@/components/review-panel";
import { designTokens, useAppTheme } from "@/lib/theme";
import { AppHeader, Avatar, Card, Icon, IconButton, RatingStars, SegmentedControl, StoreCardSkeleton, ProductCardSkeleton, Text as UiText } from "@/components/ui";

type StoreTab = "products" | "about";

export default function StoreDetailsScreen() {
  useLanguage();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<StoreTab>("products");
  const store = useQuery({
    queryKey: ["customer-store", storeId],
    queryFn: () => fetchStoreDetails(storeId),
    enabled: Boolean(storeId)
  });
  const offers = useQuery({
    queryKey: ["customer-store-offers", storeId],
    queryFn: () => fetchStoreOffers(storeId),
    enabled: Boolean(storeId) && tab === "products"
  });

  if (store.isPending) return <CustomerScreen>
    <AppHeader title="" leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" color={theme.colors.foreground} size={20} />} />} />
    <StoreCardSkeleton />
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.md }}>
      {[0, 1, 2, 3].map((item) => <ProductCardSkeleton key={item} style={{ width: "47%", flex: 0 }} />)}
    </View>
  </CustomerScreen>;
  if (store.isError) {
    return <CustomerScreen><ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} busy={store.isFetching} onRetry={() => void store.refetch()} /></CustomerScreen>;
  }
  if (!store.data) return <CustomerScreen><EmptyState title={translate("detailNotFound")} hint={translate("storeNoDescription")} /></CustomerScreen>;

  const details = store.data;
  return (
    <CustomerScreen>
      <AppHeader
        title=""
        leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-right" color={theme.colors.foreground} size={20} />} />}
      />

      <View style={styles.storeIdentity}>
        <Avatar
          name={details.name}
          imageUri={details.logo_url || undefined}
          size={76}
          verified={details.is_verified ?? false}
          accessibilityLabel={details.name}
        />
        <View style={styles.storeInfo}>
          <UiText style={[styles.storeName, { color: theme.colors.foreground }]}>{details.name}</UiText>
          <UiText style={[styles.metaText, { color: theme.colors.muted }]}>{details.commune || details.address_line || translate("storeNoAddress")}</UiText>
          <UiText style={[styles.verified, { color: details.is_verified ? theme.colors.success : theme.colors.muted }]}>{details.is_verified ? translate("storeVerified") : translate("storeUnverified")}</UiText>
          {details.rating != null ? <RatingStars value={details.rating} showValue /> : null}
        </View>
        <FavoriteButton kind="stores" id={storeId} iconOnly />
      </View>

      <SegmentedControl
        accessibilityLabel={translate("storeAboutTitle")}
        options={[
          { key: "products", label: translate("storeProductsTitle") },
          { key: "about", label: translate("storeAboutTitle") }
        ]}
        value={tab}
        onChange={(value) => {
          if (value === "products" || value === "about") setTab(value);
        }}
        style={styles.tabs}
      />

      {tab === "products" ? (
        offers.isPending ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.md }}>
            {[0, 1, 2, 3].map((item) => <ProductCardSkeleton key={item} style={{ width: "47%", flex: 0 }} />)}
          </View>
        ) : offers.isError ? (
          <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} busy={offers.isFetching} onRetry={() => void offers.refetch()} />
        ) : offers.data.length === 0 ? (
          <EmptyState icon="package" title={translate("storeNoProducts")} hint={translate("storeNoDescription")} />
        ) : (
          <View style={styles.productGrid}>
            {offers.data.map((item) => (
              <ProductTile key={item.id} name={item.product.name} store={details.name} price={formatDZD(item.price)} imageUrl={getPrimaryImage(item)} onPress={() => {
                void queryClient.prefetchQuery({ queryKey: ["customer-product", item.product.id], queryFn: () => fetchProductDetails(item.product.id), staleTime: 60_000 });
                void queryClient.prefetchQuery({ queryKey: ["customer-product-offers", item.product.id], queryFn: () => fetchProductOffers(item.product.id), staleTime: 30_000 });
                void queryClient.prefetchQuery({ queryKey: ["approved-reviews", "product", item.product.id], queryFn: () => fetchApprovedReviews("product", item.product.id), staleTime: 60_000 });
                router.push({ pathname: "/product/[productId]", params: { productId: item.product.id } });
              }} />
            ))}
          </View>
        )
      ) : (
        <>
          <Card contentStyle={styles.aboutCard}>
            <UiText style={[styles.aboutTitle, { color: theme.colors.foreground }]}>{translate("storeAboutTitle")}</UiText>
            <UiText style={[styles.description, { color: theme.colors.muted }]}>{details.description || translate("storeNoDescription")}</UiText>
            <UiText style={[styles.fieldTitle, { color: theme.colors.accentMuted }]}>{translate("storeAddress")}</UiText>
            <UiText style={[styles.description, { color: theme.colors.muted }]}>{[details.address_line, details.commune].filter(Boolean).join("، ") || translate("storeNoAddress")}</UiText>
            {details.phone ? <><UiText style={[styles.fieldTitle, { color: theme.colors.accentMuted }]}>{translate("storePhone")}</UiText><UiText style={[styles.description, { color: theme.colors.muted }]}>{details.phone}</UiText></> : null}
            {details.whatsapp ? <><UiText style={[styles.fieldTitle, { color: theme.colors.accentMuted }]}>{translate("storeWhatsApp")}</UiText><UiText style={[styles.description, { color: theme.colors.muted }]}>{details.whatsapp}</UiText></> : null}
          </Card>
          <ReviewPanel targetType="store" targetId={storeId} />
        </>
      )}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  storeIdentity: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.md },
  storeInfo: { flex: 1, alignItems: "flex-start", gap: designTokens.spacing.xs },
  storeName: { fontSize: designTokens.typography.title - 2, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  metaText: { fontSize: designTokens.typography.caption + 1, textAlign: "auto" },
  verified: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  tabs: { width: "100%" },
  productGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: designTokens.spacing.md },
  aboutCard: { padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
  aboutTitle: { fontSize: designTokens.typography.subtitle + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  fieldTitle: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  description: { fontSize: designTokens.typography.body - 1, lineHeight: 22, textAlign: "auto" }
});
