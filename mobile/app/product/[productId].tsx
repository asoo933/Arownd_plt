import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { CartButton } from "@/components/cart-button";
import { FavoriteButton } from "@/components/favorite-button";
import { chooseBestProductOffer, fetchProductDetails, fetchProductOffers, formatDZD, getOfferVariantOptions, getPrimaryImage } from "@/lib/catalog";
import { addToCart, CART_QUERY_KEY } from "@/lib/cart";
import { translate } from "@/lib/i18n";
import { useAppTheme } from "@/lib/theme";

export default function ProductDetailsScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const theme = useAppTheme();
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const queryClient = useQueryClient();
  const addMutation = useMutation({
    mutationFn: addToCart,
    onSuccess: (next) => {
      queryClient.setQueryData(CART_QUERY_KEY, next);
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    }
  });
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
  const variants = getOfferVariantOptions(selectedOffer);
  const selectedSize = variants.sizes.includes(size) ? size : variants.sizes[0] ?? "";
  const selectedColor = variants.colors.includes(color) ? color : variants.colors[0] ?? "";
  const canAdd = Boolean(selectedOffer && selectedOffer.is_available && selectedOffer.stock_quantity > 0 && quantity <= selectedOffer.stock_quantity);

  return (
    <CustomerScreen>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>{translate("back")}</Text>
      </Pressable>
      <View style={styles.titleRow}>
        <Text style={[styles.pageTitle, { color: theme.colors.foreground }]}>{translate("detailProductTitle")}</Text>
        <View style={styles.titleActions}><FavoriteButton kind="products" id={productId} /><CartButton /></View>
      </View>
      <View style={styles.heroImage}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={styles.imageFallback}>▧</Text>}
      </View>
      <View style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.productName, { color: theme.colors.foreground }]}>{product.data.name}</Text>
        {selectedOffer ? <Text style={styles.price}>{formatDZD(selectedOffer.price)}</Text> : null}
        <View style={styles.metadata}>
          {product.data.brand ? <Text style={styles.metaText}>{translate("productBrand")}: {product.data.brand}</Text> : null}
          {product.data.category ? <Text style={styles.metaText}>{translate("productCategory")}: {product.data.category}</Text> : null}
        </View>
        <Text style={styles.description}>{product.data.description || translate("productNoDescription")}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>{translate("productOffersTitle")}</Text>
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
              onPress={() => { setSelectedOfferId(offer.id); setSize(""); setColor(""); setQuantity(1); addMutation.reset(); }}
              style={[styles.offerCard, { backgroundColor: theme.colors.surface, borderColor: active ? "#829E19" : theme.colors.border }]}
            >
              <View style={styles.offerInfo}>
                <Text style={[styles.offerStore, { color: theme.colors.foreground }]}>{offer.store.name}</Text>
                <Text style={styles.metaText}>{offer.store.commune || offer.store.address_line || " "}</Text>
                <Text style={[styles.stock, { color: available ? "#647D13" : "#B45309" }]}>{available ? offer.stock_quantity <= 3 ? translate("productLowStock") : translate("productAvailable") : translate("productUnavailable")}</Text>
              </View>
              <Text style={styles.offerPrice}>{formatDZD(offer.price)}</Text>
            </Pressable>
          );
        })}
      </View>

      {selectedOffer ? (
        <View style={[styles.purchaseCard, { backgroundColor: theme.colors.surface }]}>
          {variants.colors.length > 0 ? <OptionPicker label={translate("productColorOption")} values={variants.colors} value={selectedColor} onSelect={setColor} dark={dark} /> : null}
          {variants.sizes.length > 0 ? <OptionPicker label={translate("productSizeOption")} values={variants.sizes} value={selectedSize} onSelect={setSize} dark={dark} /> : null}
          <View style={styles.quantityRow}>
            <Text style={[styles.optionLabel, { color: theme.colors.foreground }]}>{translate("productQuantity")}</Text>
            <View style={styles.quantityControls}>
              <Pressable accessibilityRole="button" disabled={quantity <= 1} onPress={() => setQuantity((value) => Math.max(1, value - 1))} style={styles.quantityButton}><Text style={styles.quantityButtonText}>−</Text></Pressable>
              <Text style={[styles.quantityValue, { color: theme.colors.foreground }]}>{quantity}</Text>
              <Pressable accessibilityRole="button" disabled={quantity >= Math.min(10, selectedOffer.stock_quantity)} onPress={() => setQuantity((value) => Math.min(10, selectedOffer.stock_quantity, value + 1))} style={styles.quantityButton}><Text style={styles.quantityButtonText}>+</Text></Pressable>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!canAdd || addMutation.isPending}
            onPress={() => addMutation.mutate({
              offerId: selectedOffer.id,
              productId: selectedOffer.product_id,
              name: product.data.name,
              price: selectedOffer.price,
              quantity,
              options: {
                ...(selectedColor ? { [translate("productColorOption")]: selectedColor } : {}),
                ...(selectedSize ? { [translate("productSizeOption")]: selectedSize } : {})
              }
            })}
            style={[styles.addButton, (!canAdd || addMutation.isPending) && styles.disabledButton]}
          >
            <Text style={styles.addButtonText}>{addMutation.isPending ? translate("productAddingToCart") : addMutation.isSuccess ? translate("productAddedToCart") : translate("productAddToCart")}</Text>
          </Pressable>
          {addMutation.isError ? <Text style={styles.mutationError}>{translate("genericError")}</Text> : null}
        </View>
      ) : null}

      {selectedOffer ? (
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/store/[storeId]", params: { storeId: selectedOffer.store.id } })} style={styles.storeButton}>
          <Text style={styles.storeButtonText}>{translate("productSelectedOffer")}: {selectedOffer.store.name}</Text>
        </Pressable>
      ) : null}
    </CustomerScreen>
  );
}

