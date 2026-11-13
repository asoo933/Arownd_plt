import { describe, expect, it } from "vitest";
import { countUnreadNotifications, type AppNotification } from "@/lib/notifications";
import { getNotificationDestination, getPushNotificationDestination } from "@/lib/notifications-state";

const makeNotification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: "00000000-0000-4000-8000-000000000001", type: "info", title: "تنبيه", body: null,
  data: {}, read: false, created_at: "2026-11-08T10:00:00.000Z", ...overrides
});

describe("notification helpers", () => {
  it("counts only unread notifications", () => {
    expect(countUnreadNotifications([makeNotification(), makeNotification({
      id: "00000000-0000-4000-8000-000000000002", read: true
    }), makeNotification({ id: "00000000-0000-4000-8000-000000000003" })])).toBe(2);
  });
  it("routes order notifications only with a string order id", () => {
    expect(getNotificationDestination(makeNotification({ type: "order", data: { order_id: "order-123" } }))).toBe("/orders/order-123");
    expect(getNotificationDestination(makeNotification({ type: "order" }))).toBeNull();
    expect(getNotificationDestination(makeNotification({ type: "order", data: { order_id: 123 } }))).toBeNull();
  });
  it("accepts only known UUID-based routes from push payloads", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(getPushNotificationDestination({ url: `/studio/orders/${id}` })).toBe(`/merchant/orders/${id}`);
    expect(getPushNotificationDestination({ url: `/support/${id}` })).toBe(`/support/${id}`);
    expect(getPushNotificationDestination({ order_id: id })).toBe(`/orders/${id}`);
    expect(getPushNotificationDestination({ url: "/settings" })).toBeNull();
    expect(getPushNotificationDestination({ url: "//example.com" })).toBeNull();
    expect(getPushNotificationDestination({ url: `/studio/orders/${id}?next=/settings` })).toBeNull();
    expect(getPushNotificationDestination({ order_id: "../../settings" })).toBeNull();
  });
  it("ignores arbitrary routes in notification payloads", () => {
    expect(getNotificationDestination(makeNotification({ data: { route: "https://example.com" } }))).toBeNull();
  });
});