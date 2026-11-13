import type { AppNotification } from "@/lib/notifications";

export function getNotificationDestination(item: AppNotification): string | null {
  if (item.type === "system" && item.data.kind === "support_reply") {
    const notificationUrl = typeof item.data.url === "string" ? item.data.url : "";
    return /^\/support\/[0-9a-f-]{36}$/i.test(notificationUrl) ? notificationUrl : null;
  }
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getPushNotificationDestination(data: Record<string, unknown>): string | null {
  const notificationUrl = typeof data.url === "string" ? data.url : "";
  const merchantOrderId = notificationUrl.match(/^\/studio\/orders\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i)?.[1];
  if (merchantOrderId) return "/merchant/orders/" + merchantOrderId;

  const supportConversationId = notificationUrl.match(/^\/support\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i)?.[1];
  if (supportConversationId) return "/support/" + supportConversationId;

  const orderId = data.order_id;
  if (typeof orderId === "string" && UUID_PATTERN.test(orderId)) {
    return "/orders/" + orderId;
  }
  return null;
}
