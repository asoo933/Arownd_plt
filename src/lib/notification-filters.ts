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
