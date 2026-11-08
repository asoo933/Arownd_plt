import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import { Redirect, router } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { translate } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";
import { AppHeader, Button, PressableSurface, Text as UiText, TextField } from "@/components/ui";

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

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <FormField label={translate("merchantProductNameLabel")} theme={theme}>
              <TextField
                value={form.name}
                onChangeText={(value) => update("name", value)}
                placeholder={translate("merchantProductNamePlaceholder")}
                placeholderTextColor={theme.colors.placeholder}
                maxLength={120}
                textAlign="right"
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
                onPress={() => setCategoryPickerOpen(true)}
                style={[styles.selectButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
              >
                <UiText style={[styles.selectText, { color: selectedCategory ? theme.colors.foreground : theme.colors.placeholder }]}>
                  {selectedCategory
                    ? `${selectedCategory.emoji} ${selectedCategory.label}`
                    : translate("merchantProductCategoryPlaceholder")}
                </UiText>
              </PressableSurface>
            </FormField>

            <FormField label={translate("merchantProductBrandLabel")} theme={theme}>
              <TextField
                value={form.brand}
                onChangeText={(value) => update("brand", value)}
                placeholder={translate("merchantProductBrandPlaceholder")}
                placeholderTextColor={theme.colors.placeholder}
                maxLength={80}
                textAlign="right"
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
                placeholder={translate("merchantProductSizesPlaceholder")}
                placeholderTextColor={theme.colors.placeholder}
                maxLength={850}
                textAlign="right"
                style={styles.input}
              />
            </FormField>

            <FormField label={translate("merchantProductColorsLabel")} theme={theme}>
              <TextField
                value={form.colors}
                onChangeText={(value) => update("colors", value)}
                placeholder={translate("merchantProductColorsPlaceholder")}
                placeholderTextColor={theme.colors.placeholder}
                maxLength={850}
                textAlign="right"
                style={styles.input}
              />
            </FormField>

            <FormField label={translate("merchantProductDescriptionLabel")} theme={theme}>
              <TextField
                value={form.description}
                onChangeText={(value) => update("description", value)}
                placeholder={translate("merchantProductDescriptionPlaceholder")}
                placeholderTextColor={theme.colors.placeholder}
                maxLength={3000}
                multiline
                numberOfLines={5}
                textAlign="right"
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
                disabled={imagePickerBusy || submitting || selectedImages.length >= PRODUCT_IMAGE_MAX_COUNT}
                onPress={() => void pickProductImages()}
                style={[styles.imagePickerButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, opacity: imagePickerBusy ? 0.6 : 1 }]}
              >
                {imagePickerBusy ? (
                  <ActivityIndicator color={theme.colors.accentMuted} />
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
                      <Image source={{ uri: asset.uri }} style={styles.imagePreview} />
                      <PressableSurface
                        accessibilityRole="button"
                        accessibilityLabel={translate("merchantProductImageRemove")}
                        onPress={() => removeProductImage(asset.uri)}
                        style={[styles.imageRemove, { backgroundColor: theme.colors.danger }]}
                        hitSlop={8}
                      >
                        <UiText style={styles.imageRemoveText}>×</UiText>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={categoryPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryPickerOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <UiText style={[styles.modalTitle, { color: theme.colors.foreground }]}>
                {translate("merchantProductChooseCategory")}
              </UiText>
              <PressableSurface onPress={() => setCategoryPickerOpen(false)} hitSlop={10}>
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
                          {group.parent.label}
                        </UiText>
                      </View>
                      {group.children.map((category) => (
                        <CategoryOption
                          key={category.id}
                          category={category}
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
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CategoryOption({
  category,
  nested = false,
  selected,
  theme,
  onSelect
}: {
  category: MerchantCategory;
  nested?: boolean;
  selected: boolean;
  theme: AppTheme;
  onSelect: () => void;
}) {
  const styles = createStyles(theme);

  return (
    <PressableSurface
      accessibilityRole="button"
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
          {category.label}
        </UiText>
      </View>
      {selected ? (
        <UiText style={[styles.categorySelected, { color: theme.colors.accentMuted }]}>✓</UiText>
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
        {loading ? <ActivityIndicator color={theme.colors.accentMuted} /> : null}
        <UiText style={[styles.messageText, { color: theme.colors.foreground }]}>{label}</UiText>
        {actionLabel && onAction ? (
          <Button label={actionLabel} onPress={onAction} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    flex: { flex: 1 },
    content: { padding: 16, paddingBottom: 34, gap: 15 },
    backButton: { minHeight: 42, alignSelf: "flex-start", justifyContent: "center" },
    backText: { fontSize: 12, fontWeight: "800" },
    header: { alignItems: "flex-end", gap: 6 },
    eyebrow: { fontSize: 10, fontWeight: "900" },
    title: { width: "100%", fontSize: 25, lineHeight: 33, fontWeight: "900", textAlign: "right" },
    subtitle: { width: "100%", fontSize: 12, lineHeight: 20, textAlign: "right" },
    card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 15 },
    row: { flexDirection: "row-reverse", gap: 10 },
    half: { flex: 1 },
    field: { gap: 6 },
    label: { fontSize: 11, fontWeight: "900", textAlign: "right" },
    input: { minHeight: 47, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: theme.colors.background, paddingHorizontal: 12, color: theme.colors.foreground, fontSize: 13, textAlign: "right" },
    textarea: { minHeight: 112, paddingTop: 12 },
    hint: { fontSize: 10, lineHeight: 15, textAlign: "right" },
    selectButton: { minHeight: 47, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, justifyContent: "center" },
    selectText: { fontSize: 12, textAlign: "right", fontWeight: "700" },
    note: { borderRadius: 12, padding: 12, gap: 6 },
    imagePickerButton: { minHeight: 48, borderWidth: 1, borderStyle: "dashed", borderRadius: 12, alignItems: "center", justifyContent: "center" },
    imagePickerText: { fontSize: 12, fontWeight: "900" },
    imageGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 9 },
    imageItem: { width: 88, height: 88, borderRadius: 12, overflow: "visible" },
    imagePreview: { width: 88, height: 88, borderRadius: 12, backgroundColor: theme.colors.surfaceMuted },
    imageRemove: { position: "absolute", top: -7, right: -7, width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    imageRemoveText: { color: "#FFFFFF", fontSize: 19, lineHeight: 22, fontWeight: "900" },
    noteText: { fontSize: 10, lineHeight: 16, textAlign: "right" },
    errorBox: { borderWidth: 1, borderRadius: 12, padding: 11 },
    errorText: { fontSize: 11, lineHeight: 17, textAlign: "right", fontWeight: "700" },
    submitButton: { minHeight: 49, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 2 },
    submitText: { fontSize: 13, fontWeight: "900" },
    modalOverlay: { flex: 1, justifyContent: "flex-end", padding: 10 },
    modalCard: { maxHeight: "78%", borderRadius: 20, padding: 15, gap: 12 },
    modalHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
    modalTitle: { fontSize: 15, fontWeight: "900" },
    modalClose: { fontSize: 11, fontWeight: "800" },
    categoryList: { gap: 13, paddingBottom: 8 },
    categoryGroup: { gap: 7 },
    categoryGroupHeading: { minHeight: 35, flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingHorizontal: 4 },
    categoryEmoji: { fontSize: 17 },
    categoryGroupTitle: { fontSize: 12, fontWeight: "900" },
    categoryOption: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
    categoryOptionChild: { marginStart: 15 },
    categoryOptionContent: { flexDirection: "row-reverse", alignItems: "center", gap: 9 },
    categoryEmojiSmall: { fontSize: 15 },
    categoryLabel: { fontSize: 12, fontWeight: "800" },
    categorySelected: { fontSize: 17, fontWeight: "900" },
    message: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
    messageText: { fontSize: 13, textAlign: "center", lineHeight: 21 },
    retryButton: { minHeight: 45, borderRadius: 12, paddingHorizontal: 20, justifyContent: "center" },
    retryText: { fontSize: 12, fontWeight: "900" }
  });
}
