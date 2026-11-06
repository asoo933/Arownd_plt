import { describe, expect, it } from "vitest";
import { ORDER_DETAIL_SELECT } from "@/lib/order-query";

describe("ORDER_DETAIL_SELECT", () => {
  it("includes the merchant store relation needed for pickup details", () => {
    expect(ORDER_DETAIL_SELECT).toContain(
      "store:stores!merchant_orders_store_id_fkey(name, address_line, commune)",
    );
  });

  it("keeps the order items and wilaya relations", () => {
    expect(ORDER_DETAIL_SELECT).toContain(
      "items:order_items(*, store:stores(id, name, phone, whatsapp))",
    );
    expect(ORDER_DETAIL_SELECT).toContain("wilaya:wilayas(name_ar)");
  });
});
