import { describe, expect, it } from "vitest";
import { filterNotifications } from "./notification-filters";

const notifications = [
  { id: "order-unread", type: "order", read: false },
  { id: "order-read", type: "order", read: true },
  { id: "reservation", type: "reservation", read: false },
  { id: "offer", type: "offer", read: false },
  { id: "system", type: "system", read: true },
];

describe("filterNotifications", () => {
  it("returns all notifications without mutating the source", () => {
    expect(filterNotifications(notifications, "all")).toEqual(notifications);
    expect(notifications).toHaveLength(5);
  });

  it("returns only unread notifications", () => {
    expect(filterNotifications(notifications, "unread").map((item) => item.id)).toEqual([
      "order-unread",
      "reservation",
      "offer",
    ]);
  });

  it("groups orders and reservations in the orders filter", () => {
    expect(filterNotifications(notifications, "orders").map((item) => item.id)).toEqual([
      "order-unread",
      "order-read",
      "reservation",
    ]);
  });

  it("returns only offers in the offers filter", () => {
    expect(filterNotifications(notifications, "offers").map((item) => item.id)).toEqual(["offer"]);
  });
});
