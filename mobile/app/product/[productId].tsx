import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, Button, Card, Icon, IconButton, PriceDisplay, ProductImageGallery, ProductQuantitySelector, PressableSurface, Text as UiText } from "@/components/ui";
import { CartButton } from "@/components/cart-button";
import { FavoriteButton } from "@/components/favorite-button";
import { chooseBestProductOffer, fetchProductDetails, fetchProductOffers, formatDZD, getOfferVariantOptions, getPrimaryImage } from "@/lib/catalog";
import { addToCart, CART_QUERY_KEY } from "@/lib/cart";
import { translate } from "@/lib/i18n";
import { ReviewPanel } from "@/components/review-panel";
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

  const productDetails = product.data;
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
      <AppHeader
        title={translate("detailProductTitle")}
        leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="arrow-right" size={22} color={theme.colors.foreground} /> />}
        trailing={<><FavoriteButton kind="products" id={productId} /><CartButton /></>}
      />
      {imageUrl ? <ProductImageGallery images={[imageUrl]} accessibilityLabel={productDetails.name} onSelect={() => undefined} imageStyle={styles.heroImage} /> : <View style={[styles.heroImage, { backgroundColor: theme.colors.surfaceMuted }]}><Icon name="image" size={42} color={theme.colors.subtle} accessibilityHidden /></View>}
      <Card contentStyle={styles.infoCard}>
        <UiText weight="800" style={styles.productName}>{productDetails.name}</UiText>
        {selectedOffer ? <PriceDisplay value={formatDZD(selectedOffer.price)} style={styles.priceDisplay} /> : null}
        <View style={styles.metadata}>
          {productDetails.brand ? <UiText tone="muted" style={styles.metaText}>{translate("productBrand")}: {productDetails.brand}</UiText> : null}
          {productDetails.category ? <UiText tone="muted" style={styles.metaText}>{translate("productCategory")}: {productDetails.category}</UiText> : null}
        </View>
        <UiText tone="muted" style={styles.description}>{productDetails.description || translate("productNoDescription")}</UiText>
      </Card>

      <View style={styles.section}>
        <UiText weight="800" style={styles.sectionTitle}>{translate("productOffersTitle")}</UiText>
        {offers.isPending ? <LoadingState label={translate("stateLoading")} /> : offers.isError ? (
          <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void offers.refetch()} />
        ) : productOffers.length === 0 ? (
          <EmptyState title={translate("productNoOffers")} hint={translate("productNoDescription")} />
        ) : productOffers.map((offer) => {
          const active = selectedOffer?.id === offer.id;
          const available = offer.is_available && offer.stock_quantity > 0;
          return (
            <PressableSurface
              key={offer.id}
              accessibilityRole="button"
              accessibilityLabel={offer.store.name}
              accessibilityState={{ selected: active }}
              onPress={() => { setSelectedOfferId(offer.id); setSize(""); setColor(""); setQuantity(1); addMutation.reset(); }}
              style={[styles.offerCard, { backgroundColor: theme.colors.surface, borderColor: active ? theme.colors.accentMuted : theme.colors.border }]}
            >
              <View style={styles.offerInfo}>
                <UiText weight="800" style={styles.offerStore}>{offer.store.name}</UiText>
                <UiText tone="muted" style={styles.metaText}>{offer.store.commune || offer.store.address_line || " "}</UiText>
                <UiText tone={available ? "success" : "warning"} weight="700" style={styles.stock}>{available ? offer.stock_quantity <= 3 ? translate("productLowStock") : translate("productAvailable") : translate("productUnavailable")}</UiText>
              </View>
              <PriceDisplay value={formatDZD(offer.price)} style={styles.offerPriceDisplay} />
            </PressableSurface>
          );
        })}
      </View>

      {selectedOffer ? (
        <View style={[styles.purchaseCard, { backgroundColor: theme.colors.surface }]}>
          {variants.colors.length > 0 ? <OptionPicker label={translate("productColorOption")} values={variants.colors} value={selectedColor} onSelect={setColor} /> : null}
          {variants.sizes.length > 0 ? <OptionPicker label={translate("productSizeOption")} values={variants.sizes} value={selectedSize} onSelect={setSize} /> : null}
          <View style={styles.quantityRow}>
            <UiText weight="700" style={styles.optionLabel}>{translate("productQuantity")}</UiText>
            <ProductQuantitySelector
              value={quantity}
              max={Math.max(1, Math.min(10, selectedOffer.stock_quantity))}
              onChange={setQuantity}
              decreaseLabel={translate("cartDecrease")}
              increaseLabel={translate("cartIncrease")}
              disabled={!selectedOffer.is_available || selectedOffer.stock_quantity <= 0}
            />
          </View>
          <Button
            label={addMutation.isPending ? translate("productAddingToCart") : addMutation.isSuccess ? translate("productAddedToCart") : translate("productAddToCart")}
            onPress={() => addMutation.mutate({
              offerId: selectedOffer.id,
              productId: selectedOffer.product_id,
              name: product.data?.name ?? selectedOffer.product.name,
              price: selectedOffer.price,
              quantity,
              options: {
                ...(selectedColor ? { color: selectedColor } : {}),
                ...(selectedSize ? { size: selectedSize } : {})
              }
            })}
            loading={addMutation.isPending}
            disabled={!canAdd}
            fullWidth
          />
          {addMutation.isError ? <UiText tone="danger" style={styles.mutationError}>{translate("genericError")}</UiText> : null}
        </View>
      ) : null}

      {selectedOffer ? (
        <Button
          label={translate("productSelectedOffer") + ": " + selectedOffer.store.name}
          onPress={() => router.push({ pathname: "/store/[storeId]", params: { storeId: selectedOffer.store.id } })}
          fullWidth
        />
      ) : null}
      <ReviewPanel targetType="product" targetId={productId} />
    </CustomerScreen>
  );
}

