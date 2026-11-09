import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import { Redirect, router } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createMerchantProductOffer
} from "@/lib/merchant-products";
import { validateMerchantProductInput } from "@/lib/merchant-product-create-state";
import {
  PRODUCT_IMAGE_MAX_COUNT,
  PRODUCT_IMAGE_MAX_BYTES,
  validateProductImageMetadata
} from "@/lib/merchant-product-images";
import {
  fetchMerchantAccess,
  fetchMerchantCategories,
  type MerchantCategory
} from "@/lib/merchant";
import {
  groupMerchantCategories
} from "@/lib/merchant-category-state";
import { translate, useLanguage } from "@/lib/i18n";
import { getLocalizedMerchantCategoryLabel } from "@/lib/locale-data";
import { designTokens, useAppTheme, type AppTheme } from "@/lib/theme";
import { BottomSheet, AppHeader, Button, Card, ErrorState, Icon, Image as UiImage, LoadingState, Spinner, PressableSurface, Text as UiText, TextField } from "@/components/ui";

type ProductForm = {
  name: string;
  price: string;
  stock: string;
  category: string;
  brand: string;
  description: string;
  sizes: string;
  colors: string;
};

const INITIAL_FORM: ProductForm = {
  name: "",
  price: "",
  stock: "",
  category: "",
  brand: "",
  description: "",
  sizes: "",
  colors: ""
};

