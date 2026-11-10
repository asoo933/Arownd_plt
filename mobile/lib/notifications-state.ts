import type { AppNotification } from "@/lib/notifications";

export function getNotificationDestination(item: AppNotification): string | null {
  if (item.type !== "order") return null;

  const notificationUrl = typeof item.data.url === "string" ? item.data.url : "";
  const merchantOrderId = notificationUrl.match(/^\/studio\/orders\/([^/?#]+)/)?.[1];
  if (merchantOrderId) {
    return "/merchant/orders/" + encodeURIComponent(merchantOrderId);
  }

  const orderId = item.data.order_id;
  if (typeof orderId === "string" && orderId.length > 0) {
    return "/orders/" + encodeURIComponent(orderId);
  }
  return null;
}
