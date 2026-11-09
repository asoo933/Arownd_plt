import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState, StoreTile } from "@/components/customer-ui";
import { AppHeader, Icon, IconButton, PressableSurface, Text as UiText } from "@/components/ui";
import { fetchStoreDetails, fetchStoreOffers, fetchVerifiedStoresByWilaya } from "@/lib/catalog";
import { fetchCheckoutWilayas, type Wilaya } from "@/lib/checkout";
import { translate, useLanguage } from "@/lib/i18n";
import { getLocalizedWilayaLabel } from "@/lib/locale-data";
import { designTokens, useAppTheme } from "@/lib/theme";

export default function StoresScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const [selectedWilayaId, setSelectedWilayaId] = useState<number | null>(null);
  const wilayas = useQuery({
    queryKey: ["customer-wilayas"],
    queryFn: fetchCheckoutWilayas,
    staleTime: 30 * 60_000
  });
  const stores = useQuery({
    queryKey: ["customer-stores-by-wilaya", selectedWilayaId],
    queryFn: () => fetchVerifiedStoresByWilaya(selectedWilayaId as number),
    enabled: selectedWilayaId !== null,
    staleTime: 60_000
  });

  const selectedWilaya = wilayas.data?.find((wilaya) => wilaya.id === selectedWilayaId) ?? null;
  const selectedWilayaLabel = selectedWilaya
    ? getLocalizedWilayaLabel(selectedWilaya.id, selectedWilaya.name_ar, language, selectedWilaya.name_fr)
    : null;
  const title = selectedWilayaLabel
    ? `${translate("storesInWilaya")} ${selectedWilayaLabel}`
    : translate("storesTitle");

  const handleBack = () => {
    if (selectedWilayaId !== null) {
      setSelectedWilayaId(null);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  };

  return (
    <CustomerScreen>
      <AppHeader
        title={title}
        leading={<IconButton accessibilityLabel={translate("back")} onPress={handleBack} icon={<Icon name="chevron-right" color={theme.colors.foreground} size={20} />} /> }
      />
      {selectedWilayaId === null ? (
        <>
          <UiText tone="muted" style={styles.subtitle}>{translate("storesChooseWilayaHint")}</UiText>
          {wilayas.isPending ? <LoadingState label={translate("stateLoading")} /> : wilayas.isError ? (
            <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} busy={wilayas.isFetching} onRetry={() => void wilayas.refetch()} />
          ) : wilayas.data.length === 0 ? (
            <EmptyState icon="map-pin" title={translate("storesNoWilayas")} />
          ) : (
            <View style={styles.list}>
              {wilayas.data.map((wilaya: Wilaya) => (
                <PressableSurface
                  key={wilaya.id}
                  accessibilityRole="button"
                  accessibilityLabel={getLocalizedWilayaLabel(wilaya.id, wilaya.name_ar, language, wilaya.name_fr)}
                  onPress={() => setSelectedWilayaId(wilaya.id)}
                  style={[styles.wilayaRow, { backgroundColor: theme.mode === "light" ? theme.colors.surfaceSecondary : theme.colors.surface, borderColor: theme.colors.border, borderWidth: theme.mode === "light" ? 0 : 1 }]}
                >
                  <View style={styles.wilayaNumber}>
                    <UiText weight="700" style={{ color: theme.colors.accentMuted }}>{String(wilaya.id).padStart(2, "0")}</UiText>
                  </View>
                  <UiText weight="600" style={styles.wilayaName}>
                    {getLocalizedWilayaLabel(wilaya.id, wilaya.name_ar, language, wilaya.name_fr)}
                  </UiText>
                  <Icon name="chevron-left" size={18} color={theme.colors.muted} accessibilityHidden />
                </PressableSurface>
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          <UiText tone="muted" style={styles.subtitle}>{translate("storesInWilayaHint")}</UiText>
          {stores.isPending ? <LoadingState label={translate("stateLoading")} /> : stores.isError ? (
            <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} busy={stores.isFetching} onRetry={() => void stores.refetch()} />
          ) : stores.data.length === 0 ? (
            <EmptyState icon="store" title={translate("storesNoWilayaStores")} hint={translate("homeNoStoresHint")} />
          ) : (
            <View style={styles.list}>
              {stores.data.map((store) => (
                <StoreTile
                  key={store.id}
                  name={store.name}
                  description={store.description}
                  logoUrl={store.logo_url}
                  commune={store.commune}
                  rating={store.rating}
                  verified={store.is_verified}
                  onPress={() => {
                    void queryClient.prefetchQuery({ queryKey: ["customer-store", store.id], queryFn: () => fetchStoreDetails(store.id), staleTime: 60_000 });
                    void queryClient.prefetchQuery({ queryKey: ["customer-store-offers", store.id], queryFn: () => fetchStoreOffers(store.id), staleTime: 30_000 });
                    router.push({ pathname: "/store/[storeId]", params: { storeId: store.id } });
                  }}
                />
              ))}
            </View>
          )}
        </>
      )}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: designTokens.typography.caption + 1 },
  list: { gap: designTokens.spacing.md },
  wilayaRow: {
    minHeight: designTokens.dimensions.controlHeight.lg,
    borderWidth: 1,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: designTokens.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.spacing.md
  },
  wilayaNumber: {
    width: 38,
    height: 38,
    borderRadius: designTokens.radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  wilayaName: { flex: 1 }
});
