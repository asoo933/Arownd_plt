export type TimestampedActivity = {
  created_at: string;
};

/**
 * Returns the newest activity entries without mutating the query cache array.
 * Invalid timestamps are kept at the end in their original relative order.
 */
export function getRecentActivity<T extends TimestampedActivity>(
  items: readonly T[],
  limit = 3,
): T[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;

  return items
    .map((item, index) => ({
      item,
      index,
      timestamp: Date.parse(item.created_at),
    }))
    .sort((left, right) => {
      const leftTime = Number.isFinite(left.timestamp) ? left.timestamp : Number.NEGATIVE_INFINITY;
      const rightTime = Number.isFinite(right.timestamp) ? right.timestamp : Number.NEGATIVE_INFINITY;
      return rightTime - leftTime || left.index - right.index;
    })
    .slice(0, safeLimit)
    .map(({ item }) => item);
}