function OptionPicker({ label, values, value, onSelect }: { label: string; values: string[]; value: string; onSelect: (value: string) => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.optionGroup}>
      <UiText style={[styles.optionLabel, { color: theme.colors.foreground }]}>{label}</UiText>
      <View style={styles.optionValues}>
        {values.map((option) => <PressableSurface key={option} accessibilityRole="button" accessibilityLabel={label + ": " + option} accessibilityState={{ selected: value === option }} onPress={() => onSelect(option)} style={[styles.optionChip, { backgroundColor: value === option ? theme.colors.accent : theme.colors.surface, borderColor: value === option ? theme.colors.accentMuted : theme.colors.border }]}><UiText style={[styles.optionChipText, { color: value === option ? theme.colors.accentForeground : theme.colors.foreground }]}>{option}</UiText></PressableSurface>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroImage: { height: 300, borderRadius: 22, backgroundColor: "#ECEFE4", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  imageFallback: { color: "#8A9B55", fontSize: 46 },
  infoCard: { borderRadius: 18, padding: 16, gap: 10 },
  productName: { fontSize: 20, fontWeight: "900", textAlign: "right" },
  priceDisplay: { justifyContent: "flex-end" },
  price: { fontSize: 22, fontWeight: "900", textAlign: "right" },
  metadata: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 12 },
  metaText: { fontSize: 12, textAlign: "right" },
  description: { fontSize: 13, lineHeight: 22, textAlign: "right" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "900", textAlign: "right" },
  offerCard: { minHeight: 82, borderWidth: 1.5, borderRadius: 16, padding: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 12 },
  offerInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
  offerStore: { fontSize: 14, fontWeight: "800", textAlign: "right" },
  stock: { fontSize: 11, fontWeight: "800" },
  offerPriceDisplay: { justifyContent: "flex-start" },
  offerPrice: { fontSize: 14, fontWeight: "900" },
  purchaseCard: { borderRadius: 18, padding: 14, gap: 13 },
  optionGroup: { gap: 8 },
  optionLabel: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  optionValues: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  optionChip: { minWidth: 44, minHeight: 44, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  optionChipText: { fontSize: 12, fontWeight: "700" },
  quantityRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  mutationError: { color: "#B42318", fontSize: 11, textAlign: "right" },
});
