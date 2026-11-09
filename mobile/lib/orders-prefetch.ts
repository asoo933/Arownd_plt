import type { QueryClient } from "@tanstack/react-query";

import { fetchCustomerOrderDetails } from "@/lib/orders";

export function prefetchCustomerOrderDetails(queryClient: QueryClient, orderId: string): void {
  if (!orderId) return;
  void queryClient.prefetchQuery({
    queryKey: ["customer-order-details", orderId],
    queryFn: () => fetchCustomerOrderDetails(orderId)
  });
}