function OptionPicker({ label, values, value, onSelect, dark }: { label: string; values: string[]; value: string; onSelect: (value: string) => void; dark: boolean }) {
  return (
    <View style={styles.optionGroup}>
      <Text style={[styles.optionLabel, { color: theme.colors.foreground }]}>{label}</Text>
      <View style={styles.optionValues}>
        {values.map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: value === option }} onPress={() => onSelect(option)} style={[styles.optionChip, value === option && styles.optionChipActive]}><Text style={[styles.optionChipText, value === option && styles.optionChipTextActive]}>{option}</Text></Pressable>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 42, justifyContent: "center", alignItems: "flex-end" },
  backText: { color: "#647D13", fontSize: 13, fontWeight: "800" },
  titleRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 },
  pageTitle: { fontSize: 21, fontWeight: "900", textAlign: "right", flex: 1 },
  titleActions: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
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
  purchaseCard: { borderRadius: 18, padding: 14, gap: 13 },
  optionGroup: { gap: 8 },
  optionLabel: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  optionValues: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  optionChip: { minWidth: 42, minHeight: 38, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: "#D6D6D6", alignItems: "center", justifyContent: "center" },
  optionChipActive: { backgroundColor: "#C6F135", borderColor: "#829E19" },
  optionChipText: { color: "#555555", fontSize: 12, fontWeight: "700" },
  optionChipTextActive: { color: "#0A0A0A" },
  quantityRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  quantityControls: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  quantityButton: { width: 36, height: 36, borderRadius: 11, backgroundColor: "#F0F2E8", alignItems: "center", justifyContent: "center" },
  quantityButtonText: { color: "#0A0A0A", fontSize: 20, fontWeight: "900" },
  quantityValue: { minWidth: 20, textAlign: "center", fontSize: 14, fontWeight: "900" },
  addButton: { minHeight: 50, borderRadius: 14, backgroundColor: "#C6F135", justifyContent: "center", alignItems: "center" },
  addButtonText: { color: "#0A0A0A", fontSize: 14, fontWeight: "900" },
  disabledButton: { opacity: 0.4 },
  mutationError: { color: "#B42318", fontSize: 11, textAlign: "right" },
  storeButton: { minHeight: 48, borderRadius: 14, backgroundColor: "#C6F135", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  storeButtonText: { color: "#0A0A0A", fontSize: 13, fontWeight: "900" }
});