export default function MerchantNewProductScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImagePickerAsset[]>([]);
  const [imagePickerBusy, setImagePickerBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const access = useQuery({
    queryKey: ["merchant-access"],
    queryFn: fetchMerchantAccess,
    retry: false
  });
  const categories = useQuery({
    queryKey: ["merchant-categories"],
    queryFn: fetchMerchantCategories,
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  const storeId = access.data?.store?.id ?? null;
  const categoryGroups = useMemo(
    () => groupMerchantCategories(categories.data ?? []),
    [categories.data]
  );
  const selectedCategory = useMemo(
    () => categories.data?.find((item) => item.id === form.category) ?? null,
    [categories.data, form.category]
  );

  const update = (key: keyof ProductForm, value: string): void => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const pickProductImages = async (): Promise<void> => {
    if (imagePickerBusy || submitting) return;
    const remaining = PRODUCT_IMAGE_MAX_COUNT - selectedImages.length;
    if (remaining <= 0) {
      setImageError(translate("merchantProductImagesLimit"));
      return;
    }

    setImagePickerBusy(true);
    setImageError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        orderedSelection: true,
        quality: 0.85
      });

      if (result.canceled) return;

      const accepted: ImagePickerAsset[] = [];
      for (const asset of result.assets) {
        const metadata = {
          mimeType: asset.mimeType ?? null,
          fileName: asset.fileName ?? null,
          fileSize: asset.fileSize ?? null
        };
        if (asset.fileSize !== null && asset.fileSize !== undefined && asset.fileSize > PRODUCT_IMAGE_MAX_BYTES) {
          setImageError(translate("merchantProductImageTooLarge"));
          continue;
        }
        if (!validateProductImageMetadata(metadata)) {
          setImageError(translate("merchantProductImageInvalid"));
          continue;
        }
        accepted.push(asset);
      }

      setSelectedImages((current) => [...current, ...accepted].slice(0, PRODUCT_IMAGE_MAX_COUNT));
    } catch {
      setImageError(translate("merchantProductImagePickerError"));
    } finally {
      setImagePickerBusy(false);
    }
  };

  const removeProductImage = (uri: string): void => {
    setSelectedImages((current) => current.filter((asset) => asset.uri !== uri));
    setImageError(null);
  };

  const submit = async (): Promise<void> => {
    if (!storeId || submitting || imagePickerBusy) return;

    const values = validateMerchantProductInput(form);
    if (!values) {
      setSubmitError(translate("merchantProductCreateValidation"));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await createMerchantProductOffer(storeId, values, selectedImages);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["merchant-products", storeId] }),
        queryClient.invalidateQueries({ queryKey: ["merchant-dashboard", storeId] }),
        queryClient.invalidateQueries({ queryKey: ["near-stores"] })
      ]);
      router.replace("/merchant/products");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "";
      setSubmitError(
        errorMessage.endsWith("cleanup_required")
          ? translate("merchantProductCreateCleanupPending")
          : translate("merchantProductCreateError")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (access.isPending) {
    return <MessageScreen theme={theme} label={translate("merchantLoading")} loading />;
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
  if (access.data.status !== "merchant_ready" || !storeId) return <Redirect href="/merchant" />;

  if (categories.isPending) {
    return <MessageScreen theme={theme} label={translate("merchantProductCategoriesLoading")} loading />;
  }
  if (categories.isError || !categories.data?.length) {
    return (
      <MessageScreen
        theme={theme}
        label={translate("merchantProductCategoriesError")}
        actionLabel={translate("merchantRetry")}
        onAction={() => void categories.refetch()}
      />
    );
  }

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
          <AppHeader title={translate("merchantProductCreateTitle")} leading={<Button label={translate("merchantProductCreateBack")} onPress={() => router.back()} variant="ghost" size="sm" />} />
          <UiText style={[styles.subtitle, { color: theme.colors.muted }]}>{translate("merchantProductCreateSubtitle")}</UiText>

          <Card contentStyle={styles.card}>
            <FormField label={translate("merchantProductNameLabel")} theme={theme}>
              <TextField
                value={form.name}
                onChangeText={(value) => update("name", value)}
                accessibilityLabel={translate("merchantProductNameLabel")}
                placeholder={translate("merchantProductNamePlaceholder")}
                placeholderTextColor={theme.colors.placeholder}
                maxLength={120}
                textAlign="auto"
                style={styles.input}
                returnKeyType="next"
              />
            </FormField>

            <View style={styles.row}>
              <View style={styles.half}>
                <FormField label={translate("merchantProductPriceLabel")} theme={theme}>
                  <TextField
                    value={form.price}
                    onChangeText={(value) => update("price", value)}
                    accessibilityLabel={translate("merchantProductPriceLabel")}
                    placeholder={translate("merchantProductPricePlaceholder")}
                    placeholderTextColor={theme.colors.placeholder}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </FormField>
              </View>
              <View style={styles.half}>
                <FormField label={translate("merchantProductStockLabel")} theme={theme}>
                  <TextField
                    value={form.stock}
                    onChangeText={(value) => update("stock", value)}
                    accessibilityLabel={translate("merchantProductStockLabel")}
                    placeholder={translate("merchantProductStockPlaceholder")}
                    placeholderTextColor={theme.colors.placeholder}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </FormField>
              </View>
            </View>

            <FormField label={translate("merchantProductCategoryLabel")} theme={theme}>
              <PressableSurface
                accessibilityRole="button"
                accessibilityLabel={translate("merchantProductCategoryLabel")}
                onPress={() => setCategoryPickerOpen(true)}
                style={[styles.selectButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              >
                <UiText style={[styles.selectText, { color: selectedCategory ? theme.colors.foreground : theme.colors.placeholder }]}>
                  {selectedCategory
                    ? `${selectedCategory.emoji} ${getLocalizedMerchantCategoryLabel(selectedCategory.id, selectedCategory.label, language)}`
                    : translate("merchantProductCategoryPlaceholder")}
                </UiText>
              </PressableSurface>
            </FormField>

            <FormField label={translate("merchantProductBrandLabel")} theme={theme}>
              <TextField
                value={form.brand}
                onChangeText={(value) => update("brand", value)}
                accessibilityLabel={translate("merchantProductBrandLabel")}
                placeholder={translate("merchantProductBrandPlaceholder")}
                placeholderTextColor={theme.colors.placeholder}
                maxLength={80}
                textAlign="auto"
                style={styles.input}
              />
            </FormField>

            <FormField
              label={translate("merchantProductSizesLabel")}
              hint={translate("merchantProductOptionsHint")}
              theme={theme}
            >
              <TextField
                value={form.sizes}
                onChangeText={(value) => update("sizes", value)}
                accessibilityLabel={translate("merchantProductSizesLabel")}
                placeholder={translate("merchantProductSizesPlaceholder")}
                placeholderTextColor={theme.colors.placeholder}
                maxLength={850}
                textAlign="auto"
                style={styles.input}
              />
            </FormField>

            <FormField label={translate("merchantProductColorsLabel")} theme={theme}>
              <TextField
                value={form.colors}
                onChangeText={(value) => update("colors", value)}
                accessibilityLabel={translate("merchantProductColorsLabel")}
                placeholder={translate("merchantProductColorsPlaceholder")}
                placeholderTextColor={theme.colors.placeholder}
                maxLength={850}
                textAlign="auto"
                style={styles.input}
              />
            </FormField>

            <FormField label={translate("merchantProductDescriptionLabel")} theme={theme}>
              <TextField
                value={form.description}
                onChangeText={(value) => update("description", value)}
                accessibilityLabel={translate("merchantProductDescriptionLabel")}
                placeholder={translate("merchantProductDescriptionPlaceholder")}
                placeholderTextColor={theme.colors.placeholder}
                maxLength={3000}
                multiline
                numberOfLines={5}
                textAlign="auto"
                textAlignVertical="top"
                style={[styles.input, styles.textarea]}
              />
            </FormField>

            <FormField
              label={translate("merchantProductImagesLabel")}
              hint={translate("merchantProductImagesHint")}
              theme={theme}
            >
              <PressableSurface
                accessibilityRole="button"
                accessibilityLabel={translate("merchantProductImagesChoose")}
                disabled={imagePickerBusy || submitting || selectedImages.length >= PRODUCT_IMAGE_MAX_COUNT}
                onPress={() => void pickProductImages()}
                style={[styles.imagePickerButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, opacity: imagePickerBusy ? 0.6 : 1 }]}
              >
                {imagePickerBusy ? (
                  <Spinner size="small" />
                ) : (
                  <UiText style={[styles.imagePickerText, { color: theme.colors.accentMuted }]}>
                    {translate("merchantProductImagesChoose")}
                  </UiText>
                )}
              </PressableSurface>
              {selectedImages.length > 0 ? (
                <View style={styles.imageGrid}>
                  {selectedImages.map((asset) => (
                    <View key={asset.assetId ?? asset.uri} style={styles.imageItem}>
                      <UiImage uri={asset.uri} accessibilityLabel={translate("merchantProductImagesLabel")} aspectRatio={1} style={styles.imagePreview} />
                      <PressableSurface
                        accessibilityRole="button"
                        accessibilityLabel={translate("merchantProductImageRemove")}
                        onPress={() => removeProductImage(asset.uri)}
                        style={[styles.imageRemove, { backgroundColor: theme.colors.danger }]}
                        hitSlop={8}
                      >
                        <Icon name="x" color={designTokens.brand.white} size={15} accessibilityHidden />
                      </PressableSurface>
                    </View>
                  ))}
                </View>
              ) : (
                <UiText style={[styles.hint, { color: theme.colors.subtle }]}>
                  {translate("merchantProductImagesEmpty")}
                </UiText>
              )}
            </FormField>

            {imageError ? (
              <View style={[styles.errorBox, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerBorder }]}>
                <UiText style={[styles.errorText, { color: theme.colors.danger }]}>{imageError}</UiText>
              </View>
            ) : null}

            <View style={[styles.note, { backgroundColor: theme.colors.surfaceMuted }]}>
              <UiText style={[styles.noteText, { color: theme.colors.muted }]}>
                {translate("merchantProductVariantsStockHint")}
              </UiText>
            </View>

            {submitError ? (
              <View style={[styles.errorBox, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerBorder }]}>
                <UiText style={[styles.errorText, { color: theme.colors.danger }]}>{submitError}</UiText>
              </View>
            ) : null}

            <Button label={translate("merchantProductCreateSubmit")} onPress={() => void submit()} loading={submitting} disabled={imagePickerBusy} fullWidth />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet visible={categoryPickerOpen} onRequestClose={() => setCategoryPickerOpen(false)} maxHeight="85%">
            <View style={styles.modalHeader}>
              <UiText style={[styles.modalTitle, { color: theme.colors.foreground }]}>
                {translate("merchantProductChooseCategory")}
              </UiText>
              <PressableSurface accessibilityLabel={translate("merchantProductCategoryClose")} onPress={() => setCategoryPickerOpen(false)} hitSlop={10}>
                <UiText style={[styles.modalClose, { color: theme.colors.accentMuted }]}>
                  {translate("merchantProductCategoryClose")}
                </UiText>
              </PressableSurface>
            </View>
            <ScrollView contentContainerStyle={styles.categoryList}>
              {categoryGroups.map((group) => (
                <View key={group.parent.id} style={styles.categoryGroup}>
                  {group.children.length > 0 ? (
                    <>
                      <View style={styles.categoryGroupHeading}>
                        <UiText style={styles.categoryEmoji}>{group.parent.emoji}</UiText>
                        <UiText style={[styles.categoryGroupTitle, { color: theme.colors.foreground }]}>
                          {getLocalizedMerchantCategoryLabel(group.parent.id, group.parent.label, language)}
                        </UiText>
                      </View>
                      {group.children.map((category) => (
                        <CategoryOption
                          key={category.id}
                          category={category}
                          language={language}
                          nested
                          selected={form.category === category.id}
                          theme={theme}
                          onSelect={() => {
                            update("category", category.id);
                            setCategoryPickerOpen(false);
                          }}
                        />
                      ))}
                    </>
                  ) : (
                    <CategoryOption
                      category={group.parent}
                      language={language}
                      selected={form.category === group.parent.id}
                      theme={theme}
                      onSelect={() => {
                        update("category", group.parent.id);
                        setCategoryPickerOpen(false);
                      }}
                    />
                  )}
                </View>
              ))}
            </ScrollView>

      </BottomSheet>
    </SafeAreaView>
  );
}

