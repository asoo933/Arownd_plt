import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState } from "@/components/customer-ui";
import { AppHeader, Button, Card, Icon, IconButton, OfferCard, PriceDisplay, ProductImageGallery, ProductQuantitySelector, ProductVariantSelector, RatingStars, StockBadge, Text as UiText } from "@/components/ui";
import { CartButton } from "@/components/cart-button";
import { FavoriteButton } from "@/components/favorite-button";
import { chooseBestProductOffer, fetchProductDetails, fetchProductOffers, formatDZD, getOfferVariantOptions, getPrimaryImage } from "@/lib/catalog";
import { addToCart, CART_QUERY_KEY } from "@/lib/cart";
import { fetchApprovedReviews } from "@/lib/reviews";
import { translate, useLanguage } from "@/lib/i18n";
import { ReviewPanel } from "@/components/review-panel";
import { designTokens, useAppTheme } from "@/lib/theme";

export default function ProductDetailsScreen() {
  useLanguage();
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
  const reviews = useQuery({
    queryKey: ["approved-reviews", "product", productId],
    queryFn: () => fetchApprovedReviews("product", productId),
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
  const reviewCount = reviews.data?.length ?? 0;
  const reviewAverage = reviewCount > 0
    ? reviews.data!.reduce((total, review) => total + review.rating, 0) / reviewCount
    : 0;

  return (
    <CustomerScreen
      footer={selectedOffer ? (
        <View style={styles.purchaseFooter}>
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
      ) : undefined}
    >
      <AppHeader
        title={translate("detailProductTitle")}
        leading={<IconButton accessibilityLabel={translate("back")} onPress={() => router.back()} icon={<Icon name="arrow-right" size={22} color={theme.colors.foreground} />} />}
        trailing={<CartButton />}
      />
      {imageUrl ? <ProductImageGallery images={[imageUrl]} accessibilityLabel={productDetails.name} onSelect={() => undefined} imageStyle={styles.heroImage} /> : <View style={[styles.heroImage, { backgroundColor: theme.colors.surfaceMuted }]}><Icon name="image" size={42} color={theme.colors.subtle} accessibilityHidden /></View>}
      <Card contentStyle={styles.infoCard}>
        <UiText weight="700" style={styles.productName}>{productDetails.name}</UiText>
        {selectedOffer ? <PriceDisplay value={formatDZD(selectedOffer.price)} style={styles.priceDisplay} /> : null}
        <View style={styles.ratingRow}>
          <View style={styles.ratingInfo}>
            <RatingStars value={reviewAverage} size={16} showValue />
            <UiText tone="muted" style={styles.reviewCount}>{reviewCount} · {translate("reviewsTitle")}</UiText>
          </View>
          <FavoriteButton kind="products" id={productId} iconOnly />
        </View>
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
            <OfferCard
              key={offer.id}
              accessibilityLabel={offer.store.name}
              onPress={() => { setSelectedOfferId(offer.id); setSize(""); setColor(""); setQuantity(1); addMutation.reset(); }}
              style={[styles.offerCard, { borderColor: active ? theme.colors.accentMuted : theme.colors.border, backgroundColor: active ? theme.colors.surfaceMuted : theme.colors.surface }]}
              contentStyle={styles.offerCardContent}
            >
              <View style={styles.offerInfo}>
                <UiText weight="800" style={styles.offerStore}>{offer.store.name}</UiText>
                <UiText tone="muted" style={styles.metaText}>{offer.store.commune || offer.store.address_line || " "}</UiText>
                <StockBadge
                  label={available ? offer.stock_quantity <= 3 ? translate("productLowStock") : translate("productAvailable") : translate("productUnavailable")}
                  tone={available ? offer.stock_quantity <= 3 ? "warning" : "success" : "danger"}
                />
              </View>
              <PriceDisplay value={formatDZD(offer.price)} style={styles.offerPriceDisplay} />
            </OfferCard>
          );
        })}
      </View>

      {selectedOffer ? (
        <Card contentStyle={styles.purchaseCard}>
          {variants.colors.length > 0 ? (
            <View style={styles.optionGroup}>
              <UiText style={styles.optionLabel}>{translate("productColorOption")}</UiText>
              <ProductVariantSelector
                options={variants.colors.map((value) => ({ value, label: value }))}
                value={selectedColor}
                onChange={setColor}
                accessibilityLabel={translate("productColorOption")}
                display="chips"
              />
            </View>
          ) : null}
          {variants.sizes.length > 0 ? (
            <View style={styles.optionGroup}>
              <UiText style={styles.optionLabel}>{translate("productSizeOption")}</UiText>
              <ProductVariantSelector
                options={variants.sizes.map((value) => ({ value, label: value }))}
                value={selectedSize}
                onChange={setSize}
                accessibilityLabel={translate("productSizeOption")}
                display="chips"
              />
            </View>
          ) : null}
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
        </Card>
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

const styles = StyleSheet.create({
  heroImage: { height: 300, borderRadius: designTokens.radius.lg, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  infoCard: { borderRadius: designTokens.radius.md, padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
  productName: { fontSize: designTokens.typography.title - 2, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  priceDisplay: { justifyContent: "flex-end" },
  ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md },
  ratingInfo: { flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: designTokens.spacing.sm },
  reviewCount: { fontSize: designTokens.typography.caption },
  metadata: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.md },
  metaText: { fontSize: designTokens.typography.caption + 1, textAlign: "auto" },
  description: { fontSize: designTokens.typography.body - 1, lineHeight: 22, textAlign: "auto" },
  section: { gap: designTokens.spacing.md },
  sectionTitle: { fontSize: designTokens.typography.subtitle + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  offerCard: { minHeight: 82 },
  offerCardContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: designTokens.spacing.md },
  offerInfo: { flex: 1, alignItems: "flex-start", gap: designTokens.spacing.xs },
  offerStore: { fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  stock: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
  offerPriceDisplay: { justifyContent: "flex-start" },
  purchaseCard: { borderRadius: designTokens.radius.md, padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
  optionGroup: { gap: designTokens.spacing.sm },
  optionLabel: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
  quantityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mutationError: { fontSize: designTokens.typography.caption, textAlign: "auto" },
  purchaseFooter: { gap: designTokens.spacing.xs },
});
