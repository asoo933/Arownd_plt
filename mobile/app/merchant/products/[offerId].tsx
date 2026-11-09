import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  addMerchantProductImage,
  fetchMerchantProductOffer,
  removeMerchantProductImage,
  updateMerchantProductDetails,
  updateMerchantProductOffer
} from "@/lib/merchant-products";
import {
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MAX_COUNT,
  validateProductImageMetadata
} from "@/lib/merchant-product-images";
import {
  validateMerchantOfferOptions,
  validateMerchantOfferValues,
  validateMerchantProductDetails
} from "@/lib/merchant-products-state";
import { fetchMerchantAccess, fetchMerchantCategories } from "@/lib/merchant";
import { getSelectableMerchantCategories, groupMerchantCategories } from "@/lib/merchant-category-state";
import { translate, useLanguage } from "@/lib/i18n";
import { getLocalizedMerchantCategoryLabel } from "@/lib/locale-data";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { BottomSheet, AppHeader, Button, Card, ConfirmDialog, ErrorState, Icon, Image as UiImage, LoadingState, MediaViewer, Spinner, PressableSurface, Text as UiText, TextField } from "@/components/ui";

export default function MerchantEditProductScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ offerId: string | string[] }>();
  const offerId = Array.isArray(params.offerId) ? params.offerId[0] : params.offerId;

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productBrand, setProductBrand] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{
    id: string;
    image_url: string;
    is_primary: boolean;
  } | null>(null);
  const [previewImage, setPreviewImage] = useState<{ uri: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const access = useQuery({
    queryKey: ["merchant-access"],
    queryFn: fetchMerchantAccess,
    retry: false
  });

  const storeId = access.data?.store?.id ?? null;
  const ready = access.data?.status === "merchant_ready" && !!storeId;

  const offerQuery = useQuery({
    queryKey: ["merchant-product", storeId, offerId],
    queryFn: () => fetchMerchantProductOffer(storeId ?? "", offerId ?? ""),
    enabled: ready && !!offerId,
    retry: false
  });

  const offer = offerQuery.data;
  const categoriesQuery = useQuery({
    queryKey: ["merchant-categories"],
    queryFn: fetchMerchantCategories,
    enabled: ready,
    staleTime: 5 * 60 * 1000,
    retry: false
  });
  const selectableCategories = getSelectableMerchantCategories(
    groupMerchantCategories(categoriesQuery.data ?? [])
  );
  const selectedCategory = selectableCategories.find(
    (category) => category.id === productCategory
  );

  useEffect(() => {
    if (!offer) return;
    setProductName(offer.product.name);
    setProductDescription(offer.product.description ?? "");
    setProductBrand(offer.product.brand ?? "");
    setProductCategory(offer.product.category);
    setPrice(String(offer.price));
    setStock(String(offer.stock_quantity));
    setSizes(offer.options.sizes.join(", "));
    setColors(offer.options.colors.join(", "));
  }, [
    offer?.id,
    offer?.product.name,
    offer?.product.description,
    offer?.product.brand,
    offer?.product.category,
    offer?.price,
    offer?.stock_quantity,
    offer?.options.sizes,
    offer?.options.colors
  ]);

  const refreshProductData = async (): Promise<void> => {
    if (!storeId || !offerId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["merchant-product", storeId, offerId] }),
      queryClient.invalidateQueries({ queryKey: ["merchant-products", storeId] }),
      queryClient.invalidateQueries({ queryKey: ["merchant-dashboard", storeId] })
    ]);
  };

  const saveOffer = async (): Promise<void> => {
    if (!storeId || !offerId || saving || detailsSaving || imageBusy || removingImageId) return;

    const values = validateMerchantOfferValues(price, stock);
    if (!values) {
      setNotice(null);
      setWarning(null);
      setActionError(translate("merchantProductEditValidation"));
      return;
    }

    const options = validateMerchantOfferOptions(sizes, colors);
    if (!options) {
      setNotice(null);
      setWarning(null);
      setActionError(translate("merchantProductOptionsInvalid"));
      return;
    }

    setSaving(true);
    setNotice(null);
    setWarning(null);
    setActionError(null);
    try {
      await updateMerchantProductOffer(offerId, storeId, { ...values, options });
      await refreshProductData();
      setNotice(translate("merchantProductEditSaved"));
    } catch {
      setActionError(translate("merchantProductEditError"));
    } finally {
      setSaving(false);
    }
  };

  const saveProductDetails = async (): Promise<void> => {
    if (!storeId || !offerId || saving || detailsSaving || imageBusy || removingImageId) return;

    const values = validateMerchantProductDetails(
      productName,
      productDescription,
      productBrand,
      productCategory
    );
    if (!values) {
      setNotice(null);
      setWarning(null);
      setActionError(translate("merchantProductDetailsValidation"));
      return;
    }

    setDetailsSaving(true);
    setNotice(null);
    setWarning(null);
    setActionError(null);
    try {
      await updateMerchantProductDetails(offerId, storeId, values);
      await refreshProductData();
      setNotice(translate("merchantProductDetailsSaved"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setActionError(
        message.includes("merchant_product_shared")
          ? translate("merchantProductDetailsSharedError")
          : translate("merchantProductDetailsSaveError")
      );
    } finally {
      setDetailsSaving(false);
    }
  };

  const chooseAndUploadImage = async (): Promise<void> => {
    if (!storeId || !offerId || !offer || saving || detailsSaving || imageBusy || removingImageId) return;
    if (offer.images.length >= PRODUCT_IMAGE_MAX_COUNT) {
      setActionError(translate("merchantProductImagesLimit"));
      return;
    }

    setImageBusy(true);
    setNotice(null);
    setWarning(null);
    setActionError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        selectionLimit: 1,
        quality: 0.85
      });

      if (result.canceled) return;
      const asset: ImagePickerAsset | undefined = result.assets[0];
      if (!asset) return;

      const metadata = {
        mimeType: asset.mimeType ?? null,
        fileName: asset.fileName ?? null,
        fileSize: asset.fileSize ?? null
      };

      if (
        asset.fileSize !== null &&
        asset.fileSize !== undefined &&
        asset.fileSize > PRODUCT_IMAGE_MAX_BYTES
      ) {
        setActionError(translate("merchantProductImageTooLarge"));
        return;
      }
      if (!validateProductImageMetadata(metadata)) {
        setActionError(translate("merchantProductImageInvalid"));
        return;
      }

      await addMerchantProductImage(storeId, offerId, asset);
      await refreshProductData();
      setNotice(translate("merchantProductImageAdded"));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.endsWith("cleanup_required")) {
        setWarning(translate("merchantProductImageUploadCleanupPending"));
      } else {
        setActionError(
          errorMessage === "product_image_limit_reached"
            ? translate("merchantProductImagesLimit")
            : translate("merchantProductImageAddError")
        );
      }
    } finally {
      setImageBusy(false);
    }
  };

  const confirmRemoveImage = async (): Promise<void> => {
    if (!storeId || !offerId || !pendingRemoval || removingImageId || imageBusy || saving || detailsSaving) return;

    const imageId = pendingRemoval.id;
    setPendingRemoval(null);
    setRemovingImageId(imageId);
    setNotice(null);
    setWarning(null);
    setActionError(null);

    try {
      const result = await removeMerchantProductImage(storeId, offerId, imageId);
      await refreshProductData();
      if (result.storageCleanupPending || result.primaryPromotionPending) {
        setWarning(translate("merchantProductImageCleanupPending"));
      } else {
        setNotice(translate("merchantProductImageRemoved"));
      }
    } catch {
      setActionError(translate("merchantProductImageRemoveError"));
    } finally {
      setRemovingImageId(null);
    }
  };

  if (access.isPending) {
    return <MessageScreen theme={theme} label={translate("merchantProductEditLoading")} loading />;
  }
  if (access.isError) {
    return (
      <MessageScreen
        theme={theme}
        label={translate("merchantLoadError")}
        actionLabel={translate("merchantRetry")}
        onAction={() => void access.refetch()}
      />
    );
  }
  if (!access.data) return <Redirect href="/login" />;
  if (!ready) return <Redirect href="/merchant" />;
  if (!offerId) {
    return (
      <MessageScreen
        theme={theme}
        label={translate("merchantProductEditLoadError")}
        actionLabel={translate("merchantProductEditBack")}
        onAction={() => router.replace("/merchant/products")}
      />
    );
  }
  if (offerQuery.isPending) {
    return <MessageScreen theme={theme} label={translate("merchantProductEditLoading")} loading />;
  }
  if (offerQuery.isError || !offer) {
    return (
      <MessageScreen
        theme={theme}
        label={translate("merchantProductEditLoadError")}
        actionLabel={translate("merchantRetry")}
        onAction={() => void offerQuery.refetch()}
      />
    );
  }

  const isBusy = saving || detailsSaving || imageBusy || removingImageId !== null;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppHeader title={translate("merchantProductEditTitle")} leading={<Button label={translate("merchantProductEditBack")} onPress={() => router.replace("/merchant/products")} variant="ghost" size="sm" />} />
          <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("merchantProductEditSubtitle")}</UiText>

                    <Card contentStyle={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitles}>
                <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                  {translate("merchantProductImagesManageTitle")}
                </UiText>
                <UiText style={[styles.hint, { color: theme.colors.subtle }]}>
                  {translate("merchantProductImagesManageHint")}
                </UiText>
              </View>
              <UiText style={[styles.imageCount, { color: theme.colors.accentMuted }]}>
                {offer.images.length}/{PRODUCT_IMAGE_MAX_COUNT}
              </UiText>
            </View>

            <View style={styles.imageGrid}>
              {offer.images.map((image) => (
                <View key={image.id} style={styles.imageItem}>
                  <PressableSurface
                    accessibilityRole="button"
                    accessibilityLabel={translate("merchantProductImagesLabel")}
                    accessibilityState={{ selected: image.is_primary }}
                    disabled={isBusy}
                    onPress={() => setPreviewImage({ uri: image.image_url })}
                    style={[styles.imagePreviewPressable, { opacity: isBusy ? 0.65 : 1 }]}
                  >
                    <UiImage
                      uri={image.image_url}
                      accessibilityLabel={translate("merchantProductImagesLabel")}
                      aspectRatio={1}
                      style={styles.imagePreview}
                    />
                  </PressableSurface>
                  {image.is_primary ? (
                    <View style={[styles.primaryBadge, { backgroundColor: theme.colors.accent }]}>
                      <UiText style={[styles.primaryBadgeText, { color: theme.colors.accentForeground }]}>
                        {translate("merchantProductImagePrimary")}
                      </UiText>
                    </View>
                  ) : null}
                  <PressableSurface
                    accessibilityRole="button"
                    accessibilityLabel={translate("merchantProductImageRemove")}
                    disabled={isBusy}
                    onPress={() => setPendingRemoval(image)}
                    style={[styles.imageRemove, { backgroundColor: theme.colors.danger, opacity: isBusy ? 0.55 : 1 }]}
                    hitSlop={8}
                  >
                    {removingImageId === image.id ? (
                      <Spinner color={designTokens.brand.white} size="small" />
                    ) : (
                      <Icon name="x" color={designTokens.brand.white} size={15} accessibilityHidden />
                    )}
                  </PressableSurface>
                </View>
              ))}

              {offer.images.length < PRODUCT_IMAGE_MAX_COUNT ? (
                <PressableSurface
                  accessibilityRole="button"
                  accessibilityLabel={translate("merchantProductImageAdd")}
                  accessibilityState={{ disabled: isBusy || offer.images.length >= PRODUCT_IMAGE_MAX_COUNT, busy: imageBusy }}
                  disabled={isBusy || offer.images.length >= PRODUCT_IMAGE_MAX_COUNT}
                  onPress={() => void chooseAndUploadImage()}
                  style={[
                    styles.imageAddItem,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surfaceMuted,
                      opacity: isBusy ? 0.55 : 1
                    }
                  ]}
                >
                  {imageBusy ? (
                    <Spinner size="small" />
                  ) : (
                    <>
                      <Icon name="plus" size={22} color={theme.colors.accentMuted} accessibilityHidden />
                      <UiText style={[styles.imageAddText, { color: theme.colors.accentMuted }]}>
                        {translate("merchantProductImageAdd")}
                      </UiText>
                    </>
                  )}
                </PressableSurface>
              ) : null}
            </View>
          </Card>

          <Card contentStyle={styles.card}>
            <View style={styles.productHeading}>
              <UiText style={[styles.productName, { color: theme.colors.foreground }]}>{offer.product.name}</UiText>
              {offer.product.brand ? (
                <UiText style={[styles.productBrand, { color: theme.colors.muted }]}>{offer.product.brand}</UiText>
              ) : null}
            </View>

            <View style={[styles.sharedDetails, { backgroundColor: theme.colors.surfaceMuted }]}>
              <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                {translate("merchantProductSharedDetailsTitle")}
              </UiText>
              <View style={styles.field}>
                <UiText style={[styles.label, { color: theme.colors.foreground }]}>
                  {translate("merchantProductNameLabel")}
                </UiText>
                <TextField
                  value={productName}
                  onChangeText={setProductName}
                  editable={!isBusy}
                  maxLength={120}
                  accessibilityLabel={translate("merchantProductNameLabel")}
                  style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                />
              </View>
              <View style={styles.field}>
                <UiText style={[styles.label, { color: theme.colors.foreground }]}>
                  {translate("merchantProductBrandLabel")}
                </UiText>
                <TextField
                  value={productBrand}
                  onChangeText={setProductBrand}
                  editable={!isBusy}
                  maxLength={80}
                  accessibilityLabel={translate("merchantProductBrandLabel")}
                  style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                />
              </View>
              <View style={styles.field}>
                <UiText style={[styles.label, { color: theme.colors.foreground }]}>
                  {translate("merchantProductDescriptionLabel")}
                </UiText>
                <TextField
                  value={productDescription}
                  onChangeText={setProductDescription}
                  editable={!isBusy}
                  maxLength={3000}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel={translate("merchantProductDescriptionLabel")}
                  style={[styles.input, styles.descriptionInput, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                />
              </View>
              <View style={styles.field}>
                <UiText style={[styles.label, { color: theme.colors.foreground }]}>
                  {translate("merchantProductCategoryLabel")}
                </UiText>
                <PressableSurface
                  accessibilityRole="button"
                  accessibilityLabel={translate("merchantProductCategoryLabel")}
                  disabled={isBusy || categoriesQuery.isPending || categoriesQuery.isError}
                  onPress={() => setCategoryPickerOpen(true)}
                  style={[styles.categoryPicker, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, opacity: isBusy || categoriesQuery.isPending || categoriesQuery.isError ? 0.55 : 1 }]}
                >
                  <UiText style={[styles.categoryPickerText, { color: theme.colors.foreground }]}>
                    {selectedCategory
                      ? `${selectedCategory.emoji} ${getLocalizedMerchantCategoryLabel(selectedCategory.id, selectedCategory.label, language)}`
                      : translate("merchantProductCategoryUnknown")}
                  </UiText>
                </PressableSurface>
                {categoriesQuery.isError ? (
                  <UiText style={[styles.hint, { color: theme.colors.danger }]}>
                    {translate("merchantProductCategoriesLoadError")}
                  </UiText>
                ) : null}
              </View>
              <UiText style={[styles.noteText, { color: theme.colors.muted }]}>
                {translate("merchantProductEditSharedFieldsHint")}
              </UiText>
              <Button label={translate("merchantProductDetailsSave")} onPress={() => void saveProductDetails()} loading={detailsSaving} disabled={isBusy && !detailsSaving} fullWidth />
            </View>

            <View style={styles.field}>
              <UiText style={[styles.label, { color: theme.colors.foreground }]}>
                {translate("merchantProductPriceLabel")}
              </UiText>
              <TextField
                value={price}
                onChangeText={setPrice}
                editable={!isBusy}
                keyboardType="number-pad"
                accessibilityLabel={translate("merchantProductPriceLabel")}
                style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              />
            </View>

            <View style={styles.field}>
              <UiText style={[styles.label, { color: theme.colors.foreground }]}>
                {translate("merchantProductStockLabel")}
              </UiText>
              <TextField
                value={stock}
                onChangeText={setStock}
                editable={!isBusy}
                keyboardType="number-pad"
                accessibilityLabel={translate("merchantProductStockLabel")}
                style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              />
              <UiText style={[styles.hint, { color: theme.colors.subtle }]}>
                {translate("merchantProductsStockHint")}
              </UiText>
            </View>

            <View style={styles.optionsSection}>
              <UiText style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                {translate("merchantProductOptionsTitle")}
              </UiText>
              <View style={styles.field}>
                <UiText style={[styles.label, { color: theme.colors.foreground }]}>
                  {translate("merchantProductSizesLabel")}
                </UiText>
                <TextField
                  value={sizes}
                  onChangeText={setSizes}
                  editable={!isBusy}
                  placeholder={translate("merchantProductOptionsPlaceholder")}
                  placeholderTextColor={theme.colors.placeholder}
                  accessibilityLabel={translate("merchantProductSizesLabel")}
                  style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                />
              </View>
              <View style={styles.field}>
                <UiText style={[styles.label, { color: theme.colors.foreground }]}>
                  {translate("merchantProductColorsLabel")}
                </UiText>
                <TextField
                  value={colors}
                  onChangeText={setColors}
                  editable={!isBusy}
                  placeholder={translate("merchantProductOptionsPlaceholder")}
                  placeholderTextColor={theme.colors.placeholder}
                  accessibilityLabel={translate("merchantProductColorsLabel")}
                  style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                />
              </View>
              <UiText style={[styles.hint, { color: theme.colors.subtle }]}>
                {translate("merchantProductOptionsHint")}
              </UiText>
            </View>

            <Button label={translate("merchantProductEditSave")} onPress={() => void saveOffer()} loading={saving} disabled={isBusy && !saving} fullWidth />
          </Card>


          {notice ? (
            <View style={[styles.feedback, { backgroundColor: theme.colors.successSurface, borderColor: theme.colors.successBorder }]}>
              <UiText style={[styles.feedbackText, { color: theme.colors.success }]}>{notice}</UiText>
            </View>
          ) : null}
          {warning ? (
            <View style={[styles.feedback, { backgroundColor: theme.colors.warningSurface, borderColor: theme.colors.warning }]}>
              <UiText style={[styles.feedbackText, { color: theme.colors.warning }]}>{warning}</UiText>
            </View>
          ) : null}
          {actionError ? (
            <View style={[styles.feedback, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerBorder }]}>
              <UiText style={[styles.feedbackText, { color: theme.colors.danger }]}>{actionError}</UiText>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <MediaViewer
        visible={previewImage !== null}
        onRequestClose={() => setPreviewImage(null)}
        closeLabel={translate("merchantProductCategoryClose")}
      >
        {previewImage ? (
          <UiImage
            uri={previewImage.uri}
            accessibilityLabel={translate("merchantProductImagesLabel")}
            aspectRatio={1}
            resizeMode="contain"
            style={styles.fullscreenImage}
          />
        ) : null}
      </MediaViewer>

      <BottomSheet visible={categoryPickerOpen} onRequestClose={() => setCategoryPickerOpen(false)} maxHeight="85%">
            <UiText style={[styles.confirmTitle, { color: theme.colors.foreground }]}>
              {translate("merchantProductCategoryPickerTitle")}
            </UiText>
            <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
              {selectableCategories.map((category) => (
                <PressableSurface
                  key={category.id}
                  accessibilityRole="button"
                  accessibilityLabel={getLocalizedMerchantCategoryLabel(category.id, category.label, language)}
                  accessibilityState={{ selected: productCategory === category.id }}
                  onPress={() => {
                    setProductCategory(category.id);
                    setCategoryPickerOpen(false);
                  }}
                  style={[
                    styles.categoryOption,
                    {
                      backgroundColor: productCategory === category.id ? theme.colors.surfaceMuted : theme.colors.background,
                      borderColor: productCategory === category.id ? theme.colors.accent : theme.colors.border
                    }
                  ]}
                >
                  <UiText style={[styles.categoryOptionText, { color: theme.colors.foreground }]}>
                    {category.emoji} {getLocalizedMerchantCategoryLabel(category.id, category.label, language)}
                  </UiText>
                </PressableSurface>
              ))}
              {selectableCategories.length === 0 ? (
                <UiText style={[styles.confirmHint, { color: theme.colors.muted }]}>
                  {translate("merchantProductCategoriesLoadError")}
                </UiText>
              ) : null}
            </ScrollView>
            <PressableSurface
              accessibilityRole="button"
              accessibilityLabel={translate("merchantProductCategoryClose")}
              onPress={() => setCategoryPickerOpen(false)}
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
            >
              <UiText style={[styles.cancelText, { color: theme.colors.foreground }]}>
                {translate("merchantProductCategoryClose")}
              </UiText>
            </PressableSurface>

      </BottomSheet>

      <ConfirmDialog
        visible={pendingRemoval !== null}
        onRequestClose={() => setPendingRemoval(null)}
        onConfirm={() => void confirmRemoveImage()}
        title={translate("merchantProductImageRemoveConfirmTitle")}
        description={translate("merchantProductImageRemoveConfirmHint")}
        cancelLabel={translate("merchantProductCategoryClose")}
        confirmLabel={translate("merchantProductImageRemoveConfirmAction")}
        busy={removingImageId !== null}
        destructive
      />
    </SafeAreaView>
  );
}

