import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { FavoriteButton } from "@/components/favorite-button";
import { chooseBestProductOffer, fetchProductDetails, fetchProductOffers, formatDZD, getPrimaryImage } from "@/lib/catalog";
import { translate } from "@/lib/i18n";

export default function ProductDetailsScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const dark = useColorScheme() === "dark";
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const product = useQuery({
    queryKey: ["customer-product", productId],
    queryFn: () => fetchProductDetails(productId),
    enabled: Boolean(productId)
  });
  const offers = useQuery({
    queryKey: ["customer-product-offers", productId],
    queryFn: () => fetchProductOffers(productId),
    enabled: Boolean(productId)
  });

  if (product.isPending) return <CustomerScreen><LoadingState label={translate("stateLoading")} /></CustomerScreen>;
  if (product.isError) {
    return <CustomerScreen><ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void product.refetch()} /></CustomerScreen>;
  }
  if (!product.data) {
    return <CustomerScreen><EmptyState title={translate("detailNotFound")} hint={translate("productNoDescription")} /></CustomerScreen>;
  }

  const productOffers = offers.data ?? [];
  const bestOffer = chooseBestProductOffer(productOffers);
  const selectedOffer = productOffers.find((offer) => offer.id === selectedOfferId) ?? bestOffer;
  const imageUrl = selectedOffer ? getPrimaryImage(selectedOffer) : productOffers.map(getPrimaryImage).find(Boolean) ?? null;

  return (
    <CustomerScreen>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>{translate("back")}</Text>
      </Pressable>
      <View style={styles.titleRow}>
        <Text style={[styles.pageTitle, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}>{translate("detailProductTitle")}</Text>
        <FavoriteButton kind="products" id={productId} />
      </View>
      <View style={styles.heroImage}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={styles.imageFallback}>▧</Text>}
      </View>
      <View style={[styles.infoCard, { backgroundColor: dark ? "#171717" : "#FFFFFF" }]}>
        <Text style={[styles.productName, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}>{product.data.name}</Text>
        {selectedOffer ? <Text style={styles.price}>{formatDZD(selectedOffer.price)}</Text> : null}
        <View style={styles.metadata}>
          {product.data.brand ? <Text style={styles.metaText}>{translate("productBrand")}: {product.data.brand}</Text> : null}
          {product.data.category ? <Text style={styles.metaText}>{translate("productCategory")}: {product.data.category}</Text> : null}
        </View>
        <Text style={styles.description}>{product.data.description || translate("productNoDescription")}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}>{translate("productOffersTitle")}</Text>
        {offers.isPending ? <LoadingState label={translate("stateLoading")} /> : offers.isError ? (
          <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void offers.refetch()} />
        ) : productOffers.length === 0 ? (
          <EmptyState title={translate("productNoOffers")} hint={translate("productNoDescription")} />
        ) : productOffers.map((offer) => {
          const active = selectedOffer?.id === offer.id;
          const available = offer.is_available && offer.stock_quantity > 0;
          return (
            <Pressable
              key={offer.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedOfferId(offer.id)}
              style={[styles.offerCard, { backgroundColor: dark ? "#171717" : "#FFFFFF", borderColor: active ? "#829E19" : dark ? "#333333" : "#E5E5E5" }]}
            >
              <View style={styles.offerInfo}>
                <Text style={[styles.offerStore, { color: dark ? "#FFFFFF" : "#0A0A0A" }]}>{offer.store.name}</Text>
                <Text style={styles.metaText}>{offer.store.commune || offer.store.address_line || " "}</Text>
                <Text style={[styles.stock, { color: available ? "#647D13" : "#B45309" }]}>{available ? offer.stock_quantity <= 3 ? translate("productLowStock") : translate("productAvailable") : translate("productUnavailable")}</Text>
              </View>
              <Text style={styles.offerPrice}>{formatDZD(offer.price)}</Text>
            </Pressable>
          );
        })}
      </View>

      {selectedOffer ? (
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/store/[storeId]", params: { storeId: selectedOffer.store.id } })} style={styles.storeButton}>
          <Text style={styles.storeButtonText}>{translate("productSelectedOffer")}: {selectedOffer.store.name}</Text>
        </Pressable>
      ) : null}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 42, justifyContent: "center", alignItems: "flex-end" },
  backText: { color: "#647D13", fontSize: 13, fontWeight: "800" },
  titleRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 },
  pageTitle: { fontSize: 21, fontWeight: "900", textAlign: "right" },
  heroImage: { height: 300, borderRadius: 22, backgroundColor: "#ECEFE4", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  imageFallback: { color: "#8A9B55", fontSize: 46 },
  infoCard: { borderRadius: 18, padding: 16, gap: 10 },
  productName: { fontSize: 20, fontWeight: "900", textAlign: "right" },
  price: { color: "#647D13", fontSize: 22, fontWeight: "900", textAlign: "right" },
  metadata: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 12 },
  metaText: { color: "#737373", fontSize: 12, textAlign: "right" },
  description: { color: "#737373", fontSize: 13, lineHeight: 22, textAlign: "right" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "900", textAlign: "right" },
  offerCard: { minHeight: 82, borderWidth: 1.5, borderRadius: 16, padding: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12 },
  offerInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
  offerStore: { fontSize: 14, fontWeight: "800", textAlign: "right" },
  stock: { fontSize: 11, fontWeight: "800" },
  offerPrice: { color: "#647D13", fontSize: 14, fontWeight: "900" },
  storeButton: { minHeight: 48, borderRadius: 14, backgroundColor: "#C6F135", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  storeButtonText: { color: "#0A0A0A", fontSize: 13, fontWeight: "900" }
});
