import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { translate } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";

export default function MerchantEditProductScreen() {
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
    offer?.stock_quantity
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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.replace("/merchant/products")} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.colors.accentMuted }]}>
              {translate("merchantProductEditBack")}
            </Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: theme.colors.accentMuted }]}>
              {translate("merchantDashboardEyebrow")}
            </Text>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>
              {translate("merchantProductEditTitle")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {translate("merchantProductEditSubtitle")}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.productHeading}>
              <Text style={[styles.productName, { color: theme.colors.foreground }]}>{offer.product.name}</Text>
              {offer.product.brand ? (
                <Text style={[styles.productBrand, { color: theme.colors.muted }]}>{offer.product.brand}</Text>
              ) : null}
            </View>

            <View style={[styles.sharedDetails, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                {translate("merchantProductSharedDetailsTitle")}
              </Text>
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.colors.foreground }]}>
                  {translate("merchantProductNameLabel")}
                </Text>
                <TextInput
                  value={productName}
                  onChangeText={setProductName}
                  editable={!isBusy}
                  maxLength={120}
                  accessibilityLabel={translate("merchantProductNameLabel")}
                  style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.colors.foreground }]}>
                  {translate("merchantProductBrandLabel")}
                </Text>
                <TextInput
                  value={productBrand}
                  onChangeText={setProductBrand}
                  editable={!isBusy}
                  maxLength={80}
                  accessibilityLabel={translate("merchantProductBrandLabel")}
                  style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.colors.foreground }]}>
                  {translate("merchantProductDescriptionLabel")}
                </Text>
                <TextInput
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
                <Text style={[styles.label, { color: theme.colors.foreground }]}>
                  {translate("merchantProductCategoryLabel")}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy || categoriesQuery.isPending || categoriesQuery.isError}
                  onPress={() => setCategoryPickerOpen(true)}
                  style={[styles.categoryPicker, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, opacity: isBusy || categoriesQuery.isPending || categoriesQuery.isError ? 0.55 : 1 }]}
                >
                  <Text style={[styles.categoryPickerText, { color: theme.colors.foreground }]}>
                    {selectedCategory
                      ? `${selectedCategory.emoji} ${selectedCategory.label}`
                      : translate("merchantProductCategoryUnknown")}
                  </Text>
                </Pressable>
                {categoriesQuery.isError ? (
                  <Text style={[styles.hint, { color: theme.colors.danger }]}>
                    {translate("merchantProductCategoriesLoadError")}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.noteText, { color: theme.colors.muted }]}>
                {translate("merchantProductEditSharedFieldsHint")}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                onPress={() => void saveProductDetails()}
                style={[styles.primaryButton, { backgroundColor: theme.colors.accent, opacity: isBusy ? 0.55 : 1 }]}
              >
                {detailsSaving ? (
                  <ActivityIndicator color={theme.colors.accentForeground} />
                ) : (
                  <Text style={[styles.primaryButtonText, { color: theme.colors.accentForeground }]}>
                    {translate("merchantProductDetailsSave")}
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.colors.foreground }]}>
                {translate("merchantProductPriceLabel")}
              </Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                editable={!isBusy}
                keyboardType="number-pad"
                accessibilityLabel={translate("merchantProductPriceLabel")}
                style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.colors.foreground }]}>
                {translate("merchantProductStockLabel")}
              </Text>
              <TextInput
                value={stock}
                onChangeText={setStock}
                editable={!isBusy}
                keyboardType="number-pad"
                accessibilityLabel={translate("merchantProductStockLabel")}
                style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
              />
              <Text style={[styles.hint, { color: theme.colors.subtle }]}>
                {translate("merchantProductsStockHint")}
              </Text>
            </View>

            <View style={styles.optionsSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                {translate("merchantProductOptionsTitle")}
              </Text>
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.colors.foreground }]}>
                  {translate("merchantProductSizesLabel")}
                </Text>
                <TextInput
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
                <Text style={[styles.label, { color: theme.colors.foreground }]}>
                  {translate("merchantProductColorsLabel")}
                </Text>
                <TextInput
                  value={colors}
                  onChangeText={setColors}
                  editable={!isBusy}
                  placeholder={translate("merchantProductOptionsPlaceholder")}
                  placeholderTextColor={theme.colors.placeholder}
                  accessibilityLabel={translate("merchantProductColorsLabel")}
                  style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                />
              </View>
              <Text style={[styles.hint, { color: theme.colors.subtle }]}>
                {translate("merchantProductOptionsHint")}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => void saveOffer()}
              style={[styles.primaryButton, { backgroundColor: theme.colors.accent, opacity: isBusy ? 0.55 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.accentForeground} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: theme.colors.accentForeground }]}>
                  {translate("merchantProductEditSave")}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitles}>
                <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                  {translate("merchantProductImagesManageTitle")}
                </Text>
                <Text style={[styles.hint, { color: theme.colors.subtle }]}>
                  {translate("merchantProductImagesManageHint")}
                </Text>
              </View>
              <Text style={[styles.imageCount, { color: theme.colors.accentMuted }]}>
                {offer.images.length}/{PRODUCT_IMAGE_MAX_COUNT}
              </Text>
            </View>

            {offer.images.length > 0 ? (
              <View style={styles.imageGrid}>
                {offer.images.map((image) => (
                  <View key={image.id} style={styles.imageItem}>
                    <Image source={{ uri: image.image_url }} style={styles.imagePreview} />
                    {image.is_primary ? (
                      <View style={[styles.primaryBadge, { backgroundColor: theme.colors.accent }]}>
                        <Text style={[styles.primaryBadgeText, { color: theme.colors.accentForeground }]}>
                          {translate("merchantProductImagePrimary")}
                        </Text>
                      </View>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={translate("merchantProductImageRemove")}
                      disabled={isBusy}
                      onPress={() => setPendingRemoval(image)}
                      style={[styles.imageRemove, { backgroundColor: theme.colors.danger, opacity: isBusy ? 0.55 : 1 }]}
                      hitSlop={8}
                    >
                      {removingImageId === image.id ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.imageRemoveText}>×</Text>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyImages, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                  {translate("merchantProductImagesEmpty")}
                </Text>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={isBusy || offer.images.length >= PRODUCT_IMAGE_MAX_COUNT}
              onPress={() => void chooseAndUploadImage()}
              style={[styles.secondaryButton, { borderColor: theme.colors.border, opacity: isBusy || offer.images.length >= PRODUCT_IMAGE_MAX_COUNT ? 0.55 : 1 }]}
            >
              {imageBusy ? (
                <ActivityIndicator color={theme.colors.accentMuted} />
              ) : (
                <Text style={[styles.secondaryButtonText, { color: theme.colors.accentMuted }]}>
                  {translate("merchantProductImageAdd")}
                </Text>
              )}
            </Pressable>
          </View>

          {notice ? (
            <View style={[styles.feedback, { backgroundColor: theme.colors.successSurface, borderColor: theme.colors.successBorder }]}>
              <Text style={[styles.feedbackText, { color: theme.colors.success }]}>{notice}</Text>
            </View>
          ) : null}
          {warning ? (
            <View style={[styles.feedback, { backgroundColor: theme.colors.warningSurface, borderColor: theme.colors.warning }]}>
              <Text style={[styles.feedbackText, { color: theme.colors.warning }]}>{warning}</Text>
            </View>
          ) : null}
          {actionError ? (
            <View style={[styles.feedback, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerBorder }]}>
              <Text style={[styles.feedbackText, { color: theme.colors.danger }]}>{actionError}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={categoryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.confirmCard, styles.categoryModalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.confirmTitle, { color: theme.colors.foreground }]}>
              {translate("merchantProductCategoryPickerTitle")}
            </Text>
            <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
              {selectableCategories.map((category) => (
                <Pressable
                  key={category.id}
                  accessibilityRole="button"
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
                  <Text style={[styles.categoryOptionText, { color: theme.colors.foreground }]}>
                    {category.emoji} {category.label}
                  </Text>
                </Pressable>
              ))}
              {selectableCategories.length === 0 ? (
                <Text style={[styles.confirmHint, { color: theme.colors.muted }]}>
                  {translate("merchantProductCategoriesLoadError")}
                </Text>
              ) : null}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCategoryPickerOpen(false)}
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.cancelText, { color: theme.colors.foreground }]}>
                {translate("merchantProductCategoryClose")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={pendingRemoval !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingRemoval(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.confirmCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.confirmTitle, { color: theme.colors.foreground }]}>
              {translate("merchantProductImageRemoveConfirmTitle")}
            </Text>
            <Text style={[styles.confirmHint, { color: theme.colors.muted }]}>
              {translate("merchantProductImageRemoveConfirmHint")}
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPendingRemoval(null)}
                style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              >
                <Text style={[styles.cancelText, { color: theme.colors.foreground }]}>
                  {translate("merchantProductCategoryClose")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void confirmRemoveImage()}
                style={[styles.removeConfirmButton, { backgroundColor: theme.colors.danger }]}
              >
                <Text style={styles.removeConfirmText}>
                  {translate("merchantProductImageRemoveConfirmAction")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={styles.message}>
        {loading ? <ActivityIndicator color={theme.colors.accentMuted} /> : null}
        <Text style={[styles.messageText, { color: theme.colors.foreground }]}>{label}</Text>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.colors.accentMuted }]}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    flex: { flex: 1 },
    content: { padding: 16, paddingBottom: 36, gap: 14 },
    backButton: { minHeight: 42, alignSelf: "flex-start", justifyContent: "center" },
    backText: { fontSize: 12, fontWeight: "800" },
    header: { alignItems: "flex-end", gap: 6 },
    eyebrow: { fontSize: 10, fontWeight: "900" },
    title: { width: "100%", fontSize: 24, lineHeight: 32, fontWeight: "900", textAlign: "right" },
    subtitle: { width: "100%", fontSize: 12, lineHeight: 19, textAlign: "right" },
    card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 14 },
    productHeading: { alignItems: "flex-end", gap: 4, paddingBottom: 3 },
    productName: { width: "100%", fontSize: 16, lineHeight: 23, fontWeight: "900", textAlign: "right" },
    productBrand: { width: "100%", fontSize: 11, textAlign: "right" },
    sharedDetails: { borderRadius: 12, padding: 12, gap: 10 },
    descriptionInput: { minHeight: 104, paddingTop: 12 },
    categoryPicker: { minHeight: 48, borderWidth: 1, borderRadius: 12, justifyContent: "center", paddingHorizontal: 12 },
    categoryPickerText: { fontSize: 13, fontWeight: "800", textAlign: "right" },
    field: { gap: 6 },
    optionsSection: { gap: 10, paddingTop: 2 },
    label: { fontSize: 11, fontWeight: "900", textAlign: "right" },
    input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, textAlign: "right", fontSize: 14, fontWeight: "800" },
    hint: { fontSize: 10, lineHeight: 16, textAlign: "right" },
    note: { borderRadius: 12, padding: 11 },
    noteText: { fontSize: 10, lineHeight: 17, textAlign: "right" },
    primaryButton: { minHeight: 48, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    primaryButtonText: { fontSize: 12, fontWeight: "900" },
    sectionHeader: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
    sectionTitles: { flex: 1, alignItems: "flex-end", gap: 5 },
    sectionTitle: { fontSize: 14, fontWeight: "900", textAlign: "right" },
    imageCount: { fontSize: 12, fontWeight: "900" },
    imageGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 },
    imageItem: { width: 94, height: 94, borderRadius: 13, overflow: "visible" },
    imagePreview: { width: 94, height: 94, borderRadius: 13, backgroundColor: theme.colors.surfaceMuted },
    primaryBadge: { position: "absolute", left: 4, bottom: 4, borderRadius: 7, paddingHorizontal: 5, paddingVertical: 3 },
    primaryBadgeText: { fontSize: 8, fontWeight: "900" },
    imageRemove: { position: "absolute", top: -7, right: -7, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    imageRemoveText: { color: "#FFFFFF", fontSize: 19, lineHeight: 22, fontWeight: "900" },
    emptyImages: { minHeight: 78, borderRadius: 12, justifyContent: "center", alignItems: "center", padding: 12 },
    emptyText: { fontSize: 11, textAlign: "center" },
    secondaryButton: { minHeight: 46, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
    secondaryButtonText: { fontSize: 11, fontWeight: "900" },
    feedback: { borderWidth: 1, borderRadius: 12, padding: 11 },
    feedbackText: { fontSize: 11, lineHeight: 17, textAlign: "right", fontWeight: "800" },
    modalOverlay: { flex: 1, justifyContent: "center", padding: 18 },
    confirmCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 12 },
    categoryModalCard: { maxHeight: "80%" },
    categoryList: { maxHeight: 420 },
    categoryOption: { minHeight: 46, borderWidth: 1, borderRadius: 11, justifyContent: "center", paddingHorizontal: 12, marginBottom: 8 },
    categoryOptionText: { fontSize: 12, fontWeight: "800", textAlign: "right" },
    confirmTitle: { fontSize: 15, fontWeight: "900", textAlign: "right" },
    confirmHint: { fontSize: 11, lineHeight: 18, textAlign: "right" },
    confirmActions: { flexDirection: "row-reverse", gap: 8 },
    cancelButton: { flex: 1, minHeight: 45, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    cancelText: { fontSize: 11, fontWeight: "800" },
    removeConfirmButton: { flex: 1, minHeight: 45, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    removeConfirmText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
    message: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
    messageText: { fontSize: 13, lineHeight: 21, textAlign: "center" }
  });
}
