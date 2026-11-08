import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, ProductTile, LoadingState } from "@/components/customer-ui";
import { FavoriteButton } from "@/components/favorite-button";
import { fetchStoreDetails, fetchStoreOffers, formatDZD, getPrimaryImage } from "@/lib/catalog";
import { translate } from "@/lib/i18n";
import { ReviewPanel } from "@/components/review-panel";
import { useAppTheme } from "@/lib/theme";
import { IconButton } from "@/components/ui";

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
      <IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Text style={{ color: theme.colors.foreground, fontSize: 24 }}>‹</Text>} />
      <View style={[styles.cover, { backgroundColor: theme.colors.surfaceMuted }]}>
        {details.cover_url ? <Image source={{ uri: details.cover_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      </View>
      <View style={styles.storeHeader}>
        <View style={[styles.logo, { backgroundColor: theme.colors.surfaceMuted }]}>
          {details.logo_url ? <Image source={{ uri: details.logo_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={[styles.logoFallback, { color: theme.colors.subtle }]}>⌂</Text>}
        </View>
        <View style={styles.storeTitleWrap}>
          <Text style={[styles.storeName, { color: theme.colors.foreground }]}>{details.name}</Text>
          <FavoriteButton kind="stores" id={storeId} />
          <Text style={[styles.metaText, { color: theme.colors.muted }]}>{details.commune || details.address_line || " "}</Text>
          <Text style={[styles.verified, { color: details.is_verified ? theme.colors.success : theme.colors.muted }]}>{details.is_verified ? translate("storeVerified") : translate("storeUnverified")}</Text>
          {details.rating != null ? <Text style={[styles.rating, { color: theme.colors.warning }]}>★ {translate("storeRating")}: {details.rating.toFixed(1)}</Text> : null}
        </View>
      </View>

      <View style={[styles.tabs, { borderBottomColor: theme.colors.border }]}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === "products" }} onPress={() => setTab("products")} style={[styles.tab, tab === "products" && { borderBottomColor: theme.colors.accentMuted }, tab === "products" && styles.activeTab]}>
          <Text style={[styles.tabText, { color: tab === "products" ? theme.colors.accentMuted : theme.colors.muted }]}>{translate("storeProductsTitle")}</Text>
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === "about" }} onPress={() => setTab("about")} style={[styles.tab, tab === "about" && { borderBottomColor: theme.colors.accentMuted }, tab === "about" && styles.activeTab]}>
          <Text style={[styles.tabText, { color: tab === "about" ? theme.colors.accentMuted : theme.colors.muted }]}>{translate("storeAboutTitle")}</Text>
        </Pressable>
      </View>

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
        <View style={[styles.aboutCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.aboutTitle, { color: theme.colors.foreground }]}>{translate("storeAboutTitle")}</Text>
          <Text style={[styles.description, { color: theme.colors.muted }]}>{details.description || translate("storeNoDescription")}</Text>
          <Text style={[styles.fieldTitle, { color: theme.colors.accentMuted }]}>{translate("storeAddress")}</Text>
          <Text style={[styles.description, { color: theme.colors.muted }]}>{[details.address_line, details.commune].filter(Boolean).join("، ") || translate("storeNoAddress")}</Text>
          {details.phone ? <><Text style={[styles.fieldTitle, { color: theme.colors.accentMuted }]}>{translate("storePhone")}</Text><Text style={[styles.description, { color: theme.colors.muted }]}>{details.phone}</Text></> : null}
          {details.whatsapp ? <><Text style={[styles.fieldTitle, { color: theme.colors.accentMuted }]}>{translate("storeWhatsApp")}</Text><Text style={[styles.description, { color: theme.colors.muted }]}>{details.whatsapp}</Text></> : null}
        </View>
      )}
      <ReviewPanel targetType="store" targetId={storeId} />
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  cover: { height: 150, borderRadius: 20, overflow: "hidden" },
  storeHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 13, marginTop: -2 },
  logo: { width: 76, height: 76, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  logoFallback: { fontSize: 35 },
  storeTitleWrap: { flex: 1, alignItems: "flex-end", gap: 4 },
  storeName: { fontSize: 20, fontWeight: "900", textAlign: "right" },
  metaText: { fontSize: 12, textAlign: "right" },
  verified: { fontSize: 11, fontWeight: "800" },
  rating: { fontSize: 11, fontWeight: "700" },
  tabs: { flexDirection: "row-reverse", borderBottomWidth: 1 },
  tab: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
  activeTab: { borderBottomWidth: 2 },
  tabText: { fontSize: 12, fontWeight: "700" },
  productGrid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  aboutCard: { borderRadius: 18, padding: 16, gap: 11 },
  aboutTitle: { fontSize: 17, fontWeight: "900", textAlign: "right" },
  fieldTitle: { color: "#647D13", fontSize: 12, fontWeight: "800", textAlign: "right" },
  description: { fontSize: 13, lineHeight: 22, textAlign: "right" }
});
