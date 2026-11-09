import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, Button, Card, ErrorState, FilterBar, FilterChip, Icon, Image as UiImage, LoadingState, MediaViewer, MerchantMetricCard, MerchantStatusBadge, PriceDisplay, PressableSurface, Text as UiText, TextField } from "@/components/ui";
import { formatDZD } from "@/lib/catalog";
import {
  fetchMerchantAccess
} from "@/lib/merchant";
import {
  fetchMerchantProducts,
  setMerchantProductVisibility,
  updateMerchantProductOffer
} from "@/lib/merchant-products";
import {
  filterMerchantProducts,
  getMerchantInventoryLevel,
  getMerchantInventorySummary,
  validateMerchantOfferValues,
  type MerchantInventoryFilter,
  type MerchantProductOffer
} from "@/lib/merchant-products-state";
import { translate, useLanguage } from "@/lib/i18n";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";

export default function MerchantProductsScreen() {
  useLanguage();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MerchantInventoryFilter>("all");
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const access = useQuery({
    queryKey: ["merchant-access"],
    queryFn: fetchMerchantAccess,
    retry: false
  });

  const storeId = access.data?.store?.id ?? null;
  const ready = access.data?.status === "merchant_ready" && !!storeId;

  const products = useQuery({
    queryKey: ["merchant-products", storeId],
    queryFn: () => fetchMerchantProducts(storeId ?? ""),
    enabled: ready,
    retry: false
  });

  const saveOffer = async (
    offer: MerchantProductOffer,
    priceInput: string,
    stockInput: string
  ): Promise<void> => {
    if (!storeId || busyOfferId) return;

    const values = validateMerchantOfferValues(priceInput, stockInput);
    if (!values) {
      setNotice(null);
      setActionError(translate("merchantProductsValidation"));
      return;
    }

    setBusyOfferId(offer.id);
    setNotice(null);
    setActionError(null);

    try {
      await updateMerchantProductOffer(offer.id, storeId, values);
      await queryClient.invalidateQueries({ queryKey: ["merchant-products", storeId] });
      await queryClient.invalidateQueries({ queryKey: ["merchant-dashboard", storeId] });
      setNotice(translate("merchantProductsSaved"));
    } catch {
      setActionError(translate("merchantProductsSaveError"));
    } finally {
      setBusyOfferId(null);
    }
  };

  const toggleVisibility = async (offer: MerchantProductOffer): Promise<void> => {
    if (!storeId || busyOfferId) return;

    setBusyOfferId(offer.id);
    setNotice(null);
    setActionError(null);

    try {
      await setMerchantProductVisibility(offer.id, storeId, offer.is_merchant_hidden);
      await queryClient.invalidateQueries({ queryKey: ["merchant-products", storeId] });
      setNotice(translate("merchantProductsSaved"));
    } catch {
      setActionError(translate("merchantProductsVisibilityError"));
    } finally {
      setBusyOfferId(null);
    }
  };

  if (access.isPending) {
    return <MessageScreen theme={theme} loading label={translate("merchantLoading")} />;
  }

  if (access.isError) {
    return (
      <MessageScreen
        theme={theme}
        title={translate("merchantLoadError")}
        actionLabel={translate("merchantRetry")}
        onAction={() => void access.refetch()}
      />
    );
  }

  if (!access.data) return <Redirect href="/login" />;
  if (!ready) return <Redirect href="/merchant" />;

  if (products.isPending) {
    return <MessageScreen theme={theme} loading label={translate("merchantProductsLoading")} />;
  }

  if (products.isError) {
    return (
      <MessageScreen
        theme={theme}
        title={translate("merchantProductsLoadError")}
        actionLabel={translate("merchantRetry")}
        onAction={() => void products.refetch()}
      />
    );
  }

  const allOffers = products.data;
  const summary = getMerchantInventorySummary(allOffers);
  const visibleOffers = filterMerchantProducts(allOffers, search, filter);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppHeader
          title={translate("merchantProductsTitle")}
          leading={<Button label={translate("merchantProductsBack")} onPress={() => router.replace("/merchant")} variant="ghost" size="sm" />}
        />
        <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("merchantProductsSubtitle")}</UiText>

        <Button label={translate("merchantProductCreateOpen")} onPress={() => router.push("/merchant/products/new")} fullWidth />

        <View style={styles.summaryGrid}>
          <MerchantMetricCard label={translate("merchantProductsSummaryTotal")} value={String(summary.total)} style={styles.summaryCard} />
          <MerchantMetricCard label={translate("merchantProductsSummaryLow")} value={String(summary.low)} valueTone="warning" style={styles.summaryCard} />
          <MerchantMetricCard label={translate("merchantProductsSummaryOut")} value={String(summary.out)} valueTone="danger" style={styles.summaryCard} />
        </View>

        <TextField
          value={search}
          onChangeText={setSearch}
          placeholder={translate("merchantProductsSearchPlaceholder")}
          accessibilityLabel={translate("merchantProductsSearchPlaceholder")}
          returnKeyType="search"
          style={[styles.searchInput, { color: theme.colors.foreground, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        />

        <FilterBar style={styles.filters}>
          <FilterChip label={translate("merchantProductsFilterAll")} selected={filter === "all"} onPress={() => setFilter("all")} />
          <FilterChip label={translate("merchantProductsFilterLow")} selected={filter === "low"} onPress={() => setFilter("low")} />
          <FilterChip label={translate("merchantProductsFilterOut")} selected={filter === "out"} onPress={() => setFilter("out")} />
          <FilterChip label={translate("merchantProductsHidden")} selected={filter === "hidden"} onPress={() => setFilter("hidden")} />
        </FilterBar>

        {notice ? (
          <View style={[styles.feedback, { backgroundColor: theme.colors.successSurface, borderColor: theme.colors.successBorder }]}>
            <UiText style={[styles.feedbackText, { color: theme.colors.success }]}>{notice}</UiText>
          </View>
        ) : null}
        {actionError ? (
          <View style={[styles.feedback, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerBorder }]}>
            <UiText style={[styles.feedbackText, { color: theme.colors.danger }]}>{actionError}</UiText>
          </View>
        ) : null}

        {allOffers.length === 0 ? (
          <Card contentStyle={styles.emptyCard}>
            <UiText style={[styles.emptyTitle, { color: theme.colors.foreground }]}>{translate("merchantProductsEmpty")}</UiText>
            <UiText style={[styles.emptyHint, { color: theme.colors.muted }]}>{translate("merchantProductsEmptyHint")}</UiText>
          </Card>
        ) : visibleOffers.length === 0 ? (
          <Card contentStyle={styles.emptyCard}>
            <UiText style={[styles.emptyTitle, { color: theme.colors.foreground }]}>{translate("merchantProductsNoResults")}</UiText>
          </Card>
        ) : (
          <View style={styles.offerGrid}>
            {visibleOffers.map((offer) => (
              <View key={offer.id} style={styles.offerGridItem}>
                <MerchantOfferCard
                  offer={offer}
                  theme={theme}
                  busy={busyOfferId === offer.id}
                  anyBusy={busyOfferId !== null}
                  onSave={(price, stock) => void saveOffer(offer, price, stock)}
                  onToggleVisibility={() => void toggleVisibility(offer)}
                  onEdit={() => router.push({
                    pathname: "/merchant/products/[offerId]",
                    params: { offerId: offer.id }
                  })}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MerchantOfferCard({
  offer,
  theme,
  busy,
  anyBusy,
  onSave,
  onToggleVisibility,
  onEdit
}: {
  offer: MerchantProductOffer;
  theme: AppTheme;
  busy: boolean;
  anyBusy: boolean;
  onSave: (price: string, stock: string) => void;
  onToggleVisibility: () => void;
  onEdit: () => void;
}) {
  const styles = createStyles(theme);
  const [price, setPrice] = useState(String(offer.price));
  const [stock, setStock] = useState(String(offer.stock_quantity));
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    setPrice(String(offer.price));
    setStock(String(offer.stock_quantity));
  }, [offer.price, offer.stock_quantity]);

  const image = offer.images.find((item) => item.is_primary) ?? offer.images[0] ?? null;
  const inventoryLevel = getMerchantInventoryLevel(offer.stock_quantity);
  const inventoryLabel = inventoryLevel === "out"
    ? translate("merchantProductsOut")
    : inventoryLevel === "low"
      ? translate("merchantProductsLow")
      : translate("merchantProductsAvailable");

  return (
    <Card style={{ backgroundColor: theme.colors.surface, width: "100%" }} contentStyle={styles.offerCard}>
      <PressableSurface
        accessibilityRole={image ? "button" : undefined}
        accessibilityLabel={translate("merchantProductImagesLabel")}
        disabled={!image}
        onPress={() => setGalleryOpen(true)}
        style={[styles.productImage, { backgroundColor: theme.colors.surfaceMuted }]}
      >
        {image ? (
          <UiImage
            uri={image.image_url}
            accessibilityLabel={translate("merchantProductImagesLabel")}
            aspectRatio={1}
            style={styles.image}
          />
        ) : (
          <Icon name="image" color={theme.colors.muted} size={28} accessibilityHidden />
        )}
      </PressableSurface>

      <View style={styles.badgeRow}>
        <MerchantStatusBadge
          label={inventoryLabel}
          tone={inventoryLevel === "out" ? "danger" : inventoryLevel === "low" ? "warning" : "success"}
        />
        <MerchantStatusBadge
          label={offer.is_merchant_hidden ? translate("merchantProductsHidden") : translate("merchantProductsVisible")}
          tone={offer.is_merchant_hidden ? "neutral" : "accent"}
        />
      </View>

      <View style={styles.productInfo}>
        <UiText style={[styles.productName, { color: theme.colors.foreground }]} numberOfLines={2}>
          {offer.product.name}
        </UiText>
        {offer.product.brand ? (
          <UiText style={[styles.productBrand, { color: theme.colors.muted }]} numberOfLines={1}>
            {offer.product.brand}
          </UiText>
        ) : null}
        <PriceDisplay value={formatDZD(offer.price)} />
      </View>

      <View style={styles.inputsRow}>
        <View style={styles.inputGroup}>
          <UiText style={[styles.inputLabel, { color: theme.colors.muted }]}>{translate("merchantProductsPriceLabel")}</UiText>
          <TextField
            value={price}
            onChangeText={setPrice}
            keyboardType="number-pad"
            editable={!anyBusy}
            accessibilityLabel={translate("merchantProductsPriceLabel")}
            style={[styles.valueInput, { color: theme.colors.foreground, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
          />
        </View>
        <View style={styles.inputGroup}>
          <UiText style={[styles.inputLabel, { color: theme.colors.muted }]}>{translate("merchantProductsStockLabel")}</UiText>
          <TextField
            value={stock}
            onChangeText={setStock}
            keyboardType="number-pad"
            editable={!anyBusy}
            accessibilityLabel={translate("merchantProductsStockLabel")}
            style={[styles.valueInput, { color: theme.colors.foreground, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
          />
          <UiText style={[styles.stockHint, { color: theme.colors.subtle }]}>
            {translate("merchantProductsStockHint")}
          </UiText>
        </View>
      </View>

      <Button
        label={translate("merchantProductsSave")}
        onPress={() => onSave(price, stock)}
        loading={busy}
        disabled={anyBusy}
        fullWidth
      />
      <View style={styles.actionsRow}>
        <Button
          label={offer.is_merchant_hidden ? translate("merchantProductsShow") : translate("merchantProductsHide")}
          onPress={onToggleVisibility}
          disabled={anyBusy}
          variant="outline"
          size="sm"
          fullWidth
          style={{ flex: 1 }}
        />
        <Button
          label={translate("merchantProductEditOpen")}
          onPress={onEdit}
          disabled={anyBusy}
          variant="ghost"
          size="sm"
          fullWidth
          style={{ flex: 1 }}
        />
      </View>

      <MediaViewer
        visible={galleryOpen}
        onRequestClose={() => setGalleryOpen(false)}
        closeLabel={translate("merchantProductCategoryClose")}
      >
        <ScrollView
          horizontal
          contentContainerStyle={styles.galleryImages}
          showsHorizontalScrollIndicator={false}
        >
          {offer.images.map((item) => (
            <UiImage
              key={item.id}
              uri={item.image_url}
              accessibilityLabel={translate("merchantProductImagesLabel")}
              aspectRatio={260 / 300}
              style={styles.galleryImage}
              resizeMode="contain"
            />
          ))}
        </ScrollView>
      </MediaViewer>
    </Card>
  );
}


function MessageScreen({
  theme,
  title,
  label,
  actionLabel,
  onAction,
  loading = false
}: {
  theme: AppTheme;
  title?: string;
  label?: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  const styles = createStyles(theme);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={styles.messageContainer}>
        {loading ? (
          <LoadingState label={label ?? ""} />
        ) : onAction && actionLabel ? (
          <ErrorState title={title ?? label ?? ""} retryLabel={actionLabel} onRetry={onAction} />
        ) : (
          <UiText style={[styles.messageText, { color: theme.colors.foreground }]}>{title ?? label ?? ""}</UiText>
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: designTokens.spacing.lg, paddingBottom: 36, gap: designTokens.spacing.lg },
    header: { alignItems: "flex-start", gap: designTokens.spacing.xs },
    eyebrow: { fontSize: designTokens.typography.caption - 1, fontWeight: designTokens.fontWeights.extrabold },
    title: { width: "100%", fontSize: designTokens.typography.display - 4, lineHeight: 33, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    subtitle: { width: "100%", fontSize: designTokens.typography.caption + 1, lineHeight: 20, textAlign: "auto" },
    summaryGrid: { flexDirection: "row", gap: designTokens.spacing.sm },
    summaryCard: { flex: 1, minHeight: 75, alignItems: "flex-start", justifyContent: "center" },
    searchInput: { minHeight: designTokens.dimensions.controlHeight.lg, borderWidth: 1, borderRadius: designTokens.radius.md, paddingHorizontal: designTokens.spacing.lg, textAlign: "auto", fontSize: designTokens.typography.body - 1 },
    filters: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm },
    filterButton: { minHeight: 42, borderWidth: 1, borderRadius: designTokens.radius.pill, paddingHorizontal: 15, justifyContent: "center", alignItems: "center" },
    filterLabel: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
    feedback: { borderWidth: 1, borderRadius: designTokens.radius.sm, padding: designTokens.spacing.md },
    feedbackText: { fontSize: designTokens.typography.caption, lineHeight: 18, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    emptyCard: { gap: designTokens.spacing.sm, alignItems: "flex-start" },
    emptyTitle: { fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    emptyHint: { fontSize: designTokens.typography.caption, lineHeight: 18, textAlign: "auto" },
    offerGrid: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: designTokens.spacing.md },
    offerGridItem: { flexBasis: "47%", flexGrow: 1, maxWidth: "50%", minWidth: 0 },
    offerCard: { padding: designTokens.spacing.sm, gap: designTokens.spacing.sm },
    productImage: { width: "100%", aspectRatio: 1, borderRadius: designTokens.radius.md, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    image: { width: "100%", height: "100%" },
    galleryOverlay: { flex: 1, justifyContent: "center", padding: designTokens.spacing.lg },
    galleryCard: { borderWidth: 1, borderRadius: designTokens.radius.md, padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
    galleryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    galleryTitle: { fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.extrabold },
    galleryClose: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
    galleryImages: { flexDirection: "row", gap: designTokens.spacing.md, paddingVertical: 4 },
    galleryImage: { width: 260, height: 300, borderRadius: designTokens.radius.sm, backgroundColor: theme.colors.surfaceMuted },
    imageFallback: { fontSize: designTokens.typography.title + 2, fontWeight: designTokens.fontWeights.extrabold },
    productInfo: { width: "100%", alignItems: "flex-start", gap: designTokens.spacing.xs },
    productName: { width: "100%", fontSize: designTokens.typography.body - 1, lineHeight: 19, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    productBrand: { width: "100%", fontSize: designTokens.typography.caption - 1, textAlign: "auto" },
    badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.xs, marginTop: 2 },
    currentPrice: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, marginTop: 1 },
    inputsRow: { flexDirection: "row", gap: designTokens.spacing.xs },
    inputGroup: { flex: 1, gap: designTokens.spacing.xs },
    inputLabel: { fontSize: designTokens.typography.caption - 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    stockHint: { fontSize: designTokens.typography.caption - 2, lineHeight: 14, textAlign: "auto" },
    valueInput: { minHeight: 42, borderWidth: 1, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.xs, textAlign: "auto", fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
    actionsRow: { flexDirection: "row", gap: designTokens.spacing.sm },
    messageContainer: { flex: 1, padding: designTokens.spacing.xxl, justifyContent: "center", alignItems: "center", gap: designTokens.spacing.lg },
    messageText: { fontSize: designTokens.typography.body - 1, lineHeight: 21, fontWeight: designTokens.fontWeights.extrabold, textAlign: "center" }
  });
}
