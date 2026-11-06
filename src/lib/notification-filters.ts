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

/** Group notifications by the user's local calendar day, preserving newest-first order. */
export function groupNotificationsByDate<T extends { created_at: string }>(
  notifications: readonly T[],
  now: Date = new Date(),
): GroupedNotifications<T>[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  const groups: Record<NotificationDateGroup, T[]> = {
    today: [],
    yesterday: [],
    older: [],
  };

  for (const notification of notifications) {
    const timestamp = Date.parse(notification.created_at);
    const date = Number.isFinite(timestamp) ? new Date(timestamp) : null;
    const day = date
      ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
      : Number.NaN;
    const key: NotificationDateGroup =
      day === today ? "today" : day === yesterday ? "yesterday" : "older";
    groups[key].push(notification);
  }

  return (["today", "yesterday", "older"] as const)
    .filter((key) => groups[key].length > 0)
    .map((key) => ({ key, items: groups[key] }));
}
