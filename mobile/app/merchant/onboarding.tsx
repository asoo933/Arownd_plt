import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchCheckoutWilayas, type Wilaya } from "@/lib/checkout";
import {
  createMerchantStore,
  fetchMerchantAccess,
  fetchMerchantCategories,
} from "@/lib/merchant";
import {
  merchantStoreErrorKey,
  merchantStoreSchema,
  type MerchantStoreFormValues
} from "@/lib/merchant-validation";
import { translate, type TranslationKey } from "@/lib/i18n";
import { useAppTheme, type AppTheme } from "@/lib/theme";

export default function MerchantOnboardingScreen() {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [wilayaPickerOpen, setWilayaPickerOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const access = useQuery({
    queryKey: ["merchant-access"],
    queryFn: fetchMerchantAccess,
    retry: false
  });

  const canStartOnboarding =
    access.data?.status === "personal" ||
    access.data?.status === "merchant_setup_required";

  const wilayas = useQuery({
    queryKey: ["merchant-wilayas"],
    queryFn: fetchCheckoutWilayas,
    enabled: canStartOnboarding,
    staleTime: Infinity
  });

  const categories = useQuery({
    queryKey: ["merchant-categories"],
    queryFn: fetchMerchantCategories,
    enabled: canStartOnboarding,
    staleTime: 5 * 60 * 1000
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<MerchantStoreFormValues>({
    resolver: zodResolver(merchantStoreSchema),
    defaultValues: {
      storeName: "",
      phone: "",
      whatsapp: "",
      wilayaId: null,
      commune: "",
      addressLine: "",
      open: "09:00",
      close: "18:00",
      category: "",
      subcategories: []
    }
  });

  const wilayaId = watch("wilayaId");
  const categoryId = watch("category");
  const selectedSubcategories = watch("subcategories");
  const selectedWilaya = wilayas.data?.find((item) => item.id === wilayaId);
  const mainCategories = (categories.data ?? []).filter((item) => item.parentId === null);
  const subcategories = (categories.data ?? []).filter((item) => item.parentId === categoryId);

  const submit = handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      await createMerchantStore(values);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["merchant-access"] }),
        queryClient.invalidateQueries({ queryKey: ["my-store"] }),
        queryClient.invalidateQueries({ queryKey: ["my-roles"] }),
        queryClient.invalidateQueries({ queryKey: ["my-account-type"] })
      ]);
      router.replace("/merchant");
    } catch (error) {
      setSubmitError(translate(merchantStoreErrorKey(error) as TranslationKey));
    }
  });

  if (access.isPending) {
    return <LoadingScreen theme={theme} label={translate("merchantLoading")} />;
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

  if (access.data === null) return <Redirect href="/login" />;
  if (access.data.status === "merchant_ready") return <Redirect href="/merchant" />;
  if (!canStartOnboarding) return <Redirect href="/merchant" />;

  if (wilayas.isPending || categories.isPending) {
    return <LoadingScreen theme={theme} label={translate("merchantOnboardingLoading")} />;
  }

  if (wilayas.isError || categories.isError) {
    return (
      <MessageScreen
        theme={theme}
        title={wilayas.isError ? translate("merchantWilayasError") : translate("merchantCategoriesError")}
        actionLabel={translate("merchantRetry")}
        onAction={() => {
          if (wilayas.isError) void wilayas.refetch();
          if (categories.isError) void categories.refetch();
        }}
      />
    );
  }

  const fieldError = (message: string | undefined): string | null =>
    message ? translate(message as TranslationKey) : null;

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
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={[styles.backText, { color: theme.colors.accentMuted }]}>
                {translate("merchantOnboardingBack")}
              </Text>
            </Pressable>
            <Text style={[styles.eyebrow, { color: theme.colors.accentMuted }]}>
              {translate("businessTitle")}
            </Text>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>
              {translate("merchantOnboardingTitle")}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              {translate("merchantOnboardingSubtitle")}
            </Text>
          </View>

          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
              {translate("merchantStoreDetailsTitle")}
            </Text>

            <Controller
              control={control}
              name="storeName"
              render={({ field, fieldState }) => (
                <FormField
                  theme={theme}
                  label={translate("merchantStoreNameLabel")}
                  error={fieldError(fieldState.error?.message)}
                >
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={translate("merchantStoreNamePlaceholder")}
                    placeholderTextColor={theme.colors.placeholder}
                    style={styles.input}
                    maxLength={100}
                    textAlign="right"
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field, fieldState }) => (
                <FormField
                  theme={theme}
                  label={translate("merchantStorePhoneLabel")}
                  error={fieldError(fieldState.error?.message)}
                >
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={translate("merchantStorePhonePlaceholder")}
                    placeholderTextColor={theme.colors.placeholder}
                    style={styles.input}
                    keyboardType="phone-pad"
                    maxLength={20}
                    textAlign="right"
                  />
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="whatsapp"
              render={({ field, fieldState }) => (
                <FormField
                  theme={theme}
                  label={translate("merchantStoreWhatsAppLabel")}
                  hint={translate("merchantStoreWhatsAppHint")}
                  error={fieldError(fieldState.error?.message)}
                >
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={translate("merchantStoreWhatsAppPlaceholder")}
                    placeholderTextColor={theme.colors.placeholder}
                    style={styles.input}
                    keyboardType="phone-pad"
                    maxLength={20}
                    textAlign="right"
                  />
                </FormField>
              )}
            />
          </View>

          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
              {translate("merchantStoreLocationTitle")}
            </Text>

            <Controller
              control={control}
              name="wilayaId"
              render={({ fieldState }) => (
                <FormField
                  theme={theme}
                  label={translate("merchantStoreWilayaLabel")}
                  error={fieldError(fieldState.error?.message)}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setWilayaPickerOpen(true)}
                    style={[styles.select, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}
                  >
                    <Text style={[styles.selectText, { color: selectedWilaya ? theme.colors.foreground : theme.colors.placeholder }]}>
                      {selectedWilaya
                        ? `${String(selectedWilaya.id).padStart(2, "0")} - ${selectedWilaya.name_ar}`
                        : translate("merchantStoreChooseWilaya")}
                    </Text>
                    <Text style={[styles.selectIcon, { color: theme.colors.muted }]}>⌄</Text>
                  </Pressable>
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="commune"
              render={({ field, fieldState }) => (
                <FormField
                  theme={theme}
                  label={translate("merchantStoreCommuneLabel")}
                  error={fieldError(fieldState.error?.message)}
                >
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={translate("merchantStoreCommunePlaceholder")}
                    placeholderTextColor={theme.colors.placeholder}
                    style={styles.input}
                    maxLength={80}
                    textAlign="right"
                  />
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="addressLine"
              render={({ field, fieldState }) => (
                <FormField
                  theme={theme}
                  label={translate("merchantStoreAddressLabel")}
                  error={fieldError(fieldState.error?.message)}
                >
                  <TextInput
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={translate("merchantStoreAddressPlaceholder")}
                    placeholderTextColor={theme.colors.placeholder}
                    style={[styles.input, styles.multiline]}
                    multiline
                    maxLength={300}
                    textAlign="right"
                    textAlignVertical="top"
                  />
                </FormField>
              )}
            />
            <Text style={[styles.hint, { color: theme.colors.muted }]}>
              {translate("merchantStoreLocationHint")}
            </Text>
          </View>

          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
              {translate("merchantStoreCategoryLabel")}
            </Text>
            <Text style={[styles.hint, { color: theme.colors.muted }]}>
              {translate("merchantStoreCategoryHint")}
            </Text>

            {mainCategories.length === 0 ? (
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                {translate("merchantNoCategories")}
              </Text>
            ) : (
              <View style={styles.categoryGrid}>
                {mainCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: categoryId === category.id }}
                    onPress={() => {
                      setValue("category", category.id, { shouldValidate: true });
                      setValue("subcategories", [], { shouldValidate: true });
                    }}
                    style={[
                      styles.categoryOption,
                      {
                        borderColor: categoryId === category.id ? theme.colors.accentMuted : theme.colors.border,
                        backgroundColor: categoryId === category.id ? theme.colors.successSurface : theme.colors.surfaceMuted
                      }
                    ]}
                  >
                    <Text style={[styles.categoryText, { color: theme.colors.foreground }]}>
                      {category.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {fieldError(errors.category?.message) ? (
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                {fieldError(errors.category?.message)}
              </Text>
            ) : null}

            {categoryId ? (
              <View style={styles.subcategoryGroup}>
                <Text style={[styles.fieldLabel, { color: theme.colors.muted }]}>
                  {translate("merchantStoreSubcategoriesLabel")}
                </Text>
                {subcategories.length === 0 ? (
                  <Text style={[styles.hint, { color: theme.colors.muted }]}>
                    {translate("merchantNoSubcategories")}
                  </Text>
                ) : (
                  <View style={styles.chipList}>
                    {subcategories.map((category) => {
                      const selected = selectedSubcategories.includes(category.id);
                      return (
                        <Pressable
                          key={category.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => {
                            const next = selected
                              ? selectedSubcategories.filter((id) => id !== category.id)
                              : [...selectedSubcategories, category.id];
                            setValue("subcategories", next, { shouldValidate: true });
                          }}
                          style={[
                            styles.chip,
                            {
                              borderColor: selected ? theme.colors.accentMuted : theme.colors.border,
                              backgroundColor: selected ? theme.colors.successSurface : theme.colors.surfaceMuted
                            }
                          ]}
                        >
                          <Text style={[styles.chipText, { color: theme.colors.foreground }]}>
                            {category.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                <Text style={[styles.hint, { color: theme.colors.muted }]}>
                  {translate("merchantStoreSubcategoriesHint")}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
              {translate("merchantStoreHoursTitle")}
            </Text>
            <View style={styles.hoursRow}>
              <Controller
                control={control}
                name="open"
                render={({ field, fieldState }) => (
                  <FormField
                    theme={theme}
                    label={translate("merchantStoreOpenLabel")}
                    error={fieldError(fieldState.error?.message)}
                    containerStyle={styles.halfField}
                  >
                    <TextInput
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      style={[styles.input, styles.timeInput]}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      textAlign="center"
                    />
                  </FormField>
                )}
              />
              <Controller
                control={control}
                name="close"
                render={({ field, fieldState }) => (
                  <FormField
                    theme={theme}
                    label={translate("merchantStoreCloseLabel")}
                    error={fieldError(fieldState.error?.message)}
                    containerStyle={styles.halfField}
                  >
                    <TextInput
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      style={[styles.input, styles.timeInput]}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                      textAlign="center"
                    />
                  </FormField>
                )}
              />
            </View>
            <Text style={[styles.hint, { color: theme.colors.muted }]}>
              {translate("merchantStoreHoursHint")}
            </Text>
          </View>

          {submitError ? (
            <View style={[styles.submitError, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerBorder }]}>
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>{submitError}</Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => void submit()}
            disabled={isSubmitting || mainCategories.length === 0}
            style={[
              styles.submitButton,
              { backgroundColor: theme.colors.accent },
              (isSubmitting || mainCategories.length === 0) && styles.disabled
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.colors.accentForeground} />
            ) : (
              <Text style={[styles.submitText, { color: theme.colors.accentForeground }]}>
                {translate("merchantStoreSubmit")}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={wilayaPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setWilayaPickerOpen(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalPanel, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                {translate("merchantStoreChooseWilaya")}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setWilayaPickerOpen(false)}
                style={styles.modalClose}
              >
                <Text style={[styles.backText, { color: theme.colors.accentMuted }]}>
                  {translate("merchantModalClose")}
                </Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {(wilayas.data ?? []).map((wilaya) => (
                <WilayaOption
                  key={wilaya.id}
                  wilaya={wilaya}
                  selected={wilaya.id === wilayaId}
                  theme={theme}
                  onPress={() => {
                    setValue("wilayaId", wilaya.id, { shouldValidate: true });
                    setWilayaPickerOpen(false);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function LoadingScreen({ theme, label }: { theme: AppTheme; label: string }) {
  return (
    <SafeAreaView style={[stylesForScreen.safe, { backgroundColor: theme.colors.background }]}>
      <View style={stylesForScreen.center}>
        <ActivityIndicator color={theme.colors.accentMuted} />
        <Text style={[stylesForScreen.message, { color: theme.colors.muted }]}>{label}</Text>
      </View>
    </SafeAreaView>
  );
}

function MessageScreen({
  theme,
  title,
  actionLabel,
  onAction
}: {
  theme: AppTheme;
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <SafeAreaView style={[stylesForScreen.safe, { backgroundColor: theme.colors.background }]}>
      <View style={stylesForScreen.center}>
        <Text style={[stylesForScreen.message, { color: theme.colors.foreground }]}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={[stylesForScreen.action, { backgroundColor: theme.colors.accent }]}
        >
          <Text style={[stylesForScreen.actionText, { color: theme.colors.accentForeground }]}>{actionLabel}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function FormField({
  theme,
  label,
  hint,
  error,
  containerStyle,
  children
}: {
  theme: AppTheme;
  label: string;
  hint?: string;
  error?: string | null;
  containerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <View style={[stylesForScreen.field, containerStyle]}>
      <Text style={[stylesForScreen.fieldLabel, { color: theme.colors.muted }]}>{label}</Text>
      {children}
      {hint ? <Text style={[stylesForScreen.hint, { color: theme.colors.muted }]}>{hint}</Text> : null}
      {error ? <Text style={[stylesForScreen.error, { color: theme.colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

function WilayaOption({
  wilaya,
  selected,
  theme,
  onPress
}: {
  wilaya: Wilaya;
  selected: boolean;
  theme: AppTheme;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[stylesForScreen.wilayaOption, { borderBottomColor: theme.colors.border }]}
    >
      <Text style={[stylesForScreen.wilayaText, { color: selected ? theme.colors.accentMuted : theme.colors.foreground }]}>
        {String(wilaya.id).padStart(2, "0")} - {wilaya.name_ar}
      </Text>
    </Pressable>
  );
}

const stylesForScreen = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 16 },
  message: { fontSize: 14, lineHeight: 22, textAlign: "center", fontWeight: "700" },
  action: { minHeight: 46, borderRadius: 14, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  actionText: { fontSize: 13, fontWeight: "900" },
  field: { gap: 7 },
  fieldLabel: { fontSize: 12, fontWeight: "800", textAlign: "right" },
  hint: { fontSize: 11, lineHeight: 17, textAlign: "right" },
  error: { fontSize: 11, lineHeight: 17, textAlign: "right", fontWeight: "700" },
  wilayaOption: { minHeight: 49, justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth },
  wilayaText: { fontSize: 14, fontWeight: "700", textAlign: "right" }
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1 },
    flex: { flex: 1 },
    content: { padding: 18, paddingBottom: 38, gap: 14 },
    header: { alignItems: "flex-end", gap: 8, marginBottom: 4 },
    backButton: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 4 },
    backText: { fontSize: 13, fontWeight: "800" },
    eyebrow: { fontSize: 11, fontWeight: "900" },
    title: { fontSize: 24, lineHeight: 32, fontWeight: "900", textAlign: "right" },
    subtitle: { fontSize: 13, lineHeight: 21, textAlign: "right" },
    section: { borderWidth: 1, borderRadius: 20, padding: 15, gap: 14 },
    sectionTitle: { fontSize: 15, fontWeight: "900", textAlign: "right" },
    input: {
      minHeight: 49,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 13,
      paddingHorizontal: 13,
      backgroundColor: theme.colors.surfaceMuted,
      color: theme.colors.foreground,
      fontSize: 14
    },
    multiline: { minHeight: 88, paddingTop: 12 },
    select: {
      minHeight: 49,
      borderWidth: 1,
      borderRadius: 13,
      paddingHorizontal: 13,
      flexDirection: "row-reverse",
      alignItems: "center",
      justifyContent: "space-between"
    },
    selectText: { flex: 1, textAlign: "right", fontSize: 13, fontWeight: "700" },
    selectIcon: { fontSize: 20, marginStart: 10 },
    categoryGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
    categoryOption: {
      width: "48%",
      minHeight: 54,
      borderWidth: 1,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 9,
      paddingVertical: 8
    },
    categoryText: { fontSize: 12, textAlign: "center", fontWeight: "800", lineHeight: 18 },
    subcategoryGroup: { gap: 9 },
    fieldLabel: { fontSize: 12, fontWeight: "800", textAlign: "right" },
    chipList: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
    chip: { minHeight: 39, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, justifyContent: "center" },
    chipText: { fontSize: 11, fontWeight: "700" },
    hint: { fontSize: 11, lineHeight: 17, textAlign: "right" },
    errorText: { fontSize: 12, lineHeight: 18, textAlign: "right", fontWeight: "800" },
    hoursRow: { flexDirection: "row-reverse", gap: 10 },
    halfField: { flex: 1 },
    timeInput: { minWidth: 0 },
    submitError: { borderWidth: 1, borderRadius: 14, padding: 12 },
    submitButton: { minHeight: 53, borderRadius: 15, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 4 },
    submitText: { fontSize: 14, fontWeight: "900" },
    disabled: { opacity: 0.5 },
    modalBackdrop: { flex: 1, justifyContent: "flex-end", paddingTop: 50 },
    modalPanel: { maxHeight: "78%", minHeight: "48%", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 17, gap: 12 },
    modalHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
    modalClose: { minHeight: 40, justifyContent: "center", paddingHorizontal: 4 }
  });
}
