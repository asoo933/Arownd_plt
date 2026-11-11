import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { CustomerScreen, EmptyState, ErrorState, LoadingState, StoreTile } from "@/components/customer-ui";
import { AppHeader, Icon, IconButton, PressableSurface, Text as UiText } from "@/components/ui";
import { fetchStoreDetails, fetchStoreOffers, fetchVerifiedStoresByRegion } from "@/lib/catalog";
import { fetchCountryRegions, getRegionDisplayName } from "@/lib/country-regions";
import { fetchMyBrowsingCountryCode } from "@/lib/country-service";
import { translate, useLanguage } from "@/lib/i18n";

import { designTokens, useAppTheme } from "@/lib/theme";

export default function StoresScreen() {
  const { language } = useLanguage();
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const browsingCountry = useQuery({ queryKey: ["browsing-country"], queryFn: fetchMyBrowsingCountryCode });
  const regions = useQuery({ queryKey: ["customer-market-regions", browsingCountry.data], queryFn: () => fetchCountryRegions(browsingCountry.data as string), enabled: Boolean(browsingCountry.data), staleTime: 30 * 60_000 });
  const stores = useQuery({
    queryKey: ["customer-stores-by-region", browsingCountry.data, selectedRegionId],
    queryFn: () => fetchVerifiedStoresByRegion(browsingCountry.data as string, selectedRegionId as number),
    enabled: Boolean(browsingCountry.data) && selectedRegionId !== null,
    staleTime: 60_000
  });

  const selectedRegion = regions.data?.regions.find((region) => region.id === selectedRegionId) ?? null;
  const selectedRegionLabel = selectedRegion ? getRegionDisplayName(selectedRegion, language) : null;
  const title = selectedRegionLabel ? `${translate("storesInWilaya")} ${selectedRegionLabel}` : translate("storesTitle");

  const handleBack = () => {
    if (selectedRegionId !== null) {
      setSelectedRegionId(null);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  };

  return (
    <CustomerScreen
      refreshing={selectedRegionId === null ? regions.isFetching || browsingCountry.isFetching : stores.isFetching}
      onRefresh={() => { void (selectedRegionId === null ? regions.refetch() : stores.refetch()); }}
    >
      <AppHeader
        title={title}
        leading={<IconButton accessibilityLabel={translate("back")} onPress={handleBack} icon={<Icon name="chevron-right" color={theme.colors.foreground} size={20} />} /> }
      />
      {selectedRegionId === null ? (
        <>
          <UiText tone="muted" style={styles.subtitle}>{translate("storesChooseWilayaHint")}</UiText>
          {regions.isPending || browsingCountry.isPending ? <LoadingState label={translate("stateLoading")} /> : regions.isError || browsingCountry.isError ? (
            <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} busy={regions.isFetching || browsingCountry.isFetching} onRetry={() => { void regions.refetch(); void browsingCountry.refetch(); }} />
          ) : (regions.data?.regions.length ?? 0) === 0 ? (
            <EmptyState icon="map-pin" title={translate("storesNoWilayas")} />
          ) : (
            <View style={styles.list}>
              {(regions.data?.regions ?? []).map((region) => (
                <PressableSurface
                  key={region.id}
                  accessibilityRole="button"
                  accessibilityLabel={getRegionDisplayName(region, language)}
                  onPress={() => setSelectedRegionId(region.id)}
                  style={[styles.wilayaRow, { backgroundColor: theme.mode === "light" ? theme.colors.surfaceSecondary : theme.colors.surface, borderColor: theme.colors.border, borderWidth: theme.mode === "light" ? 0 : 1 }]}
                >
                  <View style={styles.wilayaNumber}>
                    <UiText weight="700" style={{ color: theme.colors.accentMuted }}>{region.code}</UiText>
                  </View>
                  <UiText weight="600" style={styles.wilayaName}>
                    {getRegionDisplayName(region, language)}
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
            <EmptyState icon="store" title={translate("storesNoWilayaStores")} hint={translate("storesNoWilayaStoresHint")} />
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
