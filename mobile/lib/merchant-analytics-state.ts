import { z } from "zod";

export const MerchantAnalyticsSchema = z.object({
  orders_total: z.coerce.number().int().nonnegative(),
  delivered_orders: z.coerce.number().int().nonnegative(),
  active_orders: z.coerce.number().int().nonnegative(),
  cancelled_orders: z.coerce.number().int().nonnegative(),
  delivered_revenue: z.coerce.number().nonnegative(),
  average_delivered_order: z.coerce.number().nonnegative(),
  product_count: z.coerce.number().int().nonnegative(),
  low_stock_count: z.coerce.number().int().nonnegative(),
  out_of_stock_count: z.coerce.number().int().nonnegative(),
  store_rating: z.coerce.number().nullable(),
  daily_delivered: z.array(z.object({
    day: z.string(),
    amount: z.coerce.number().nonnegative()
  })).max(7)
});

export type MerchantAnalytics = z.infer<typeof MerchantAnalyticsSchema>;
