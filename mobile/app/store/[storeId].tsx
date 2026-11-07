import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, ProductTile, LoadingState } from "@/components/customer-ui";
import { fetchStoreDetails, fetchStoreOffers, formatDZD, getPrimaryImage } from "@/lib/catalog";
import { translate } from "@/lib/i18n";

type StoreTab = "products" | "about";

export default function StoreDetailsScreen() {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const dark = useColorScheme() === "dark";
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
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>{translate("back")}</Text>
      </Pressable>
      <View style={styles.cover}>
        {details.cover_url ? <Image source={{ uri: details.cover_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      </View>
      <View style={styles.storeHeader}>
        <View style={styles.logo}>
          {details.logo_url ? <Image source={{ uri: details.logo_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={styles.logoFallback}>⌂</Text>}
        </View>
        <View style={styles.storeTitleWrap}>
          <Text style={[styles.storeName, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}>{details.name}</Text>
          <Text style={styles.metaText}>{details.commune || details.address_line || " "}</Text>
          <Text style={styles.verified}>{details.is_verified ? translate("storeVerified") : translate("storeUnverified")}</Text>
          {details.rating != null ? <Text style={styles.rating}>★ {translate("storeRating")}: {details.rating.toFixed(1)}</Text> : null}
        </View>
      </View>

      <View style={styles.tabs}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === "products" }} onPress={() => setTab("products")} style={[styles.tab, tab === "products" && styles.activeTab]}>
          <Text style={[styles.tabText, tab === "products" && styles.activeTabText]}>{translate("storeProductsTitle")}</Text>
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === "about" }} onPress={() => setTab("about")} style={[styles.tab, tab === "about" && styles.activeTab]}>
          <Text style={[styles.tabText, tab === "about" && styles.activeTabText]}>{translate("storeAboutTitle")}</Text>
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
        <View style={[styles.aboutCard, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
          <Text style={[styles.aboutTitle, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}>{translate("storeAboutTitle")}</Text>
          <Text style={styles.description}>{details.description || translate("storeNoDescription")}</Text>
          <Text style={styles.fieldTitle}>{translate("storeAddress")}</Text>
          <Text style={styles.description}>{[details.address_line, details.commune].filter(Boolean).join("، ") || translate("storeNoAddress")}</Text>
          {details.phone ? <><Text style={styles.fieldTitle}>{translate("storePhone")}</Text><Text style={styles.description}>{details.phone}</Text></> : null}
          {details.whatsapp ? <><Text style={styles.fieldTitle}>{translate("storeWhatsApp")}</Text><Text style={styles.description}>{details.whatsapp}</Text></> : null}
        </View>
      )}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 38, justifyContent: "center", alignItems: "flex-end" },
  backText: { color: "#647D13", fontSize: 13, fontWeight: "800" },
  cover: { height: 150, borderRadius: 20, backgroundColor: "#DDE5C8", overflow: "hidden" },
  storeHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 13, marginTop: -2 },
  logo: { width: 76, height: 76, borderRadius: 20, overflow: "hidden", backgroundColor: "#ECEFE4", alignItems: "center", justifyContent: "center" },
  logoFallback: { color: "#829E19", fontSize: 35 },
  storeTitleWrap: { flex: 1, alignItems: "flex-end", gap: 4 },
  storeName: { fontSize: 20, fontWeight: "900", textAlign: "right" },
  metaText: { color: "#737373", fontSize: 12, textAlign: "right" },
  verified: { color: "#647D13", fontSize: 11, fontWeight: "800" },
  rating: { color: "#A07812", fontSize: 11, fontWeight: "700" },
  tabs: { flexDirection: "row-reverse", borderBottomWidth: 1, borderBottomColor: "#D8D8D8" },
  tab: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#829E19" },
  tabText: { color: "#737373", fontSize: 12, fontWeight: "700" },
  activeTabText: { color: "#647D13" },
  productGrid: { flexDirection: "row-reverse", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  aboutCard: { borderRadius: 18, padding: 16, gap: 11 },
  aboutTitle: { fontSize: 17, fontWeight: "900", textAlign: "right" },
  fieldTitle: { color: "#647D13", fontSize: 12, fontWeight: "800", textAlign: "right" },
  description: { color: "#737373", fontSize: 13, lineHeight: 22, textAlign: "right" }
});
