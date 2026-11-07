import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { CustomerHeading, CustomerScreen, EmptyState, ErrorState, LoadingState, StoreTile } from "@/components/customer-ui";
import { fetchFeaturedStores } from "@/lib/catalog";
import { translate } from "@/lib/i18n";

export default function StoresScreen() {
  const stores = useQuery({ queryKey: ["customer-stores"], queryFn: fetchFeaturedStores, staleTime: 60_000 });
  return (
    <CustomerScreen>
      <Text onPress={() => router.back()} style={styles.back}>{translate("back")}</Text>
      <CustomerHeading title={translate("storesTitle")} subtitle={translate("storesSubtitle")} />
      {stores.isPending ? <LoadingState label={translate("stateLoading")} /> : stores.isError ? (
        <ErrorState title={translate("catalogLoadError")} retryLabel={translate("retry")} onRetry={() => void stores.refetch()} />
      ) : stores.data.length === 0 ? (
        <EmptyState title={translate("homeNoStores")} hint={translate("homeNoStoresHint")} />
      ) : (
        <View style={styles.list}>
          {stores.data.map((store) => (
            <StoreTile key={store.id} name={store.name} description={store.description} logoUrl={store.logo_url} commune={store.commune} rating={store.rating} onPress={() => router.push({ pathname: "/store/[storeId]", params: { storeId: store.id } })} />
          ))}
        </View>
      )}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  back: { color: "#647D13", fontWeight: "800", fontSize: 13, minHeight: 38, textAlignVertical: "center" },
  list: { gap: 10 }
});