function CategoryOption({
  category,
  language,
  nested = false,
  selected,
  theme,
  onSelect
}: {
  category: MerchantCategory;
  language: import("@/lib/i18n").Language;
  nested?: boolean;
  selected: boolean;
  theme: AppTheme;
  onSelect: () => void;
}) {
  const styles = createStyles(theme);

  return (
    <PressableSurface
      accessibilityRole="button"
      accessibilityLabel={getLocalizedMerchantCategoryLabel(category.id, category.label, language)}
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={[
        styles.categoryOption,
        ...(nested ? [styles.categoryOptionChild] : []),
        {
          borderColor: selected ? theme.colors.accentMuted : theme.colors.border,
          backgroundColor: selected ? theme.colors.surfaceMuted : theme.colors.background
        }
      ]}
    >
      <View style={styles.categoryOptionContent}>
        <UiText style={styles.categoryEmojiSmall}>{category.emoji}</UiText>
        <UiText style={[styles.categoryLabel, { color: theme.colors.foreground }]}>
          {getLocalizedMerchantCategoryLabel(category.id, category.label, language)}
        </UiText>
      </View>
      {selected ? (
        <Icon name="check" color={theme.colors.accentMuted} size={18} accessibilityHidden />
      ) : null}
    </PressableSurface>
  );
}

