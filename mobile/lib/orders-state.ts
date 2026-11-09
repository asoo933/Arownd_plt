export function canCancelMerchantOrder(status: string, quotedAt: string | null | undefined): boolean {
  return status === "pending" && !quotedAt;
}

export function canCancelLegacyOrder(
  status: string,
  hasMerchantOrders: boolean,
  shipmentStatuses: string[] = []
): boolean {
  return !hasMerchantOrders
    && status === "pending"
    && shipmentStatuses.every((shipmentStatus) => shipmentStatus === "pending");
}

export function getOrderTrackingSteps(status: string): number {
  switch (status) {
    case "pending": return 0;
    case "quoted": return 0;
    case "confirmed": return 1;
    case "shipped": return 2;
    case "delivered": return 3;
    default: return -1;
  }
}

export function getOrderStatusTone(status: string): "pending" | "success" | "danger" | "muted" {
  if (status === "delivered") return "success";
  if (status === "cancelled" || status === "rejected" || status === "failed" || status === "returned") return "danger";
  if (status === "pending" || status === "quoted") return "pending";
  return "muted";
}

export function formatOrderCode(orderId: string): string {
  return orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
}
