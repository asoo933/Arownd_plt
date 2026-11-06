export type NotificationFilter = "all" | "unread" | "orders" | "offers";

export type NotificationFilterItem = {
  type: string;
  read: boolean;
};

/** Filter the already-fetched notification page without mutating its source. */
export function filterNotifications<T extends NotificationFilterItem>(
  notifications: readonly T[],
  filter: NotificationFilter,
): T[] {
  switch (filter) {
    case "unread":
      return notifications.filter((notification) => !notification.read);
    case "orders":
      return notifications.filter(
        (notification) => notification.type === "order" || notification.type === "reservation",
      );
    case "offers":
      return notifications.filter((notification) => notification.type === "offer");
    case "all":
      return [...notifications];
  }
}

export type NotificationDateGroup = "today" | "yesterday" | "older";

export type GroupedNotifications<T> = {
  key: NotificationDateGroup;
  items: T[];
};

/**
 * Group notifications by a fixed market timezone so SSR and browser hydration
 * classify the same timestamp identically, regardless of the device timezone.
 */
export function groupNotificationsByDate<T extends { created_at: string }>(
  notifications: readonly T[],
  now: Date = new Date(),
  timeZone = "Africa/Algiers",
): GroupedNotifications<T>[] {
  const calendarDay = (date: Date): number => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(parts.find((part) => part.type === type)?.value ?? 0);
    return Date.UTC(value("year"), value("month") - 1, value("day"));
  };

  const today = calendarDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;
  const groups: Record<NotificationDateGroup, T[]> = {
    today: [],
    yesterday: [],
    older: [],
  };

  for (const notification of notifications) {
    const timestamp = Date.parse(notification.created_at);
    const day = Number.isFinite(timestamp) ? calendarDay(new Date(timestamp)) : Number.NaN;
    const key: NotificationDateGroup =
      day === today ? "today" : day === yesterday ? "yesterday" : "older";
    groups[key].push(notification);
  }

  return (["today", "yesterday", "older"] as const)
    .filter((key) => groups[key].length > 0)
    .map((key) => ({ key, items: groups[key] }));
}
