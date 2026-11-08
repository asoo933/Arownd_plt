import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader, Button, FilterBar, FilterChip, MerchantMetricCard, MerchantStatusBadge, PriceDisplay, PressableSurface, Text as UiText, TextField } from "@/components/ui";
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
import { translate } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";

export default function MerchantProductsScreen() {
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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
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
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <UiText style={[styles.emptyTitle, { color: theme.colors.foreground }]}>{translate("merchantProductsEmpty")}</UiText>
            <UiText style={[styles.emptyHint, { color: theme.colors.muted }]}>{translate("merchantProductsEmptyHint")}</UiText>
          </View>
        ) : visibleOffers.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <UiText style={[styles.emptyTitle, { color: theme.colors.foreground }]}>{translate("merchantProductsNoResults")}</UiText>
          </View>
        ) : (
          <View style={styles.offerList}>
            {visibleOffers.map((offer) => (
              <MerchantOfferCard
                key={offer.id}
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
    <View style={[styles.offerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.productHeader}>
        <PressableSurface
          accessibilityRole={image ? "button" : undefined}
          accessibilityLabel={translate("merchantProductImagesLabel")}
          disabled={!image}
          onPress={() => setGalleryOpen(true)}
          style={[styles.productImage, { backgroundColor: theme.colors.surfaceMuted }]}
        >
          {image ? (
            <Image source={{ uri: image.image_url }} style={styles.image} resizeMode="cover" />
          ) : (
            <UiText style={[styles.imageFallback, { color: theme.colors.muted }]}>A</UiText>
          )}
        </PressableSurface>
        <View style={styles.productInfo}>
          <UiText style={[styles.productName, { color: theme.colors.foreground }]} numberOfLines={2}>
            {offer.product.name}
          </UiText>
          {offer.product.brand ? (
            <UiText style={[styles.productBrand, { color: theme.colors.muted }]} numberOfLines={1}>
              {offer.product.brand}
            </UiText>
          ) : null}
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
          <PriceDisplay value={formatDZD(offer.price)} />
        </View>
      </View>

      <View style={styles.inputsRow}>
        <View style={styles.inputGroup}>
          <UiText style={[styles.inputLabel, { color: theme.colors.muted }]}>{translate("merchantProductsPriceLabel")}</UiText>
          <TextField value={price} onChangeText={setPrice} keyboardType="number-pad" editable={!anyBusy} accessibilityLabel={translate("merchantProductsPriceLabel")} style={[styles.valueInput, { color: theme.colors.foreground, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]} />
        </View>
        <View style={styles.inputGroup}>
          <UiText style={[styles.inputLabel, { color: theme.colors.muted }]}>{translate("merchantProductsStockLabel")}</UiText>
          <TextField value={stock} onChangeText={setStock} keyboardType="number-pad" editable={!anyBusy} accessibilityLabel={translate("merchantProductsStockLabel")} style={[styles.valueInput, { color: theme.colors.foreground, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]} />
          <UiText style={[styles.stockHint, { color: theme.colors.subtle }]}>
            {translate("merchantProductsStockHint")}
          </UiText>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Button label={translate("merchantProductsSave")} onPress={() => onSave(price, stock)} loading={busy} disabled={anyBusy} fullWidth style={{ flex: 1 }} />
        <Button
          label={offer.is_merchant_hidden ? translate("merchantProductsShow") : translate("merchantProductsHide")}
          onPress={onToggleVisibility}
          disabled={anyBusy}
          variant="outline"
          size="sm"
          style={{ minWidth: 104 }}
        />
      </View>

      <Button label={translate("merchantProductEditOpen")} onPress={onEdit} disabled={anyBusy} variant="ghost" size="sm" fullWidth />

      <Modal
        visible={galleryOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGalleryOpen(false)}
      >
        <View style={[styles.galleryOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.galleryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.galleryHeader}>
              <UiText style={[styles.galleryTitle, { color: theme.colors.foreground }]}>
                {translate("merchantProductImagesLabel")}
              </UiText>
              <PressableSurface
                accessibilityRole="button"
                onPress={() => setGalleryOpen(false)}
                hitSlop={10}
              >
                <UiText style={[styles.galleryClose, { color: theme.colors.accentMuted }]}>
                  {translate("merchantProductCategoryClose")}
                </UiText>
              </PressableSurface>
            </View>
            <ScrollView
              horizontal
              contentContainerStyle={styles.galleryImages}
              showsHorizontalScrollIndicator={false}
            >
              {offer.images.map((item) => (
                <Image
                  key={item.id}
                  source={{ uri: item.image_url }}
                  style={styles.galleryImage}
                  resizeMode="contain"
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={styles.messageContainer}>
        {loading ? <ActivityIndicator color={theme.colors.accentMuted} /> : null}
        <UiText style={[styles.messageText, { color: theme.colors.foreground }]}>{title ?? label ?? ""}</UiText>
        {onAction && actionLabel ? <Button label={actionLabel} onPress={onAction} /> : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: 16, paddingBottom: 36, gap: 15 },
    header: { alignItems: "flex-end", gap: 6 },
    eyebrow: { fontSize: 10, fontWeight: "900" },
    title: { width: "100%", fontSize: 25, lineHeight: 33, fontWeight: "900", textAlign: "right" },
    subtitle: { width: "100%", fontSize: 12, lineHeight: 20, textAlign: "right" },
    summaryGrid: { flexDirection: "row-reverse", gap: 8 },
    summaryCard: { flex: 1, minHeight: 75, alignItems: "flex-end", justifyContent: "center" },
    searchInput: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, textAlign: "right", fontSize: 13 },
    filters: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7 },
    filterButton: { minHeight: 42, borderWidth: 1, borderRadius: 999, paddingHorizontal: 15, justifyContent: "center", alignItems: "center" },
    filterLabel: { fontSize: 11, fontWeight: "900" },
    feedback: { borderWidth: 1, borderRadius: 13, padding: 11 },
    feedbackText: { fontSize: 11, lineHeight: 18, fontWeight: "800", textAlign: "right" },
    emptyCard: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 7, alignItems: "flex-end" },
    emptyTitle: { fontSize: 14, fontWeight: "900", textAlign: "right" },
    emptyHint: { fontSize: 11, lineHeight: 18, textAlign: "right" },
    offerList: { gap: 12 },
    offerCard: { borderWidth: 1, borderRadius: 18, padding: 13, gap: 13 },
    productHeader: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 11 },
    productImage: { width: 76, height: 76, borderRadius: 15, overflow: "hidden", alignItems: "center", justifyContent: "center" },
    image: { width: "100%", height: "100%" },
    galleryOverlay: { flex: 1, justifyContent: "center", padding: 16 },
    galleryCard: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 12 },
    galleryHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
    galleryTitle: { fontSize: 13, fontWeight: "900" },
    galleryClose: { fontSize: 11, fontWeight: "800" },
    galleryImages: { flexDirection: "row-reverse", gap: 10, paddingVertical: 4 },
    galleryImage: { width: 260, height: 300, borderRadius: 12, backgroundColor: theme.colors.surfaceMuted },
    imageFallback: { fontSize: 24, fontWeight: "900" },
    productInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
    productName: { width: "100%", fontSize: 13, lineHeight: 19, fontWeight: "900", textAlign: "right" },
    productBrand: { width: "100%", fontSize: 10, textAlign: "right" },
    badgeRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 5, marginTop: 2 },
    currentPrice: { fontSize: 12, fontWeight: "900", marginTop: 1 },
    inputsRow: { flexDirection: "row-reverse", gap: 9 },
    inputGroup: { flex: 1, gap: 5 },
    inputLabel: { fontSize: 10, fontWeight: "800", textAlign: "right" },
    stockHint: { fontSize: 9, lineHeight: 14, textAlign: "right" },
    valueInput: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, textAlign: "right", fontSize: 14, fontWeight: "800" },
    actionsRow: { flexDirection: "row-reverse", gap: 8 },
    messageContainer: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 15 },
    messageText: { fontSize: 13, lineHeight: 21, fontWeight: "800", textAlign: "center" }
  });
}
