import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, ProductTile, LoadingState } from "@/components/customer-ui";
import { FavoriteButton } from "@/components/favorite-button";
import { fetchStoreDetails, fetchStoreOffers, formatDZD, getPrimaryImage } from "@/lib/catalog";
import { translate } from "@/lib/i18n";
import { ReviewPanel } from "@/components/review-panel";
import { useAppTheme } from "@/lib/theme";
import { AppHeader, Card, Icon, IconButton, Image as UiImage, RatingStars, SegmentedControl, Text as UiText } from "@/components/ui";

type StoreTab = "products" | "about";

export default function StoreDetailsScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const theme = useAppTheme();
  const [tab, setTab] = useState<StoreTab>("products");
  const store = useQuery({
    queryKey: ["customer-store", storeId],
    queryFn: () => fetchStoreDetails(storeId),
    enabled: Boolean(storeId)
  });
  const offers = useQuery({
    queryKey: ["customer-store-offers", storeId],
    queryFn: () => fetchStoreOffers(storeId),
    enabled: Boolean(storeId)
  });

  if (store.isPending) return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  if (store.isError) {
    return <CustomerScreen><ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void store.refetch()} /></CustomerScreen>;
  }
  if (!store.data) return <CustomerScreen><EmptyState title={translate("detailNotFound")} hint={translate("storeNoDescription")} /></CustomerScreen>;

  const details = store.data;
  return (
    <CustomerScreen>
      <AppHeader
        title={details.name}
        leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="chevron-left" color={theme.colors.foreground} size={20} />} />}
        trailing={<FavoriteButton kind="stores" id={storeId} />}
      />
      <View style={[styles.cover, { backgroundColor: theme.colors.surfaceMuted }]}>
        {details.cover_url ? <UiImage uri={details.cover_url} accessibilityLabel={details.name} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      </View>
      <View style={styles.storeHeader}>
        <View style={[styles.logo, { backgroundColor: theme.colors.surfaceMuted }]}>
          {details.logo_url ? <UiImage uri={details.logo_url} accessibilityLabel={details.name} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Icon name="store" color={theme.colors.subtle} size={30} accessibilityHidden />}
        </View>
        <View style={styles.storeTitleWrap}>
          <UiText style={[styles.storeName, { color: theme.colors.foreground }]}>{details.name}</UiText>
          <UiText style={[styles.metaText, { color: theme.colors.muted }]}>{details.commune || details.address_line || translate("storeNoAddress")}</UiText>
          <UiText style={[styles.verified, { color: details.is_verified ? theme.colors.success : theme.colors.muted }]}>{details.is_verified ? translate("storeVerified") : translate("storeUnverified")}</UiText>
          {details.rating != null ? <RatingStars value={details.rating} showValue /> : null}
        </View>
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
        offers.isPending ? <LoadingState label={translate("stateLoading")} /> : offers.isError ? (
          <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void offers.refetch()} />
        ) : offers.data.length === 0 ? (
          <EmptyState title={translate("storeNoProducts")} hint={translate("storeNoDescription")} />
        ) : (
          <View style={styles.productGrid}>
            {offers.data.map((item) => (
              <ProductTile key={item.id} name={item.product.name} store={details.name} price={formatDZD(item.price)} imageUrl={getPrimaryImage(item)} onPress={() => router.push({ pathname: "/product/[productId]", params: { productId: item.product.id } })} />
            ))}
          </View>
        )
      ) : (
        <Card contentStyle={styles.aboutCard}>
          <UiText style={[styles.aboutTitle, { color: theme.colors.foreground }]}>{translate("storeAboutTitle")}</UiText>
          <UiText style={[styles.description, { color: theme.colors.muted }]}>{details.description || translate("storeNoDescription")}</UiText>
          <UiText style={[styles.fieldTitle, { color: theme.colors.accentMuted }]}>{translate("storeAddress")}</UiText>
          <UiText style={[styles.description, { color: theme.colors.muted }]}>{[details.address_line, details.commune].filter(Boolean).join("، ") || translate("storeNoAddress")}</UiText>
          {details.phone ? <><UiText style={[styles.fieldTitle, { color: theme.colors.accentMuted }]}>{translate("storePhone")}</UiText><UiText style={[styles.description, { color: theme.colors.muted }]}>{details.phone}</UiText></> : null}
          {details.whatsapp ? <><UiText style={[styles.fieldTitle, { color: theme.colors.accentMuted }]}>{translate("storeWhatsApp")}</UiText><UiText style={[styles.description, { color: theme.colors.muted }]}>{details.whatsapp}</UiText></> : null}
        </Card>
      )}
      <ReviewPanel targetType="store" targetId={storeId} />
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  cover: { height: 150, borderRadius: 20, overflow: "hidden" },
  storeHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 13, marginTop: -2 },
  logo: { width: 76, height: 76, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  storeTitleWrap: { flex: 1, alignItems: "flex-end", gap: 4 },
  storeName: { fontSize: 20, fontWeight: "900", textAlign: "right" },
  metaText: { fontSize: 12, textAlign: "right" },
  verified: { fontSize: 11, fontWeight: "800" },
  tabs: { width: "100%" },
  productGrid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  aboutCard: { padding: 16, gap: 11 },
  aboutTitle: { fontSize: 17, fontWeight: "900", textAlign: "right" },
  fieldTitle: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  description: { fontSize: 13, lineHeight: 22, textAlign: "right" }
});