function FormField({
  label,
  hint,
  theme,
  children
}: {
  label: string;
  hint?: string;
  theme: AppTheme;
  children: ReactNode;
}) {
  const styles = createStyles(theme);
  return (
    <View style={styles.field}>
      <UiText style={[styles.label, { color: theme.colors.foreground }]}>{label}</UiText>
      {children}
      {hint ? <UiText style={[styles.hint, { color: theme.colors.subtle }]}>{hint}</UiText> : null}
    </View>
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
    row: { flexDirection: "row", gap: designTokens.spacing.md },
    half: { flex: 1 },
    field: { gap: designTokens.spacing.xs },
    label: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold, textAlign: "auto" },
    input: { minHeight: 47, borderWidth: 1, borderColor: theme.colors.border, borderRadius: designTokens.radius.sm, backgroundColor: theme.colors.background, paddingHorizontal: designTokens.spacing.md, color: theme.colors.foreground, fontSize: designTokens.typography.body - 1, textAlign: "auto" },
    textarea: { minHeight: 112, paddingTop: 12 },
    hint: { fontSize: designTokens.typography.caption - 1, lineHeight: 15, textAlign: "auto" },
    selectButton: { minHeight: 47, borderWidth: 1, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.md, justifyContent: "center" },
    selectText: { fontSize: designTokens.typography.caption + 1, textAlign: "auto", fontWeight: designTokens.fontWeights.bold },
    note: { borderRadius: designTokens.radius.sm, padding: designTokens.spacing.md, gap: designTokens.spacing.xs },
    imagePickerButton: { minHeight: designTokens.dimensions.controlHeight.lg, borderWidth: 1, borderStyle: "dashed", borderRadius: designTokens.radius.sm, alignItems: "center", justifyContent: "center" },
    imagePickerText: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
    imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: designTokens.spacing.sm },
    imageItem: { width: 88, height: 88, borderRadius: designTokens.radius.sm, overflow: "visible" },
    imagePreview: { width: 88, height: 88, borderRadius: designTokens.radius.sm, backgroundColor: theme.colors.surfaceMuted },
    imageRemove: { position: "absolute", top: -7, right: -7, width: 25, height: 25, borderRadius: designTokens.radius.sm, alignItems: "center", justifyContent: "center" },
    imageRemoveText: { color: designTokens.brand.white, fontSize: 19, lineHeight: 22, fontWeight: designTokens.fontWeights.extrabold },
    noteText: { fontSize: designTokens.typography.caption - 1, lineHeight: 16, textAlign: "auto" },
    errorBox: { borderWidth: 1, borderRadius: designTokens.radius.sm, padding: designTokens.spacing.md },
    errorText: { fontSize: designTokens.typography.caption, lineHeight: 17, textAlign: "auto", fontWeight: designTokens.fontWeights.bold },
    submitButton: { minHeight: designTokens.dimensions.controlHeight.lg, borderRadius: designTokens.radius.md, alignItems: "center", justifyContent: "center", marginTop: 2 },
    submitText: { fontSize: designTokens.typography.body - 1, fontWeight: designTokens.fontWeights.extrabold },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    modalTitle: { fontSize: designTokens.typography.subtitle - 1, fontWeight: designTokens.fontWeights.extrabold },
    modalClose: { fontSize: designTokens.typography.caption, fontWeight: designTokens.fontWeights.extrabold },
    categoryList: { gap: designTokens.spacing.lg, paddingBottom: 8 },
    categoryGroup: { gap: designTokens.spacing.sm },
    categoryGroupHeading: { minHeight: 35, flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm, paddingHorizontal: 4 },
    categoryEmoji: { fontSize: designTokens.typography.subtitle + 1 },
    categoryGroupTitle: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
    categoryOption: { minHeight: designTokens.dimensions.controlHeight.lg, borderWidth: 1, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    categoryOptionChild: { marginStart: 15 },
    categoryOptionContent: { flexDirection: "row", alignItems: "center", gap: designTokens.spacing.sm },
    categoryEmojiSmall: { fontSize: designTokens.typography.subtitle - 1 },
    categoryLabel: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold },
    categorySelected: { fontSize: designTokens.typography.subtitle + 1, fontWeight: designTokens.fontWeights.extrabold },
    message: { flex: 1, alignItems: "center", justifyContent: "center", padding: designTokens.spacing.xxl, gap: designTokens.spacing.lg },
    messageText: { fontSize: designTokens.typography.body - 1, textAlign: "center", lineHeight: 21 },
    retryButton: { minHeight: 45, borderRadius: designTokens.radius.sm, paddingHorizontal: designTokens.spacing.xl, justifyContent: "center" },
    retryText: { fontSize: designTokens.typography.caption + 1, fontWeight: designTokens.fontWeights.extrabold }
  });
}
