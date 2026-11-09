import { describe, expect, it } from "vitest";

import {
  getNextMerchantOrderStatus,
  getNextMerchantTrackingStatus,
  groupMerchantOrderRows,
  type MerchantOrderRow
} from "@/lib/merchant-dashboard-state";

function row(overrides: Partial<MerchantOrderRow> = {}): MerchantOrderRow {
  return {
    id: "item-1",
    product_name: "قميص",
    quantity: 2,
    merchant_order: {
      id: "merchant-order-1",
      status: "pending",
      subtotal: 2400,
      shipping_fee: 0,
      quoted_at: null
    },
    order: {
      id: "order-1",
      status: "pending",
      full_name: "عميل",
      commune: "البليدة",
      delivery_type: "home",
      created_at: "2026-11-07T10:00:00.000Z",
      wilaya: { id: 9, name_ar: "البليدة" }
    },
    ...overrides
  };
}

describe("groupMerchantOrderRows", () => {
  it("groups multiple items under one merchant suborder", () => {
    const result = groupMerchantOrderRows([
      row(),
      row({
        id: "item-2",
        product_name: "حذاء",
        quantity: 1
      })
    ]);

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0]?.itemCount).toBe(2);
    expect(result.orders[0]?.totalQuantity).toBe(3);
    expect(result.orders[0]?.productNames).toEqual(["قميص", "حذاء"]);
  });

  it("ignores parent orders cancelled by the customer", () => {
    const result = groupMerchantOrderRows([
      row({
        order: {
          id: "order-cancelled",
          status: "cancelled",
          full_name: "عميل",
          commune: "البليدة",
          delivery_type: "home",
          created_at: "2026-11-07T10:00:00.000Z",
          wilaya: { id: 9, name_ar: "البليدة" }
        }
      })
    ]);

    expect(result.orders).toHaveLength(0);
    expect(result.pendingCount).toBe(0);
  });

  it("counts pending and quoted merchant orders once each", () => {
    const result = groupMerchantOrderRows([
      row(),
      row({ id: "item-2", product_name: "حذاء" }),
      row({
        id: "item-3",
        merchant_order: {
          id: "merchant-order-2",
          status: "quoted",
          subtotal: 3000,
          shipping_fee: 500,
          quoted_at: "2026-11-07T11:00:00.000Z"
        },
        order: {
          id: "order-2",
          status: "pending",
          full_name: "عميل آخر",
          commune: "الشفة",
          delivery_type: "home",
          created_at: "2026-11-07T11:00:00.000Z",
          wilaya: { id: 9, name_ar: "البليدة" }
        }
      })
    ]);

    expect(result.pendingCount).toBe(1);
    expect(result.quotedCount).toBe(1);
    expect(result.orders[0]?.id).toBe("merchant-order-2");
  });

  it("keeps the parent's total out of the merchant summary", () => {
    const result = groupMerchantOrderRows([row()]);
    expect(result.orders[0]).not.toHaveProperty("parentTotal");
    expect(result.orders[0]?.subtotal).toBe(2400);
  });
});

describe("getNextMerchantOrderStatus", () => {
  it("moves confirmed orders to shipped", () => {
    expect(getNextMerchantOrderStatus("confirmed", "home")).toBe("shipped");
    expect(getNextMerchantOrderStatus("confirmed", "desk")).toBe("shipped");
  });

  it("allows the store to complete desk pickup only", () => {
    expect(getNextMerchantOrderStatus("shipped", "desk")).toBe("delivered");
    expect(getNextMerchantOrderStatus("shipped", "home")).toBeNull();
  });

  it("does not offer transitions for terminal or unsupported states", () => {
    expect(getNextMerchantOrderStatus("delivered", "desk")).toBeNull();
    expect(getNextMerchantOrderStatus("cancelled", "home")).toBeNull();
    expect(getNextMerchantOrderStatus("pending", "desk")).toBeNull();
  });
});


describe("getNextMerchantTrackingStatus", () => {
  it("advances home delivery through preparation, dispatch and delivery", () => {
    expect(getNextMerchantTrackingStatus("confirmed", "home")).toBe("preparing");
    expect(getNextMerchantTrackingStatus("preparing", "home")).toBe("ready_for_dispatch");
    expect(getNextMerchantTrackingStatus("ready_for_dispatch", "home")).toBe("out_for_delivery");
    expect(getNextMerchantTrackingStatus("out_for_delivery", "home")).toBe("delivered");
  });

  it("allows desk pickup to complete after preparation", () => {
    expect(getNextMerchantTrackingStatus("confirmed", "desk")).toBe("preparing");
    expect(getNextMerchantTrackingStatus("preparing", "desk")).toBe("ready_for_dispatch");
    expect(getNextMerchantTrackingStatus("ready_for_dispatch", "desk")).toBe("delivered");
  });

  it("rejects unsupported and terminal transitions", () => {
    expect(getNextMerchantTrackingStatus("delivered", "home")).toBeNull();
    expect(getNextMerchantTrackingStatus("ready_for_dispatch", "unknown")).toBeNull();
    expect(getNextMerchantTrackingStatus("out_for_delivery", "desk")).toBeNull();
  });
});
