import { describe, expect, it } from "vitest";

import { checkoutRequestIdentity } from "@/lib/checkout-state";
import type { CartItem } from "@/lib/cart-state";

const item = (offerId: string, quantity: number, options: Record<string, string>): CartItem => ({
  offerId,
  quantity,
  options
});

describe("checkoutRequestIdentity", () => {
  it("normalizes option key order", () => {
    const first = checkoutRequestIdentity({
      items: [item("offer-1", 2, { size: "M", color: "black" })],
      deliveryType: "home",
      wilayaId: 16,
      commune: "  الجزائر الوسطى ",
      addressLine: "  شارع 1 ",
      fullName: " أحمد ",
      phone: " 0550000000 "
    });
    const second = checkoutRequestIdentity({
      items: [item("offer-1", 2, { color: "black", size: "M" })],
      deliveryType: "home",
      wilayaId: 16,
      commune: "الجزائر الوسطى",
      addressLine: "شارع 1",
      fullName: "أحمد",
      phone: "0550000000"
    });
    expect(first).toBe(second);
  });

  it("normalizes legacy localized option names before creating idempotency identity", () => {
    const base = {
      items: [item("offer-1", 1, { color: "Black", size: "M" })],
      deliveryType: "desk" as const,
      wilayaId: 9,
      commune: "البليدة",
      addressLine: "",
      fullName: "أحمد",
      phone: "0550000000"
    };
    expect(checkoutRequestIdentity(base)).toBe(checkoutRequestIdentity({
      ...base,
      items: [item("offer-1", 1, { "اللون": "Black", "المقاس": "M" })]
    }));
  });

  it("changes identity when delivery type or quantity changes", () => {
    const base = {
      items: [item("offer-1", 1, {})],
      deliveryType: "desk" as const,
      wilayaId: 9,
      commune: "البليدة",
      addressLine: "",
      fullName: "أحمد",
      phone: "0550000000"
    };
    expect(checkoutRequestIdentity(base)).not.toBe(checkoutRequestIdentity({ ...base, deliveryType: "home" }));
    expect(checkoutRequestIdentity(base)).not.toBe(checkoutRequestIdentity({ ...base, items: [item("offer-1", 2, {})] }));
  });
});
