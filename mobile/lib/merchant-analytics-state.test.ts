import { describe, expect, it } from "vitest";
import { MerchantAnalyticsSchema } from "@/lib/merchant-analytics-state";

describe("MerchantAnalyticsSchema", () => {
  it("accepts server aggregates", () => {
    expect(MerchantAnalyticsSchema.safeParse({
      orders_total: 12,
      delivered_orders: 7,
      active_orders: 3,
      cancelled_orders: 2,
      delivered_revenue: 18000,
      average_delivered_order: 2571,
      product_count: 9,
      low_stock_count: 2,
      out_of_stock_count: 1,
      store_rating: "4.7",
      daily_delivered: [{ day: "2026-11-08", amount: 3000 }]
    }).success).toBe(true);
  });

  it("rejects negative aggregates", () => {
    expect(MerchantAnalyticsSchema.safeParse({
      orders_total: -1,
      delivered_orders: 0,
      active_orders: 0,
      cancelled_orders: 0,
      delivered_revenue: 0,
      average_delivered_order: 0,
      product_count: 0,
      low_stock_count: 0,
      out_of_stock_count: 0,
      store_rating: null,
      daily_delivered: []
    }).success).toBe(false);
  });
});
