import type { QueryClient } from "@tanstack/react-query";

import {
  fetchProductDetails,
  fetchProductOffers,
  fetchStoreDetails,
  fetchStoreOffers
} from "@/lib/catalog";
import { fetchApprovedReviews } from "@/lib/reviews";

export function prefetchCustomerProduct(queryClient: QueryClient, productId: string): void {
  if (!productId) return;

  void Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["customer-product", productId],
      queryFn: () => fetchProductDetails(productId)
    }),
    queryClient.prefetchQuery({
      queryKey: ["customer-product-offers", productId],
      queryFn: () => fetchProductOffers(productId)
    }),
    queryClient.prefetchQuery({
      queryKey: ["approved-reviews", "product", productId],
      queryFn: () => fetchApprovedReviews("product", productId)
    })
  ]);
}

export function prefetchCustomerStore(queryClient: QueryClient, storeId: string): void {
  if (!storeId) return;

  void Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["customer-store", storeId],
      queryFn: () => fetchStoreDetails(storeId)
    }),
    queryClient.prefetchQuery({
      queryKey: ["customer-store-offers", storeId],
      queryFn: () => fetchStoreOffers(storeId)
    })
  ]);
}
