import type { QueryClient } from "@tanstack/react-query";

import {
  fetchMerchantCategories,
  fetchMerchantOrderDetails
} from "@/lib/merchant";
import { fetchMerchantAnalytics } from "@/lib/merchant-analytics";
import { fetchMerchantProductOffer, fetchMerchantProducts } from "@/lib/merchant-products";

export function prefetchMerchantProducts(queryClient: QueryClient, storeId: string): void {
  if (!storeId) return;
  void queryClient.prefetchQuery({
    queryKey: ["merchant-products", storeId],
    queryFn: () => fetchMerchantProducts(storeId)
  });
}

export function prefetchMerchantAnalytics(queryClient: QueryClient, storeId: string): void {
  if (!storeId) return;
  void queryClient.prefetchQuery({
    queryKey: ["merchant-analytics", storeId],
    queryFn: () => fetchMerchantAnalytics(storeId)
  });
}

export function prefetchMerchantOrder(
  queryClient: QueryClient,
  storeId: string,
  merchantOrderId: string
): void {
  if (!storeId || !merchantOrderId) return;
  void queryClient.prefetchQuery({
    queryKey: ["merchant-order-detail", storeId, merchantOrderId],
    queryFn: () => fetchMerchantOrderDetails(merchantOrderId, storeId)
  });
}

export function prefetchMerchantProduct(
  queryClient: QueryClient,
  storeId: string,
  offerId: string
): void {
  if (!storeId || !offerId) return;
  void Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["merchant-product", storeId, offerId],
      queryFn: () => fetchMerchantProductOffer(storeId, offerId)
    }),
    queryClient.prefetchQuery({
      queryKey: ["merchant-categories"],
      queryFn: fetchMerchantCategories
    })
  ]);
}
