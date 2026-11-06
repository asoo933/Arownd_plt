import { describe, expect, it } from "vitest";
import { filterNotifications, groupNotificationsByDate } from "./notification-filters";

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

describe("groupNotificationsByDate", () => {
  it("groups by the local calendar day and keeps groups newest-first", () => {
    const now = new Date(2026, 10, 6, 12, 0, 0);
    const items = [
      { id: "today", created_at: new Date(2026, 10, 6, 8, 0, 0).toISOString() },
      { id: "yesterday", created_at: new Date(2026, 10, 5, 8, 0, 0).toISOString() },
      { id: "older", created_at: new Date(2026, 10, 4, 8, 0, 0).toISOString() },
    ];

    expect(groupNotificationsByDate(items, now).map((group) => [group.key, group.items[0]?.id])).toEqual([
      ["today", "today"],
      ["yesterday", "yesterday"],
      ["older", "older"],
    ]);
  });

  it("uses Algeria's calendar day consistently across device timezones", () => {
    const now = new Date("2026-11-06T00:30:00.000Z");
    const items = [
      { id: "algeria-today", created_at: "2026-11-05T23:30:00.000Z" },
      { id: "algeria-yesterday", created_at: "2026-11-05T22:30:00.000Z" },
    ];

    expect(
      groupNotificationsByDate(items, now, "Africa/Algiers").map((group) => [
        group.key,
        group.items.map((item) => item.id),
      ]),
    ).toEqual([
      ["today", ["algeria-today"]],
      ["yesterday", ["algeria-yesterday"]],
    ]);
  });

  it("places invalid timestamps in the older group", () => {
    const groups = groupNotificationsByDate(
      [{ id: "invalid", created_at: "not-a-date" }],
      new Date(2026, 10, 6, 12, 0, 0),
    );
    expect(groups).toEqual([{ key: "older", items: [{ id: "invalid", created_at: "not-a-date" }] }]);
  });
});