function MessageScreen({
  theme,
  label,
  actionLabel,
  onAction,
  loading = false
}: {
  theme: AppTheme;
  label: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  const styles = createStyles(theme);
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={styles.message}>
        {loading ? (
          <LoadingState label={label} />
        ) : actionLabel && onAction ? (
          <ErrorState title={label} retryLabel={actionLabel} onRetry={onAction} />
        ) : (
          <UiText style={[styles.messageText, { color: theme.colors.foreground }]}>{label}</UiText>
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    flex: { flex: 1 },
    content: { padding: designTokens.spacing.lg, paddingBottom: 34, gap: designTokens.spacing.lg },
    backButton: { minHeight: 42, alignSelf: "flex-start", justifyContent: "center" },
    backText: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
    header: { alignItems: "flex-start", gap: designTokens.spacing.xs },
    eyebrow: { fontSize: designTokens.typography.caption - 1, fontWeight: designTokens.fontWeights.extrabold },
    title: { width: "100%", fontSize: designTokens.typography.display - 4, lineHeight: 33, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    subtitle: { width: "100%", fontSize: designTokens.typography.caption + 1, lineHeight: 20, textAlign: "auto" },
    card: { padding: designTokens.spacing.lg, gap: designTokens.spacing.lg },
    productHeading: { alignItems: "flex-start", gap: designTokens.spacing.xs, paddingBottom: 3 },
    productName: { width: "100%", fontSize: designTokens.typography.subtitle, lineHeight: 23, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    productBrand: { width: "100%", fontSize: designTokens.typography.caption, textAlign: "auto" },
    sharedDetails: { borderRadius: designTokens.radius.sm, padding: designTokens.spacing.md, gap: designTokens.spacing.md },
    descriptionInput: { minHeight: 104, paddingTop: 12 },
    categoryPicker: { minHeight: designTokens.dimensions.controlHeight.lg, borderWidth: 1, borderRadius: designTokens.radius.sm, justifyContent: "center", paddingHorizontal: designTokens.spacing.md },
    categoryPickerText: { fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    field: { gap: designTokens.spacing.xs },
    optionsSection: { gap: designTokens.spacing.md, paddingTop: 2 },
    label: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    input: { minHeight: 47, borderWidth: 1, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.md, textAlign: "auto", fontSize: designTokens.typography.body - 1 },
    hint: { fontSize: designTokens.typography.caption - 1, lineHeight: 16, textAlign: "auto" },
    note: { borderRadius: designTokens.radius.sm, padding: designTokens.spacing.md },
    noteText: { fontSize: designTokens.typography.caption - 1, lineHeight: 17, textAlign: "auto" },
    primaryButton: { minHeight: designTokens.dimensions.controlHeight.lg, borderRadius: designTokens.radius.sm, alignItems: "center", justifyContent: "center" },
    primaryButtonText: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
    sectionHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: designTokens.spacing.sm },
    sectionTitles: { flex: 1, alignItems: "flex-start", gap: designTokens.spacing.xs },
    sectionTitle: { fontSize: designTokens.typography.body, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    imageCount: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
    imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.md },
    imageItem: { width: 94, height: 94, borderRadius: designTokens.radius.sm, overflow: "visible" },
    imagePreview: { width: 94, height: 94, borderRadius: designTokens.radius.sm, backgroundColor: theme.colors.surfaceMuted },
    imagePreviewPressable: { width: 94, height: 94, borderRadius: designTokens.radius.sm, overflow: "hidden" },
    imageAddItem: { width: 94, height: 94, borderWidth: 1, borderStyle: "dashed", borderRadius: designTokens.radius.sm, alignItems: "center", justifyContent: "center", gap: designTokens.spacing.xs, padding: designTokens.spacing.xs },
    imageAddText: { fontSize: designTokens.typography.caption - 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "center" },
    fullscreenImage: { width: "100%", maxHeight: 520, borderRadius: designTokens.radius.md },
    primaryBadge: { position: "absolute", start: 4, bottom: 4, borderRadius: designTokens.radius.sm, paddingHorizontal: 5, paddingVertical: designTokens.spacing.xs },
    primaryBadgeText: { fontSize: 8, fontWeight: designTokens.fontWeights.extrabold },
    imageRemove: { position: "absolute", top: -7, end: -7, width: 26, height: 26, borderRadius: designTokens.radius.sm, alignItems: "center", justifyContent: "center" },
    imageRemoveText: { color: designTokens.brand.white, fontSize: 19, lineHeight: 22, fontWeight: designTokens.fontWeights.extrabold },
    emptyImages: { minHeight: 78, borderRadius: designTokens.radius.sm, justifyContent: "center", alignItems: "center", padding: designTokens.spacing.md },
    emptyText: { fontSize: designTokens.typography.caption, textAlign: "center" },
    secondaryButton: { minHeight: 46, borderWidth: 1, borderRadius: designTokens.radius.sm, alignItems: "center", justifyContent: "center", paddingHorizontal: designTokens.spacing.lg },
    secondaryButtonText: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
    feedback: { borderWidth: 1, borderRadius: designTokens.radius.sm, padding: designTokens.spacing.md },
    feedbackText: { fontSize: designTokens.typography.caption, lineHeight: 17, textAlign: "auto", fontWeight: designTokens.fontWeights.extrabold },
    confirmCard: { borderWidth: 1, borderRadius: designTokens.radius.md, padding: designTokens.spacing.lg, gap: designTokens.spacing.md },
    categoryList: { maxHeight: 420 },
    categoryOption: { minHeight: designTokens.dimensions.controlHeight.lg, borderWidth: 1, borderRadius: designTokens.radius.sm, justifyContent: "center", paddingHorizontal: designTokens.spacing.md, marginBottom: designTokens.spacing.sm },
    categoryOptionText: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    confirmTitle: { fontSize: designTokens.typography.subtitle - 1, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    confirmHint: { fontSize: designTokens.typography.caption, lineHeight: 18, textAlign: "auto" },
    confirmActions: { flexDirection: "row", gap: designTokens.spacing.sm },
    cancelButton: { flex: 1, minHeight: 45, borderWidth: 1, borderRadius: designTokens.radius.sm, alignItems: "center", justifyContent: "center" },
    cancelText: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
    removeConfirmButton: { flex: 1, minHeight: 45, borderRadius: designTokens.radius.sm, alignItems: "center", justifyContent: "center" },
    removeConfirmText: { color: designTokens.brand.white, fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
    message: { flex: 1, alignItems: "center", justifyContent: "center", padding: designTokens.spacing.xxl, gap: designTokens.spacing.lg },
    messageText: { fontSize: designTokens.typography.body - 1, lineHeight: 21, textAlign: "center" }
  });
}
