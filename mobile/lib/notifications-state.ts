import type { AppNotification } from "@/lib/notifications";

export function getNotificationDestination(item: AppNotification): string | null {
  const orderId = item.data.order_id;
  if (item.type === "order" && typeof orderId === "string" && orderId.length > 0) {
    return "/orders/" + encodeURIComponent(orderId);
  }
  return null;
}